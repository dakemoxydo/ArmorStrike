// ===== RAILGUN (Рельсотрон) =====
// Hitscan-оружие мгновенного действия с FSM (IDLE -> CHARGING -> COOLDOWN; выстрел синхронно в конце CHARGING)
// Визуальный луч вынесен в RailgunBeamFx. Juice: charge pull, shake/FOV, layered beam/SFX.
// M20: заряд запускается кликом и НЕ отменяется отпускением; показ выстрела —
// бегущий фронт (BeamSweep), а не мгновенная вспышка всей длины.
// M21: на дуле контактные шары заряда (RailgunChargeBalls): электрический
// растёт, белый воздух схлопывается; их соприкосновение = кадр выстрела.
import * as THREE from 'three';
import { WEAPON_TUNING } from '../../core/catalog';
import type { Collider } from '../engine/physics';
import type { RailgunChargeHandle } from '../ports/AudioPort';
import type { CombatPeer, WeaponOwner, WeaponAmmoState } from './types';
import type { Weapon, WeaponContext, WeaponDeps } from './types';
import { fillAmmoState } from './types';
import { applyHit } from '../engine/applyHit';
import { BARREL_REST_Y, BARREL_REST_Z } from '../tuning';
import { fillMuzzleAndAim } from './muzzle';
import { RailgunBeamFx } from './RailgunBeamFx';
import { RailgunChargeBalls } from './railgunChargeBalls';
import { railgunShouldStartCharge } from './railgunFireLogic';
import { BeamSweep, type BeamSweepEvent } from './railgunBeamSweep';
import { nearestShotBlockerDist } from './railgunBlockers';
import { resolveWeaponDamage } from './weaponDamage';
import { ownerReloadMul } from './reloadMul';
import {
  applyRailgunChargingFx,
  applyRailgunCooldownChargeFx,
  applyRailgunIdleChargeFx,
} from './railgunChargeFx';

export type RailgunState = 'IDLE' | 'CHARGING' | 'COOLDOWN';

const tmpMuzzle = new THREE.Vector3();
const tmpDir = new THREE.Vector3();
const tmpSpark = new THREE.Vector3();
const BEAM_SPARK_COLOR = new THREE.Color(0x8fffe8);
/** Wall/block terminus impact color (orange = "stopped", distinct from pierce cyan). */
const WALL_IMPACT_COLOR = 0xffa040;
/**
 * J12: игровой фолбэк длины луча на случай не-конечного range
 * (`WEAPON_TUNING.railgun.range = Infinity` → 1000 м — вся арена 300×300
 * накрыта с запасом). Поиск блокеров (`nearestShotBlockerDist`) маппит
 * не-конечный range в свой физический safeRange 10000 — см. Weapon_Railgun.md.
 */
export const RAY_RANGE_FALLBACK = 1000;

/**
 * Beam-side visuals captured at fire time, replayed `tracerDelay` later
 * (M19 #4: hitscan damage is instant; the beam arrives a beat after the
 * muzzle flash so the shot has weight instead of popping in frame-one).
 * M20: события не применяются разом — они идут в BeamSweep и срабатывают,
 * когда бегущий от дула фронт проходит их расстояние `d`.
 */
interface PendingShotVisual {
  muzzle: THREE.Vector3;
  dir: THREE.Vector3;
  /** Final beam length (wall.dist when blocked, else full range). */
  dist: number;
  pierces: Array<{ p: THREE.Vector3; color: number; heavy: boolean; d: number }>;
  wall: { p: THREE.Vector3; d: number } | null;
}

/**
 * Стартовая длина луча в кадре flush — фронт «выплёскивается» из дула.
 * M21: равна диаметру контактного шара, так что луч вырастает из точки
 * соприкосновения зарядных шаров (они «схлопнулись» кадром ранее).
 */
const BEAM_SWEEP_START_LEN = Math.max(
  0.5, WEAPON_TUNING.railgun.chargeBalls.contactRadius * 2,
);

export class RailgunWeapon implements Weapon {
  readonly owner: WeaponOwner;
  state: RailgunState = 'IDLE';

  // Таймеры управления
  chargeTimer = 0;
  reloadTimer = 0;

