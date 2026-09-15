// ===== ISIDA (Нано-дуга «Изида») =====
// Опорная башня с вампиризмом (прототип Tanki Online): автозахват одиночной
// цели в конусе 20° на 17 м. По врагу — тикающий урон + возврат части урона
// стрелку (вампиризм); по союзнику в командных режимах — непрерывный ремонт
// корпуса с очками поддержки. Энергобаллон: расход зависит от режима
// (атака 30 / ремонт 18 / холостой 12 у.е./с), перезарядка 24 у.е./с.
// Архитектурно — гибрид FlamethrowerWeapon (энергия FSM + тики по расписанию)
// и GaussWeapon (конусный автозахват с LOS + sticky-цель + railGlow-анимация).
// FX: NanoBeamFx (двойная нано-дуга на шейдере рельсы) + NanoFlowPool
// (направленный поток нанороботов: к цели при ремонте, обратно при вампиризме).
import * as THREE from 'three';
import { WEAPON_TUNING } from '../../core/catalog';
import type {
  BeamMode,
  CombatPeer,
  Weapon,
  WeaponAmmoState,
  WeaponContext,
  WeaponDeps,
  WeaponOwner,
} from './types';
import { fillAmmoState } from './types';
import { fillMuzzleAndAim } from './muzzle';
import { resolveWeaponDamage } from './weaponDamage';
import { ownerReloadMul } from './reloadMul';
import { applyHit } from '../engine/applyHit';
import { addSupportHeal } from '../scoring';
import { acquireIsidaTarget, isBeamCandidate, type BeamCone } from './isidaTargeting';
import { NanoBeamFx } from './NanoBeamFx';
import { NanoFlowPool } from './NanoFlowPool';

const tune = WEAPON_TUNING.isida;

/** Runtime-факт: TankEntity несёт maxHealth и fx (в порту CombatPeer опущены). */
interface BeamTank extends CombatPeer {
  maxHealth: number;
  fx?: { healFlash: number };
}

const tmpMuzzle = new THREE.Vector3();
const tmpDir = new THREE.Vector3();
const tmpRight = new THREE.Vector3();
const tmpFromA = new THREE.Vector3();
const tmpFromB = new THREE.Vector3();
const tmpTo = new THREE.Vector3();
const tmpKnock = new THREE.Vector3();
const tmpImpact = new THREE.Vector3();
/** Cone-структура переиспользуется каждый кадр (горячий путь без аллокаций). */
const cone: BeamCone = { x: 0, z: 0, dirX: 0, dirZ: 1, halfCos: Math.cos(tune.coneHalfAngle), range: tune.range };
const ATK_COLOR = new THREE.Color(tune.colorAttack);
const HEAL_COLOR = new THREE.Color(tune.colorHeal);
const GLOW_IDLE = 0.1;

/** Точка поражения — центр корпуса цели (луч бьёт по танку, не по земле). */
function impactPoint(target: BeamTank, out: THREE.Vector3): THREE.Vector3 {
  out.set(target.position.x, target.position.y + 0.9, target.position.z);
  return out;
}

export class IsidaWeapon implements Weapon {
  readonly owner: WeaponOwner;
  energy = tune.energyMax;

  /** Спуск зажат (вход от WeaponFireStage/AI). */
  private trigger = false;
  /** Луч горит: спуск + энергия + жив владелец. */
  private beamOn = false;
  private mode: BeamMode = 'none';

  private target: BeamTank | null = null;
  private targetMode: 'attack' | 'heal' = 'attack';
  /** Перестроение дуги после захвата/смены цели: тиков нет, ширина растёт. */
  private acquireT = 0;
  private tickT = 0;
  private pulseT = 0;
  /** Дробный остаток очков поддержки (лечение тиками ~5.5 HP). */
  private supportCarry = { carry: 0 };

  private beam: NanoBeamFx;
  private flow: NanoFlowPool;
  private deps: WeaponDeps;

  constructor(owner: WeaponOwner, deps: WeaponDeps) {
    this.owner = owner;
    this.deps = deps;
    this.beam = new NanoBeamFx(deps.scene);
    this.flow = new NanoFlowPool(deps.scene, tune.flowCount);
  }

  setFire(active: boolean): void {
    this.trigger = active;
  }

  get energyRatio(): number {
    return this.energy / tune.energyMax;
  }

  getBeamMode(): BeamMode {
    return this.mode;
  }

