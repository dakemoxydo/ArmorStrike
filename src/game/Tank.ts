// ===== Танк: сущность танка (данные) =====
import * as THREE from 'three';
import { TANK } from './constants';
import type { HullId, TurretId } from '../core/catalog';
import type { Weapon, WeaponOwner } from './weapons/types';
import { disposeObject3D } from './resources/disposeObject3D';
import type { TankLike } from '../core/types';
import type { TankParams, TankVisual, TankFxState } from './tank/types';

export type { TankParams, TankVisual } from './tank/types';
/** Удобный re-export сборки меша (импорт типов — из tank/types, цикл разорван). */
export { buildTankMesh } from './tank/buildMesh';

let nextTankId = 1;

export class TankEntity implements TankLike, WeaponOwner {
  id = nextTankId++;
  name: string;
  isPlayer: boolean;
  params: TankParams;
  visual: TankVisual;

  yaw = 0;
  turretYaw = 0;
  aimYaw = 0;
  speed = 0;
  throttle = 0;
  steer = 0;
  boosting = false;
  boostActive = false;
  boostEnergy = 1;
  /** Wave buff: multiply BOOST.drain (1 = normal). */
  boostDrainMul = 1;
  /** Wave buff: multiply BOOST.recharge (1 = normal). */
  boostRechargeMul = 1;
  /** Wave buff: >1 = faster weapon reload / charge / energy recovery. */
  reloadSpeedMul = 1;
  /** Snapshot of combat params while a wave buff is active. */
  buffBase: {
    damage: number;
    speed: number;
    reverseSpeed: number;
    turnSpeed: number;
    shotCooldown: number;
  } | null = null;
  knockback = new THREE.Vector3();

  /** Представленческое/визуальное состояние (только FX), вне симуляции. */
  fx: TankFxState = { hitFlash: 0, barrelKick: 0, smokeAcc: 0, dustAcc: 0, timeSinceHit: 0 };
  hullId?: HullId;
  turretId?: TurretId;
  weapon?: Weapon;

  radius = TANK.radius;
  health: number;
  alive = true;
  deathT = 0;

  fireTimer = 0;

  lastAttackerId = -1;
  vel = new THREE.Vector3();

  constructor(name: string, isPlayer: boolean, params: TankParams, visual: TankVisual) {
    this.name = name;
    this.isPlayer = isPlayer;
    this.params = params;
    this.visual = visual;
    this.health = params.maxHealth;
  }

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