  private beamFx: RailgunBeamFx;
  /** M21: контактные шары заряда на дуле (electric ↑ / air ↓, pop при выстреле). */
  private chargeBalls: RailgunChargeBalls;
  private raycaster = new THREE.Raycaster();

  private deps: WeaponDeps;
  private _tankMap = new Map<THREE.Object3D, CombatPeer>();
  private _targetArr: THREE.Object3D[] = [];
  private _tmpPoint = new THREE.Vector3();
  /** Accumulator for charge micro-shake / ion sparks (player). */
  private chargeFxAcc = 0;
  /** True while this weapon owns the active chargeRailgun sound. */
  private chargingAudioActive = false;
  /**
   * This weapon's charge voice handle. Railgun charges overlap (player +
   * bot snipers); every stop/pitch call is scoped to OUR session only —
   * a shared "current charge" used to cut a sibling's whine mid-charge.
   */
  private chargeHandle: RailgunChargeHandle | null = null;
  /** Delayed beam visuals — see PendingShotVisual docstring. */
  private pendingShot: PendingShotVisual | null = null;
  private shotDelayTimer = 0;
  /** M20: активный бегущий фронт луча (null — свипа нет). */
  private beamSweep: BeamSweep | null = null;
  /** J11: re-used collections and visual payload objects to avoid per-shot allocations */
  private readonly _hitTanksSet = new Set<number>();
  private readonly _shotVisual: PendingShotVisual = {
    muzzle: new THREE.Vector3(),
    dir: new THREE.Vector3(),
    dist: 0,
    pierces: [],
    wall: null,
  };
  private readonly _wallVisual = { p: new THREE.Vector3(), d: 0 };
  private readonly _piercePool: Array<{ p: THREE.Vector3; color: number; heavy: boolean; d: number }> = [];

  constructor(owner: WeaponOwner, deps: WeaponDeps) {
    this.owner = owner;
    this.deps = deps;
    this.beamFx = new RailgunBeamFx(deps.scene, deps.lights);
    this.chargeBalls = new RailgunChargeBalls(deps.scene);
  }

  /**
   * Спуск: заряд стартует в IDLE при удержании/нажатии (level-trigger).
   * Charge start is owned by railgunShouldStartCharge.
   * M20: выстрел неотменяем — отпущенный триггер во время CHARGING ничего
   * не делает, начатый заряд всегда доходит до выстрела.
   */
  setFire(active: boolean) {
    if (railgunShouldStartCharge(
      active, this.state, this.owner.alive, this.owner.fireTimer <= 0,
    )) {
      this.state = 'CHARGING';
      this.chargeTimer = 0;
      this.chargeFxAcc = 0;
      this.chargingAudioActive = true;
      this.chargeBalls.beginCharge();
      this.chargeHandle = this.deps.audio.chargeRailgun(this.chargeDuration());
    }
  }

  /** Stop OUR charge voice only (hard cut on fire, soft fade otherwise). */
  private stopChargeAudio(hard: boolean): void {
    if (this.chargeHandle) {
      this.deps.audio.stopChargeRailgun(this.chargeHandle, hard);
      this.chargeHandle = null;
    }
    this.chargingAudioActive = false;
  }

  private chargeDuration(): number {
    return WEAPON_TUNING.railgun.chargeTime / ownerReloadMul(this.owner);
  }

  private cooldownDuration(): number {
    return WEAPON_TUNING.railgun.reloadTime / ownerReloadMul(this.owner);
  }

  get reloadProgress(): number {
    if (this.state === 'COOLDOWN') {
      const d = this.cooldownDuration();
      return d > 0 ? 1 - this.reloadTimer / d : 1;
    }
    if (this.state === 'CHARGING') {
      const d = this.chargeDuration();
      return d > 0 ? this.chargeTimer / d : 1;
    }
    return 1;
  }

  get isCharging(): boolean {
    return this.state === 'CHARGING';
  }

  get isCooldown(): boolean {
    return this.state === 'COOLDOWN';
  }