  update(dt: number, ctx: WeaponContext): void {
    fillMuzzleAndAim(this.owner, tmpMuzzle, tmpDir);

    // --- гейт луча (порог старта как у огнемёта: >5 у.е., гаснет в ноль) ---
    if (!this.beamOn) {
      if (this.trigger && this.owner.alive && this.energy > 5) this.beamOn = true;
    } else if (!this.trigger || !this.owner.alive) {
      this.beamOn = false;
    }

    if (this.beamOn) {
      this.updateTarget(ctx);
    } else {
      this.target = null;
      this.acquireT = 0;
    }

    // --- расход/перезарядка баллона (дрain по активному режиму) ---
    if (this.beamOn) {
      const drain = !this.target
        ? tune.drainIdle
        : this.targetMode === 'attack' ? tune.drainAttack : tune.drainHeal;
      this.energy -= drain * dt;
      if (this.energy <= 0) {
        this.energy = 0;
        this.beamOn = false;
        this.target = null;
      }
    } else {
      this.energy = Math.min(
        tune.energyMax,
        this.energy + tune.rechargeRate * ownerReloadMul(this.owner) * dt,
      );
    }

    // --- дискретный режим для HUD ---
    this.mode = !this.beamOn
      ? 'none'
      : !this.target
        ? 'idle'
        : this.acquireT > 0 ? 'acquire' : this.targetMode;
    if (this.acquireT > 0) {
      this.acquireT = Math.max(0, this.acquireT - dt);
      // Завершение захвата: вспышка в точке цели + микротряска игроку.
      if (this.acquireT === 0 && this.target) {
        impactPoint(this.target, tmpImpact);
        this.deps.effects.impact(tmpImpact, this.edgeHex());
        if (this.owner.isPlayer) this.deps.effects.addShake(0.05);
      }
    }

    // --- тики поражения (после перестроения дуги) ---
    if (this.beamOn && this.target && this.acquireT <= 0) {
      this.tickT += dt;
      while (this.tickT >= tune.tickRate) {
        this.tickT -= tune.tickRate;
        this.processTick();
      }
    } else {
      this.tickT = 0;
    }

    this.updateFx(dt);
    this.updateGlow(dt);
  }

  // --- захват/sticky-цель -----------------------------------------------
  private updateTarget(ctx: WeaponContext): void {
    cone.x = tmpMuzzle.x;
    cone.z = tmpMuzzle.z;
    cone.dirX = tmpDir.x;
    cone.dirZ = tmpDir.z;
    cone.range = tune.range;

    // Sticky: держим текущую цель, пока она годится (не прыгаем по конусу).
    if (this.target) {
      if (isBeamCandidate(this.target, this.owner, cone, ctx.colliders, this.targetMode)) {
        return;
      }
      this.target = null;
    }
    const found = acquireIsidaTarget(
      ctx.tanks as BeamTank[], this.owner, cone, ctx.colliders,
    );
    if (found) {
      const switched = this.target !== found.peer || this.targetMode !== found.mode;
      this.target = found.peer;
      this.targetMode = found.mode;
      if (switched) {
        this.acquireT = tune.acquireTime;
        this.deps.effects.muzzle(tmpMuzzle, this.edgeHex());
      }
    }
  }

  // --- тик урона/лечения -------------------------------------------------
  private processTick(): void {
    const t = this.target;
    if (!t || !t.alive) {
      this.target = null;
      return;
    }
    if (this.targetMode === 'attack') this.tickAttack(t);
    else this.tickHeal(t);
  }

  /**
   * Вампиризм привязан к ФАКТИЧЕСКИ нанесённому урону. Условий молчаливого
   * пропуска DamageSystem ровно пять (!alive, self, invuln, FF, dmg<=0);
   * первые четыре уже исключены захватом/гейтами, кроме invulnT — его гасим
   * здесь (щит поглощает тик без возврата, луч при этом продолжает жечь).
   */
  private tickAttack(t: BeamTank): void {
    if ((t.invulnT ?? 0) > 0) return;
    const dmg = resolveWeaponDamage(this.owner.params.damage, tune.damagePerSec * tune.tickRate);
    const dx = t.position.x - tmpMuzzle.x;
    const dz = t.position.z - tmpMuzzle.z;
    const dist = Math.hypot(dx, dz) || 1;
    tmpKnock.set(dx / dist, 0, dz / dist);
    // C8: возврат — от ФАКТИЧЕСкого урона (Weapon_Isida.md §«Вампиризм»): на
    // добивающем тике избыток (dmg − остаток HP цели) не применяется и не лечит.
    // Прочие «обнуляющие» условия DamageSystem исключены выше (alive/self/invuln/FF).
    const dealt = Math.min(dmg, Math.max(0, t.health));
    applyHit(
      this.deps.damageSystem, t, dealt, this.owner, tmpKnock, tune.knockback,
      (p) => this.deps.effects.trailPuff(p, ATK_COLOR),
      impactPoint(t, tmpImpact),
    );
    const healed = dealt * tune.vampirism;
    const cap = this.owner.params.maxHealth ?? Number.POSITIVE_INFINITY;
    if (healed > 0 && this.owner.health < cap) {
      this.owner.health = Math.min(cap, this.owner.health + healed);
    }
  }

