// ===== RAILGUN (Рельсотрон) =====
// Hitscan-оружие мгновенного действия с FSM (IDLE -> CHARGING -> FIRING -> COOLDOWN)
// Визуальный луч вынесен в RailgunBeamFx. Juice: charge pull, shake/FOV, layered beam/SFX.
import * as THREE from 'three';
import { WEAPON_TUNING } from '../../core/catalog';
import type { Collider } from '../engine/physics';
import type { CombatPeer, WeaponOwner } from './types';
import type { Weapon, WeaponContext, WeaponDeps } from './types';
import { buildAmmoState } from './types';
import { applyHit } from '../engine/applyHit';
import { BARREL_REST_Y, BARREL_REST_Z } from '../tuning';
import { fillMuzzleAndAim } from './muzzle';
import { RailgunBeamFx } from './RailgunBeamFx';
import { railgunShouldStartCharge } from './railgunFireLogic';
import { nearestShotBlockerDist } from './railgunBlockers';
import { resolveWeaponDamage } from './weaponDamage';
import { ownerReloadMul } from './reloadMul';
import {
  applyRailgunChargingFx,
  applyRailgunCooldownChargeFx,
  applyRailgunIdleChargeFx,
} from './railgunChargeFx';

export type RailgunState = 'IDLE' | 'CHARGING' | 'FIRING' | 'COOLDOWN';

const tmpMuzzle = new THREE.Vector3();
const tmpDir = new THREE.Vector3();
const tmpSpark = new THREE.Vector3();
const BEAM_SPARK_COLOR = new THREE.Color(0x8fffe8);

export class RailgunWeapon implements Weapon {
  readonly owner: WeaponOwner;
  state: RailgunState = 'IDLE';

  // Таймеры управления
  chargeTimer = 0;
  reloadTimer = 0;

  private beamFx: RailgunBeamFx;
  private raycaster = new THREE.Raycaster();

  private deps: WeaponDeps;
  private _tankMap = new Map<THREE.Object3D, CombatPeer>();
  private _targetArr: THREE.Object3D[] = [];
  private _tmpPoint = new THREE.Vector3();
  /** Accumulator for charge micro-shake / ion sparks (player). */
  private chargeFxAcc = 0;

  constructor(owner: WeaponOwner, deps: WeaponDeps) {
    this.owner = owner;
    this.deps = deps;
    this.beamFx = new RailgunBeamFx(deps.scene);
  }

  /**
   * Спуск: заряд стартует в IDLE при удержании/нажатии (level-trigger).
   * Charge start is owned by railgunShouldStartCharge.
   */
  setFire(active: boolean) {
    if (railgunShouldStartCharge(active, this.state, this.owner.alive)) {
      this.state = 'CHARGING';
      this.chargeTimer = 0;
      this.chargeFxAcc = 0;
      this.deps.audio.chargeRailgun(this.chargeDuration());
    }
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

    switch (this.state) {
      case 'IDLE': {
        applyRailgunIdleChargeFx(this.owner, this.deps.effects);
        break;
      }

      case 'CHARGING': {
        this.chargeTimer += dt;
        const chargeDur = this.chargeDuration();
        const progress = Math.min(1, this.chargeTimer / chargeDur);
        this.chargeFxAcc = applyRailgunChargingFx(
          this.owner, this.deps.effects, progress, this.chargeFxAcc, dt,
        );

        if (this.chargeTimer >= chargeDur) {
          visual.barrelGroup.position.set(0, BARREL_REST_Y, BARREL_REST_Z);
          this.executeFiring(ctx.tanks, ctx.colliders);
          this.state = 'COOLDOWN';
          this.reloadTimer = this.cooldownDuration();
        }
        break;
      }

      case 'FIRING': {
        this.state = 'COOLDOWN';
        this.reloadTimer = this.cooldownDuration();
        break;
      }

      case 'COOLDOWN': {
        this.reloadTimer -= dt;
        applyRailgunCooldownChargeFx(
          this.owner, this.deps.effects, this.reloadTimer, this.cooldownDuration(), dt,
        );

        if (this.reloadTimer <= 0) {
          this.state = 'IDLE';
          this.reloadTimer = 0;
        }
        break;
      }
    }

    this.beamFx.update(dt);
  }