  update(dt: number, ctx: WeaponContext) {
    const visual = this.owner.visual;

    // Tracer delay: replay the beam/impact visuals a beat after the hitscan.
    if (this.shotDelayTimer > 0) {
      this.shotDelayTimer -= dt;
      if (this.shotDelayTimer <= 0) {
        this.shotDelayTimer = 0;
        this.flushPendingShot();
      }
    }

    // M20: бегущий фронт луча — impact-события срабатывают по мере прохода.
    if (this.beamSweep) {
      if (this.beamSweep.step(dt, (len) => this.beamFx.setLength(len))) {
        this.beamSweep = null;
      }
    }

    switch (this.state) {
      case 'IDLE': {
        applyRailgunIdleChargeFx(this.owner, this.deps.effects, dt);
        break;
      }

      case 'CHARGING': {
        this.chargeTimer += dt;
        const chargeDur = this.chargeDuration();
        const progress = Math.min(1, this.chargeTimer / chargeDur);
        this.chargeFxAcc = applyRailgunChargingFx(
          this.owner, this.deps.effects, progress, this.chargeFxAcc, dt,
        );
        // M21: шары живут тем же progress, что и glow/FOV/pull — сходится в
        // один кадр с «соприкосновением».
        this.chargeBalls.setProgress(progress);
        // M19 #3: live pitch ramp — charge whine climbs with progress².
        if (this.chargingAudioActive && this.chargeHandle) {
          this.deps.audio.setChargeRailgunPitch(this.chargeHandle, progress);
        }

        if (this.chargeTimer >= chargeDur) {
          visual.barrelGroup.position.set(0, BARREL_REST_Y, BARREL_REST_Z);
          // Fire synchronously in the same frame the charge completes —
          // no transient FIRING state, no 1-frame latency before the shot.
          // Hard-cut our charge voice; shoot('railgun') only layers the crack.
          this.stopChargeAudio(true);
          // M21: «соприкосновение» = этот кадр: pop шаров и луч из точки контакта.
          this.chargeBalls.confirmFire();
          this.executeFiring(ctx.tanks, ctx.colliders);
          this.state = 'COOLDOWN';
          this.reloadTimer = this.cooldownDuration();
        }
        break;
      }

      case 'COOLDOWN': {
        this.reloadTimer -= dt;
        this.chargeFxAcc = applyRailgunCooldownChargeFx(
          this.owner, this.deps.effects, this.reloadTimer, this.cooldownDuration(), this.chargeFxAcc, dt,
        );

        if (this.reloadTimer <= 0) {
          this.state = 'IDLE';
          this.reloadTimer = 0;
          this.chargeFxAcc = 0;
        }
        break;
      }
    }

    this.beamFx.update(dt);
    // M21: ранний выход когда шаров нет; в charge/release ведёт позиции за
    // трясущимся дулом и проигрывает pop после выстрела.
    this.chargeBalls.update(dt, this.owner);
  }

  /** Выполнение Hitscan-выстрела: мгновенный урон + juice; луч — через tracerDelay. */
  private executeFiring(tanks: CombatPeer[], colliders: Collider[]) {
    fillMuzzleAndAim(this.owner, tmpMuzzle, tmpDir);
    const isPlayer = this.owner.isPlayer;
    const rt = WEAPON_TUNING.railgun;

    // Audio + body recoil (instant)
    if (isPlayer) {
      this.deps.audio.shoot('railgun');
    } else {
      this.deps.audio.shoot('railgun', this.owner.position);
    }
    this.owner.onFired(rt.knockback);

    // Muzzle / camera / FOV punch (instant — the crack precedes the beam)
    this.deps.effects.railgunMuzzle(tmpMuzzle);
    if (isPlayer) {
      this.deps.effects.addShake(rt.fireShakePlayer);
    } else if (this.playerNear(tanks, rt.fireShakeBotRange)) {
      // Тряска от bot-выстрела долетала к камере с другого конца карты (и из-за
      // спины). Trauma бота — только когда живой игрок рядом.
      this.deps.effects.addShake(rt.fireShakeBot);
    }
    if (isPlayer) {
      this.deps.effects.setFovTighten(0);
      this.deps.effects.addFovPunch(rt.fireFovPunch);
      this.deps.onShotFired?.();
    }

    // Hitscan resolves instantly (damage/knockback/pierce pings); beam + impact
    // visuals are collected into a payload and replayed tracerDelay later (M19 #4).
    const rawRange = this.owner.params.range ?? rt.range;
    const range = Number.isFinite(rawRange) ? rawRange : RAY_RANGE_FALLBACK;
    const shot = this._shotVisual;
    shot.muzzle.copy(tmpMuzzle);
    shot.dir.copy(tmpDir);
    shot.dist = range;
    shot.pierces.length = 0;
    shot.wall = null;
    shot.dist = this.resolveHits(this.castHitscan(tanks), colliders, shot);

    this.pendingShot = shot;
    this.shotDelayTimer = Math.max(0, rt.tracerDelay);
    if (this.shotDelayTimer <= 0) this.flushPendingShot();
  }

