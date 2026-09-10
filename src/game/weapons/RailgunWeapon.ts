// ===== RAILGUN (Рельсотрон) =====
// Hitscan-оружие мгновенного действия с FSM (IDLE -> CHARGING -> COOLDOWN; выстрел синхронно в конце CHARGING)
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
import { railgunShouldCancelCharge, railgunShouldStartCharge } from './railgunFireLogic';
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
 * Beam-side visuals captured at fire time, replayed `tracerDelay` later
 * (M19 #4: hitscan damage is instant; the beam arrives a beat after the
 * muzzle flash so the shot has weight instead of popping in frame-one).
 */
interface PendingShotVisual {
  muzzle: THREE.Vector3;
  dir: THREE.Vector3;
  /** Final beam length (wall.dist when blocked, else full range). */
  dist: number;
  pierces: Array<{ p: THREE.Vector3; color: number; heavy: boolean }>;
  wall: { p: THREE.Vector3 } | null;
}

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
  /** True while this weapon owns the active chargeRailgun sound. */
  private chargingAudioActive = false;
  /** Delayed beam visuals — see PendingShotVisual docstring. */
  private pendingShot: PendingShotVisual | null = null;
  private shotDelayTimer = 0;

  constructor(owner: WeaponOwner, deps: WeaponDeps) {
    this.owner = owner;
    this.deps = deps;
    this.beamFx = new RailgunBeamFx(deps.scene);
  }

  /**
   * Спуск: заряд стартует в IDLE при удержании/нажатии (level-trigger).
   * Charge start is owned by railgunShouldStartCharge.
   * Cancel-on-release (player only) — see railgunShouldCancelCharge.
   */
  setFire(active: boolean) {
    if (railgunShouldStartCharge(
      active, this.state, this.owner.alive, this.owner.fireTimer <= 0,
    )) {
      this.state = 'CHARGING';
      this.chargeTimer = 0;
      this.chargeFxAcc = 0;
      this.chargingAudioActive = true;
      this.deps.audio.chargeRailgun(this.chargeDuration());
    } else if (railgunShouldCancelCharge(active, this.state, this.owner.isPlayer)) {
      this.cancelCharge();
    }
  }

  /** Player released fire mid-charge: abort and settle visuals/audio. */
  private cancelCharge(): void {
    this.state = 'IDLE';
    this.chargeTimer = 0;
    this.chargeFxAcc = 0;
    if (this.chargingAudioActive) {
      this.deps.audio.stopChargeRailgun(false);
      this.chargingAudioActive = false;
    }
    if (this.owner.isPlayer) this.deps.effects.setFovTighten(0);
    // Barrel pull was driven by charge progress; damp-to-rest happens in idle FX.
    this.owner.setBarrelKick?.(0);
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
        // M19 #3: live pitch ramp — charge whine climbs with progress².
        if (this.chargingAudioActive) {
          this.deps.audio.setChargeRailgunPitch(progress);
        }

        if (this.chargeTimer >= chargeDur) {
          visual.barrelGroup.position.set(0, BARREL_REST_Y, BARREL_REST_Z);
          // Fire synchronously in the same frame the charge completes —
          // no transient FIRING state, no 1-frame latency before the shot.
          this.chargingAudioActive = false;
          this.executeFiring(ctx.tanks, ctx.colliders);
          this.state = 'COOLDOWN';
          this.reloadTimer = this.cooldownDuration();
        }
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

  /** Выполнение Hitscan-выстрела: мгновенный урон + juice; луч — через tracerDelay. */
  private executeFiring(tanks: CombatPeer[], colliders: Collider[]) {
    fillMuzzleAndAim(this.owner, tmpMuzzle, tmpDir);
    const isPlayer = this.owner.isPlayer;
    const rt = WEAPON_TUNING.railgun;

    // Audio + body recoil (instant)
    this.deps.audio.shoot('railgun');
    this.owner.onFired(rt.knockback);

    // Muzzle / camera / FOV punch (instant — the crack precedes the beam)
    this.deps.effects.railgunMuzzle(tmpMuzzle);
    this.deps.effects.addShake(isPlayer ? rt.fireShakePlayer : rt.fireShakeBot);
    if (isPlayer) {
      this.deps.effects.setFovTighten(0);
      this.deps.effects.addFovPunch(rt.fireFovPunch);
      this.deps.onShotFired?.();
    }

    // Hitscan resolves instantly (damage/knockback/pierce pings); beam + impact
    // visuals are collected into a payload and replayed tracerDelay later (M19 #4).
    const range = this.owner.params.range ?? rt.range;
    const shot: PendingShotVisual = {
      muzzle: tmpMuzzle.clone(),
      dir: tmpDir.clone(),
      dist: range,
      pierces: [],
      wall: null,
    };
    shot.dist = this.resolveHits(this.castHitscan(tanks), colliders, shot);

    this.pendingShot = shot;
    this.shotDelayTimer = Math.max(0, rt.tracerDelay);
    if (this.shotDelayTimer <= 0) this.flushPendingShot();
  }

  /** Replay the delayed beam + impact visuals (end of tracer delay). */
  private flushPendingShot(): void {
    const shot = this.pendingShot;
    if (!shot) return;
    this.pendingShot = null;

    this.beamFx.show(shot.muzzle, shot.dir, shot.dist);
    for (const imp of shot.pierces) {
      this.deps.effects.railgunImpact(imp.p, imp.color, imp.heavy);
      this.beamFx.setImpactPosition(imp.p);
    }
    if (shot.wall) {
      this.deps.effects.railgunImpact(shot.wall.p, WALL_IMPACT_COLOR, true);
      this.deps.effects.debris(shot.wall.p, WALL_IMPACT_COLOR, 10);
      this.beamFx.setImpactPosition(shot.wall.p);
    }

    // Along-beam ion trail (midpoints)
    const segs = Math.min(6, Math.max(2, Math.floor(shot.dist / 18)));
    for (let i = 1; i <= segs; i++) {
      const u = i / (segs + 1);
      tmpSpark.copy(shot.muzzle).addScaledVector(shot.dir, shot.dist * u);
      this.deps.effects.trailPuff(tmpSpark, BEAM_SPARK_COLOR);
      if (i === Math.ceil(segs / 2)) {
        this.deps.effects.railgunImpact(tmpSpark, shot.pierces[0]?.color ?? 0x8fffe8, false);
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

    const ownerTeam = this.owner.teamId ?? null;
    for (const t of tanks) {
      if (t.id === this.owner.id || !t.alive) continue;
      // Skip teammates to avoid pushing allies / wasting penetration.
      // Mirrors DamageSystem.applyDamage team filter; knockback/VFX aren't gated there.
      const targetTeam = t.teamId ?? null;
      if (ownerTeam !== null && targetTeam !== null && ownerTeam === targetTeam) continue;
      t.visual.group.traverse((o) => {
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
      tmpMuzzle.x, tmpMuzzle.z, tmpDir.x, tmpDir.z, range, colliders, tmpMuzzle.y,
    );
    if (!hit) return null;
    // Impact FX at the actual beam height (horizontal ray), not an absolute world Y.
    // Keeps impact/debris aligned with the visible beam regardless of wall height.
    const point = this._tmpPoint.copy(tmpMuzzle).addScaledVector(tmpDir, hit.dist);
    return { dist: hit.dist, id: hit.id, point };
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
    const range = this.owner.params.range ?? rt.range;
    let maxHitDist = range;
    const baseDamage = resolveWeaponDamage(this.owner.params.damage, rt.damage);
    let currentDamage = baseDamage;
    const hitTanksSet = new Set<number>();
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
      const force = rt.knockback * (currentDamage / baseDamage);
      const heavy = hitCount === 1;
      // M19 #5: per-pierce feedback — impact color steps down per pierced tank
      // (bright 1st → dim 3rd+), plus a descending railgunPierce ping per hit.
      const pierceColor = rt.pierceColors[Math.min(hitCount - 1, rt.pierceColors.length - 1)];
      this.deps.audio.railgunPierce(hitCount - 1);
      shot.pierces.push({ p: hit.point.clone(), color: pierceColor, heavy });
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
      if (wallDmg > 0) {
        this.deps.damageSystem.damageBlock(wall.id, wallDmg, wall.point);
      }
      shot.wall = { p: wall.point.clone() };
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

  /**
   * Смерть владельца: остановить заряд, сбросить state, скрыть луч, очистить FOV.
   * Вызывается один раз при переходе alive → !alive (Tank.takeDamage).
   */
  onOwnerDeath(): void {
    // Stop charge audio only if THIS weapon started it (shared AudioPort caveat).
    if (this.chargingAudioActive) {
      this.deps.audio.stopChargeRailgun(false);
      this.chargingAudioActive = false;
    }
    this.state = 'IDLE';
    this.chargeTimer = 0;
    this.reloadTimer = 0;
    this.chargeFxAcc = 0;
    if (this.owner.isPlayer) this.deps.effects.setFovTighten(0);
    // Death cuts ALL railgun visuals — drop a still-pending delayed beam too.
    this.pendingShot = null;
    this.shotDelayTimer = 0;
    // Cut the beam so lights/meshes don't linger frozen while owner is dead.
    this.beamFx.hide();
    // Respawn restoreDeathVisuals resets barrelGroup.rotation but NOT position.
    // Without this hard reset, a tank dying mid-charge keeps the jitter/pull
    // offset through respawn until TankAnimationSystem damps it back.
    const visual = this.owner.visual;
    visual.barrelGroup.position.set(0, BARREL_REST_Y, BARREL_REST_Z);
    this.owner.setBarrelKick?.(0);
  }

  dispose() {
    if (this.chargingAudioActive) {
      this.deps.audio.stopChargeRailgun(false);
      this.chargingAudioActive = false;
    }
    if (this.owner.isPlayer) this.deps.effects.setFovTighten(0);
    // beamFx is being torn down — drop any pending delayed shot.
    this.pendingShot = null;
    this.shotDelayTimer = 0;
    this.beamFx.dispose();
  }
}