  /** Выполнение Hitscan-выстрела с помощью Raycast + juice payload. */
  private executeFiring(tanks: CombatPeer[], colliders: Collider[]) {
    fillMuzzleAndAim(this.owner, tmpMuzzle, tmpDir);
    const isPlayer = this.owner.isPlayer;
    const rt = WEAPON_TUNING.railgun;

    // Audio + body recoil
    this.deps.audio.shoot('railgun');
    this.owner.onFired(rt.knockback);

    // Muzzle / camera / FOV punch
    this.deps.effects.railgunMuzzle(tmpMuzzle);
    this.deps.effects.addShake(isPlayer ? rt.fireShakePlayer : rt.fireShakeBot);
    if (isPlayer) {
      this.deps.effects.setFovTighten(0);
      this.deps.effects.addFovPunch(rt.fireFovPunch);
      this.deps.onShotFired?.();
    }

    const hits = this.castHitscan(tanks);
    const maxHitDist = this.resolveHits(hits, colliders);
    this.beamFx.show(tmpMuzzle, tmpDir, maxHitDist);

    // Along-beam ion trail (midpoints)
    const segs = Math.min(6, Math.max(2, Math.floor(maxHitDist / 18)));
    for (let i = 1; i <= segs; i++) {
      const u = i / (segs + 1);
      tmpSpark.copy(tmpMuzzle).addScaledVector(tmpDir, maxHitDist * u);
      this.deps.effects.trailPuff(tmpSpark, BEAM_SPARK_COLOR);
      if (i === Math.ceil(segs / 2)) {
        this.deps.effects.railgunImpact(tmpSpark, 0x8fffe8, false);
      }
    }
  }

  /**
   * M9: tank meshes via raycast; walls/blocks via collider slab (blocksShots),
   * same parity as projectiles — decorative arena meshes never stop the beam.
   */
  private castHitscan(tanks: CombatPeer[]): THREE.Intersection[] {
    this.raycaster.set(tmpMuzzle, tmpDir);
    this.raycaster.far = this.owner.params.range ?? WEAPON_TUNING.railgun.range;

    this._tankMap.clear();
    this._targetArr.length = 0;

    for (const t of tanks) {
      if (t.id !== this.owner.id && t.alive) {
        t.visual.group.traverse((o) => {
          this._targetArr.push(o);
          this._tankMap.set(o, t);
        });
      }
    }

    return this.raycaster.intersectObjects(this._targetArr, false);
  }

  /** Nearest shot-blocking collider along aim ray; builds world hit point for FX/damage. */
  private nearestShotBlocker(
    colliders: Collider[],
    range: number,
  ): { dist: number; id: number; point: THREE.Vector3 } | null {
    const hit = nearestShotBlockerDist(
      tmpMuzzle.x, tmpMuzzle.z, tmpDir.x, tmpDir.z, range, colliders, tmpMuzzle.y,
    );
    if (!hit) return null;
    const col = colliders.find((c) => c.id === hit.id);
    const point = this._tmpPoint.copy(tmpMuzzle).addScaledVector(tmpDir, hit.dist);
    point.y = col ? Math.min(col.height * 0.5, 2) : 1.6;
    return { dist: hit.dist, id: hit.id, point };
  }

  /** Проход по попаданиям: пенетрация, урон, толчок, эффекты. Возвращает дистанцию луча. */
  private resolveHits(hits: THREE.Intersection[], colliders: Collider[]): number {
    const tankMap = this._tankMap;
    const range = this.owner.params.range ?? WEAPON_TUNING.railgun.range;
    let maxHitDist = range;
    const baseDamage = resolveWeaponDamage(this.owner.params.damage, WEAPON_TUNING.railgun.damage);
    let currentDamage = baseDamage;
    const hitTanksSet = new Set<number>();
    let lastImpact: THREE.Vector3 | null = null;
    let hitCount = 0;

    const wall = this.nearestShotBlocker(colliders, range);
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
      const force = WEAPON_TUNING.railgun.knockback * (currentDamage / baseDamage);
      const heavy = hitCount === 1;
      applyHit(
        this.deps.damageSystem, hitTank, dmg, this.owner, tmpDir, force,
        (p) => {
          this.deps.effects.railgunImpact(p, 0x8fffe8, heavy);
          this.beamFx.setImpactPosition(p);
          lastImpact = p;
        },
        hit.point,
      );
      currentDamage *= WEAPON_TUNING.railgun.penetrationFactor;
    }

    if (wall) {
      this.deps.damageSystem.damageBlock(wall.id, Math.round(currentDamage), wall.point);
      this.deps.effects.railgunImpact(wall.point, 0xffa040, true);
      this.deps.effects.debris(wall.point, 0xffa040, 10);
      this.beamFx.setImpactPosition(wall.point);
      maxHitDist = wall.dist;
    } else if (lastImpact) {
      // Beam ends at last tank if no wall and we want shorter visual? Keep full range
      // unless we only hit tanks — still draw to range for sniper feel.
    }

    // Extra shake when player lands at least one pierce
    if (this.owner.isPlayer && hitCount > 0) {
      this.deps.effects.addShake(0.08 + hitCount * 0.04);
    }

    return maxHitDist;
  }

  updateReload(_dt: number): void {}

  requestReload(): void {}

  getAmmoState() {
    const reloading = this.isCharging || this.isCooldown;
    return buildAmmoState({
      ammo: reloading ? 0 : 1,
      magazine: 1,
      reloading,
      reloadProgress: this.reloadProgress,
      isCharging: this.isCharging,
    });
  }

  dispose() {
    this.deps.audio.stopChargeRailgun(false);
    if (this.owner.isPlayer) this.deps.effects.setFovTighten(0);
    this.beamFx.dispose();
  }
}