  /**
   * Показать луч и запустить бегущий фронт (M20): impact/debris/trail события
   * собираются в таймлайн BeamSweep и срабатывают, когда фронт их проходит.
   * show() сначала рисует короткий stub у дула — дальнюю границу ведёт свип.
   */
  private flushPendingShot(): void {
    const shot = this.pendingShot;
    if (!shot) return;
    this.pendingShot = null;

    this.beamFx.show(shot.muzzle, shot.dir, Math.min(BEAM_SWEEP_START_LEN, shot.dist));

    const events: BeamSweepEvent[] = [];
    for (const imp of shot.pierces) {
      events.push({
        d: imp.d,
        run: () => {
          this.deps.effects.railgunImpact(imp.p, imp.color, imp.heavy);
          this.beamFx.setImpactPosition(imp.p);
        },
      });
    }

    // Along-beam ion trail (midpoints) — плотный ионизационный след,
    // плавно рассеивающийся по мере движения фронта.
    const segs = Math.min(10, Math.max(3, Math.floor(shot.dist / 12)));
    const midIdx = Math.ceil(segs / 2);
    const midColor = shot.pierces[0]?.color ?? 0x8fffe8;
    for (let i = 1; i <= segs; i++) {
      const u = i / (segs + 1);
      const d = shot.dist * u;
      const pos = tmpSpark.copy(shot.muzzle).addScaledVector(shot.dir, d).clone();
      const atMid = i === midIdx;
      events.push({
        d,
        run: () => {
          this.deps.effects.trailPuff(pos, BEAM_SPARK_COLOR);
          if (atMid) this.deps.effects.railgunImpact(pos, midColor, false);
        },
      });
    }

    if (shot.wall) {
      const wallP = shot.wall.p;
      events.push({
        d: shot.wall.d,
        run: () => {
          this.deps.effects.railgunImpact(wallP, WALL_IMPACT_COLOR, true);
          this.deps.effects.debris(wallP, WALL_IMPACT_COLOR, 10);
          this.beamFx.setImpactPosition(wallP);
        },
      });
    }

    this.beamSweep = new BeamSweep(shot.dist, WEAPON_TUNING.railgun.beamFrontSpeed, events);
  }

  /**
   * M9: tank meshes via raycast; walls/blocks via collider slab (blocksShots),
   * same parity as projectiles — decorative arena meshes never stop the beam.
   */
  private castHitscan(tanks: CombatPeer[]): THREE.Intersection[] {
    this.raycaster.set(tmpMuzzle, tmpDir);
    const rawRange = this.owner.params.range ?? WEAPON_TUNING.railgun.range;
    this.raycaster.far = Number.isFinite(rawRange) ? rawRange : RAY_RANGE_FALLBACK;

    this._tankMap.clear();
    this._targetArr.length = 0;

    const ownerTeam = this.owner.teamId ?? null;
    for (const t of tanks) {
      if (t.id === this.owner.id || !t.alive) continue;
      // Skip teammates to avoid pushing allies / wasting penetration.
      // Mirrors DamageSystem.applyDamage team filter; knockback/VFX aren't gated there.
      const targetTeam = t.teamId ?? null;
      if (ownerTeam !== null && targetTeam !== null && ownerTeam === targetTeam) continue;
      t.visual.group.updateMatrixWorld(true);
      t.visual.group.traverse((o) => {
        if (!('isMesh' in o && (o as THREE.Mesh).isMesh)) return;
        if (o === t.visual.ring || o === t.visual.shield || o.name === 'comicInkMesh') return;
        this._targetArr.push(o);
        this._tankMap.set(o, t);
      });
    }

    return this.raycaster.intersectObjects(this._targetArr, false);
  }