  private tickHeal(t: BeamTank): void {
    const before = t.health;
    t.health = Math.min(t.maxHealth, t.health + tune.healPerSec * tune.tickRate);
    const healed = t.health - before;
    if (t.fx) t.fx.healFlash = 1;
    this.deps.effects.trailPuff(impactPoint(t, tmpImpact), HEAL_COLOR);
    if (healed > 0 && this.owner.isPlayer) {
      const st = addSupportHeal(this.supportCarry, healed);
      this.supportCarry.carry = st.carry;
      if (st.earned > 0) this.deps.onSupportScore?.(st.earned);
    }
    // Долечили до кондиции — цель теряет смысл, пересобрать захват на следующий кадр.
    if (t.health >= t.maxHealth * tune.healHpFrac) this.target = null;
  }

  // --- FX ----------------------------------------------------------------
  private edgeHex(): number {
    if (!this.target) return tune.colorIdle;
    return this.targetMode === 'heal' ? tune.colorHeal : tune.colorAttack;
  }

  private updateFx(dt: number): void {
    if (this.beamOn && this.owner.alive) {
      // Рожки-эмитёры: поперёк прицельного направления от муззла.
      tmpRight.set(tmpDir.z, 0, -tmpDir.x);
      tmpFromA.copy(tmpMuzzle).addScaledVector(tmpRight, 0.17);
      tmpFromB.copy(tmpMuzzle).addScaledVector(tmpRight, -0.15).addScaledVector(tmpDir, -0.06);
      if (this.target) impactPoint(this.target, tmpTo);
      else tmpTo.copy(tmpMuzzle).addScaledVector(tmpDir, 0.5);
      // Пунч толщины: дуга раздувается в момент захвата и стягивается к локу.
      const w = this.acquireT > 0
        ? 0.45 + 0.55 * (1 - this.acquireT / tune.acquireTime)
        : 1;
      const hex = this.edgeHex();
      const reverse = this.targetMode === 'attack' && !!this.target;
      this.beam.step(dt, tmpFromA, tmpFromB, tmpTo, w, hex);
      this.flow.update(dt, true, tmpMuzzle, tmpTo, reverse, hex);
    } else {
      this.beam.fadeStep(dt);
      // Затушка потока: живые mote долетают по осям последнего активного кадра.
      this.flow.update(
        dt, false, tmpMuzzle, tmpTo,
        this.targetMode === 'attack', this.edgeHex(),
      );
    }
  }

  /** Пульс «рельсовых» колец/капсулы по режиму; мигание на низком заряде. */
  private updateGlow(dt: number): void {
    const glow = this.owner.visual.railGlowMat;
    if (!glow) return;
    this.pulseT += dt;
    if (!this.beamOn) {
      glow.emissiveIntensity = GLOW_IDLE + 0.04 * Math.sin(this.pulseT * 2);
      return;
    }
    const base = this.mode === 'attack' ? 1.15 : this.mode === 'heal' ? 0.9 : 0.55;
    const pulse = 0.85 + 0.15 * Math.sin(this.pulseT * 9);
    const low = this.energy < 10;
    glow.emissiveIntensity = low
      ? base * (0.2 + 0.8 * Math.abs(Math.sin(this.pulseT * 18)))
      : base * pulse;
  }

  updateReload(_dt: number): void {}

  requestReload(): void {}

  getAmmoState(out?: WeaponAmmoState): WeaponAmmoState {
    return fillAmmoState(out, {
      ammo: Math.round(this.energy),
      magazine: Math.round(tune.energyMax),
      reloading: this.energy < 10,
      reloadProgress: this.energyRatio,
    });
  }

  onOwnerDeath(): void {
    this.beamOn = false;
    this.trigger = false;
    this.target = null;
    this.mode = 'none';
    this.acquireT = 0;
    this.tickT = 0;
    this.supportCarry.carry = 0;
    this.beam.kill();
    this.flow.onOwnerDeath();
    if (this.owner.visual.railGlowMat) {
      this.owner.visual.railGlowMat.emissiveIntensity = GLOW_IDLE;
    }
  }

  onRespawn(): void {
    this.isFiringReset();
    this.energy = tune.energyMax;
  }

  private isFiringReset(): void {
    this.beamOn = false;
    this.target = null;
    this.mode = 'none';
    this.acquireT = 0;
    this.tickT = 0;
  }

  dispose(): void {
    this.beam.dispose();
    this.flow.dispose();
  }
}
