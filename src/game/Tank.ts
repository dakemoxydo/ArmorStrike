// ===== Танк: сущность = id + composition of domain components =====
// Systems / weapons keep using flat port projections (MotionBody, WeaponOwner, …);
// storage lives in motion / combat / buffs / fx / visual.
import * as THREE from 'three';
import { TANK } from './constants';
import type { HullId, TurretId } from '../core/catalog';
import type { Weapon, WeaponOwner } from './weapons/types';
import { disposeObject3D } from './resources/disposeObject3D';
import type { TankLike } from '../core/types';
import type { TankParams, TankVisual, TankFxState } from './tank/types';
import {
  TankBuffState,
  TankCombatState,
  TankMotionState,
  createTankFxState,
  type BuffBaseSnapshot,
} from './tank/components';
import type { TeamId } from './match/matchTypes';

export type { TankParams, TankVisual } from './tank/types';
export type { BuffBaseSnapshot } from './tank/components';
/** Удобный re-export сборки меша (импорт типов — из tank/types, цикл разорван). */
export { buildTankMesh } from './tank/buildMesh';

let nextTankId = 1;

export class TankEntity implements TankLike, WeaponOwner {
  id = nextTankId++;
  name: string;
  isPlayer: boolean;
  params: TankParams;
  visual: TankVisual;

  /** Drive / aim pose / knockback. */
  readonly motion = new TankMotionState();
  /** HP, death, fire timer. */
  readonly combat: TankCombatState;
  /** Wave-buff multipliers + snapshot. */
  readonly buffs = new TankBuffState();
  /** Presentation-only FX accumulators (outside TankLike). */
  readonly fx: TankFxState = createTankFxState();

  /** Match: FFA null; TDM/CP alpha|bravo. */
  teamId: TeamId = null;
  /** Match personal kills / deaths. */
  kills = 0;
  deaths = 0;

  hullId?: HullId;
  turretId?: TurretId;
  weapon?: Weapon;
  radius = TANK.radius;

  constructor(name: string, isPlayer: boolean, params: TankParams, visual: TankVisual) {
    this.name = name;
    this.isPlayer = isPlayer;
    this.params = params;
    this.visual = visual;
    this.combat = new TankCombatState(params.maxHealth);
  }

  // ---- Flat port projections (MotionBody / AimBody / WeaponOwner / TankLike / AIBody) ----
  // Call sites and port types stay structural; storage is in components above.

  get yaw() { return this.motion.yaw; }
  set yaw(v: number) { this.motion.yaw = v; }

  get turretYaw() { return this.motion.turretYaw; }
  set turretYaw(v: number) { this.motion.turretYaw = v; }

  get aimYaw() { return this.motion.aimYaw; }
  set aimYaw(v: number) { this.motion.aimYaw = v; }

  get speed() { return this.motion.speed; }
  set speed(v: number) { this.motion.speed = v; }

  get throttle() { return this.motion.throttle; }
  set throttle(v: number) { this.motion.throttle = v; }

  get steer() { return this.motion.steer; }
  set steer(v: number) { this.motion.steer = v; }

  get boosting() { return this.motion.boosting; }
  set boosting(v: boolean) { this.motion.boosting = v; }

  get boostActive() { return this.motion.boostActive; }
  set boostActive(v: boolean) { this.motion.boostActive = v; }

  get boostEnergy() { return this.motion.boostEnergy; }
  set boostEnergy(v: number) { this.motion.boostEnergy = v; }

  get knockback() { return this.motion.knockback; }
  set knockback(v: THREE.Vector3) { this.motion.knockback.copy(v); }

  get vel() { return this.motion.vel; }
  set vel(v: THREE.Vector3) { this.motion.vel.copy(v); }

  get boostDrainMul() { return this.buffs.boostDrainMul; }
  set boostDrainMul(v: number) { this.buffs.boostDrainMul = v; }

  get boostRechargeMul() { return this.buffs.boostRechargeMul; }
  set boostRechargeMul(v: number) { this.buffs.boostRechargeMul = v; }

  get reloadSpeedMul() { return this.buffs.reloadSpeedMul; }
  set reloadSpeedMul(v: number) { this.buffs.reloadSpeedMul = v; }

  get buffBase(): BuffBaseSnapshot | null { return this.buffs.buffBase; }
  set buffBase(v: BuffBaseSnapshot | null) { this.buffs.buffBase = v; }

  get health() { return this.combat.health; }
  set health(v: number) { this.combat.health = v; }

  get alive() { return this.combat.alive; }
  set alive(v: boolean) { this.combat.alive = v; }

  get deathT() { return this.combat.deathT; }
  set deathT(v: number) { this.combat.deathT = v; }

  get fireTimer() { return this.combat.fireTimer; }
  set fireTimer(v: number) { this.combat.fireTimer = v; }

  get lastAttackerId() { return this.combat.lastAttackerId; }
  set lastAttackerId(v: number) { this.combat.lastAttackerId = v; }

  get invulnT() { return this.combat.invulnT; }
  set invulnT(v: number) { this.combat.invulnT = v; }

  get position() { return this.visual.group.position; }
  get maxHealth() { return this.params.maxHealth; }

  muzzleWorld(out: THREE.Vector3): THREE.Vector3 {
    return this.visual.muzzle.getWorldPosition(out);
  }

  aimDir(out: THREE.Vector3): THREE.Vector3 {
    out.set(Math.sin(this.aimYaw), 0, Math.cos(this.aimYaw));
    return out;
  }

  /** Готовность к выстрелу по базовым условиям (fireTimer). Контракт
   *  оружия (наличие патронов/заряда) проверяется самим оружием. */
  canFire(): boolean {
    return this.alive && this.fireTimer <= 0;
  }

  onFired(recoil: number) {
    this.fireTimer = this.params.shotCooldown;
    // Visual kick scales with recoil so railgun (≈18) snaps harder than cannon (≈5).
    this.fx.barrelKick = Math.min(2.25, 0.55 + Math.abs(recoil) * 0.07);
    this.aimDir(this._v);
    this.knockback.addScaledVector(this._v, -recoil);
  }

  /** Railgun charge pull-back / external barrel animation driver. */
  setBarrelKick(amount: number) {
    this.fx.barrelKick = amount;
  }

  takeDamage(dmg: number, attackerId: number) {
    if (!this.alive || dmg <= 0) return;
    this.health -= dmg;
    this.fx.hitFlash = 1;
    this.lastAttackerId = attackerId;
    this.fx.timeSinceHit = 0;
    if (this.health <= 0) {
      this.health = 0;
      this.alive = false;
      this.deathT = 0;
      this.throttle = 0;
      this.steer = 0;
    }
  }

  private _v = new THREE.Vector3();

  dispose(scene: THREE.Scene) {
    this.weapon?.dispose();
    scene.remove(this.visual.group);
    disposeObject3D(this.visual.group);
  }
}