  /** Nearest shot-blocking collider along aim ray; builds world hit point for FX/damage. */
  private nearestShotBlocker(
    colliders: Collider[],
    range: number,
  ): { dist: number; id: number; point: THREE.Vector3 } | null {
    const hit = nearestShotBlockerDist(
      tmpMuzzle.x, tmpMuzzle.z, tmpDir.x, tmpDir.z, range, colliders, tmpMuzzle.y, tmpDir.y,
    );
    if (!hit) return null;
    // Impact FX at the actual beam height (accounting for pitch), not an absolute world Y.
    // Keeps impact/debris aligned with the visible beam regardless of wall height.
    const point = this._tmpPoint.copy(tmpMuzzle).addScaledVector(tmpDir, hit.dist);
    return { dist: hit.dist, id: hit.id, point };
  }

  /** Есть ли живой игрок в `range` по XZ от владельца (гейт bot-fire trauma). */
  private playerNear(tanks: CombatPeer[], range: number): boolean {
    const self = this.owner.position;
    const r2 = range * range;
    for (const t of tanks) {
      if (!t.isPlayer) continue;
      const dx = t.position.x - self.x;
      const dz = t.position.z - self.z;
      return t.alive && dx * dx + dz * dz <= r2;
    }
    return false;
  }

  /** Проход по попаданиям: пенетрация, урон, толчок. Заполняет shot-визуалы.
   * Возвращает дистанцию луча. Урон/пинги мгновенны; FX — в shot (flush позже). */
  private resolveHits(
    hits: THREE.Intersection[],
    colliders: Collider[],
    shot: PendingShotVisual,
  ): number {
    const tankMap = this._tankMap;
    const rt = WEAPON_TUNING.railgun;
    const rawRange = this.owner.params.range ?? rt.range;
    const range = Number.isFinite(rawRange) ? rawRange : RAY_RANGE_FALLBACK;
    let maxHitDist = range;
    const baseDamage = resolveWeaponDamage(this.owner.params.damage, rt.damage);
    let currentDamage = baseDamage;
    this._hitTanksSet.clear();
    const hitTanksSet = this._hitTanksSet;
    let hitCount = 0;

    const wall = this.nearestShotBlocker(colliders, rawRange);
    const wallDist = wall?.dist ?? Infinity;

    for (const hit of hits) {
      if (hit.distance >= wallDist) break;

      let obj: THREE.Object3D | null = hit.object;
      let hitTank: CombatPeer | undefined;
      while (obj && !hitTank) {
        hitTank = tankMap.get(obj);
        obj = obj.parent;
      }
      if (!hitTank || hitTanksSet.has(hitTank.id)) continue;

      hitTanksSet.add(hitTank.id);
      hitCount += 1;
      const dmg = Math.round(currentDamage);
      const force = rt.knockback * (currentDamage / baseDamage);
      const heavy = hitCount === 1;
      // M19 #5: per-pierce feedback — impact color steps down per pierced tank
      // (bright 1st → dim 3rd+), plus a descending railgunPierce ping per hit.
      // M20: hit.distance — позиция на таймлайне бегущего фронта (от дула).
      const pierceColor = rt.pierceColors[Math.min(hitCount - 1, rt.pierceColors.length - 1)];
      this.deps.audio.railgunPierce(hitCount - 1);
      let pEntry = this._piercePool[hitCount - 1];
      if (!pEntry) {
        pEntry = { p: new THREE.Vector3(), color: 0, heavy: false, d: 0 };
        this._piercePool[hitCount - 1] = pEntry;
      }
      pEntry.p.copy(hit.point);
      pEntry.color = pierceColor;
      pEntry.heavy = heavy;
      pEntry.d = hit.distance;
      shot.pierces.push(pEntry);
      applyHit(
        this.deps.damageSystem, hitTank, dmg, this.owner, tmpDir, force,
        // Effect callback intentionally empty: beam FX are deferred via shot.pierces.
        () => {},
        hit.point,
      );
      currentDamage *= rt.penetrationFactor;
    }

    if (wall) {
      // After N penetrations currentDamage may round to 0; skip the block hit
      // but keep the wall impact FX so the beam still visibly stops.
      const wallDmg = Math.round(currentDamage);
      if (wallDmg > 0 && !this.owner.isRemote) {
        this.deps.damageSystem.damageBlock(wall.id, wallDmg, wall.point);
      }
      this._wallVisual.p.copy(wall.point);
      this._wallVisual.d = wall.dist;
      shot.wall = this._wallVisual;
      maxHitDist = wall.dist;
    }
    // Without a wall the beam draws to full range for sniper feel (per GDD).

    // Extra shake when player lands at least one pierce
    if (this.owner.isPlayer && hitCount > 0) {
      this.deps.effects.addShake(0.08 + hitCount * 0.04);
    }

    return maxHitDist;
  }

  updateReload(_dt: number): void {}

  requestReload(): void {}

  getAmmoState(out?: WeaponAmmoState): WeaponAmmoState {
    const reloading = this.isCharging || this.isCooldown;
    return fillAmmoState(out, {
      ammo: reloading ? 0 : 1,
      magazine: 1,
      reloading,
      reloadProgress: this.reloadProgress,
      isCharging: this.isCharging,
    });
  }

  /**
   * Смерть владельца: остановить заряд, сбросить state, скрыть луч, очистить FOV.
   * Вызывается один раз при переходе alive → !alive (Tank.takeDamage).
   */
  onOwnerDeath(): void {
    // Stop OUR charge voice (sessions are per-weapon; a sibling railgun
    // charging in the same frame keeps its own whine).
    this.stopChargeAudio(false);
    this.state = 'IDLE';
    this.chargeTimer = 0;
    this.reloadTimer = 0;
    this.chargeFxAcc = 0;
    if (this.owner.isPlayer) this.deps.effects.setFovTighten(0);
    // Death cuts ALL railgun visuals — drop a still-pending delayed beam too.
    this.pendingShot = null;
    this.shotDelayTimer = 0;
    // …и незавершённый бегущий фронт: его события не должны срабатывать за мёртвый танк.
    this.beamSweep = null;
    // Cut the beam so lights/meshes don't linger frozen while owner is dead.
    this.beamFx.hide();
    // M21: и зарядные шары — гасятся мгновенно (анимации разрядной нет).
    this.chargeBalls.hide();
    // Respawn restoreDeathVisuals resets barrelGroup.rotation but NOT position.
    // Without this hard reset, a tank dying mid-charge keeps the jitter/pull
    // offset through respawn until TankAnimationSystem damps it back.
    const visual = this.owner.visual;
    visual.barrelGroup.position.set(0, BARREL_REST_Y, BARREL_REST_Z);
    this.owner.setBarrelKick?.(0);
    // Свечение зарядки гаснем вместе с оружием: WeaponSystem мёртвых не
    // обновляет, а railGlowMat не входит в bodyMats, которые обнуляет
    // animateDeath — без сброса труп дотерпел бы до респауна со светящейся
    // «заряженной» рельсой.
    if (visual.railGlowMat) visual.railGlowMat.emissiveIntensity = 0;
  }

  onRespawn(): void {
    this.state = 'IDLE';
    this.chargeTimer = 0;
    this.reloadTimer = 0;
    this.chargeFxAcc = 0;
    this.pendingShot = null;
    this.shotDelayTimer = 0;
    this.beamSweep = null;
    this.beamFx.hide();
    this.chargeBalls.hide();
  }

  dispose() {
    this.stopChargeAudio(false);
    if (this.owner.isPlayer) this.deps.effects.setFovTighten(0);
    // beamFx is being torn down — drop any pending delayed shot / live sweep.
    this.pendingShot = null;
    this.shotDelayTimer = 0;
    this.beamSweep = null;
    this.chargeBalls.dispose();
    this.beamFx.dispose();
  }
}
