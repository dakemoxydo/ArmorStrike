// ===== Танк: сущность танка (данные) + типы =====
import * as THREE from 'three';
import { TANK } from './constants';
import type { HullId, TurretId, WeaponType } from '../core/catalog';
import type { Weapon } from './weapons/types';
import { disposeObject3D } from './resources/disposeObject3D';
import type { TankLike } from '../core/types';

export { buildTankMesh } from './tank/buildMesh';

export interface TankVisual {
  group: THREE.Group;
  hull: THREE.Group;
  turret: THREE.Group;
  barrelGroup: THREE.Group;
  muzzle: THREE.Object3D;
  ring: THREE.Mesh;
  bodyMats: THREE.MeshStandardMaterial[];
  trackTex: THREE.CanvasTexture;
  railGlowMat?: THREE.MeshStandardMaterial;
}

export interface TankParams {
  maxHealth: number;
  speed: number;
  reverseSpeed: number;
  turnSpeed: number;
  turretSpeed: number;
  damage: number;
  shotCooldown: number;
  weaponType?: WeaponType;
  range?: number;
}

let nextTankId = 1;

export class TankEntity implements TankLike {
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
  knockback = new THREE.Vector3();

  timeSinceHit = 0;
  smokeAcc = 0;
  dustAcc = 0;
  hullId?: HullId;
  turretId?: TurretId;
  weapon?: Weapon;

  radius = TANK.radius;
  health: number;
  alive = true;
  deathT = 0;

  fireTimer = 0;
  ammo = 0;
  magazine = 0;
  fullReloading = false;
  reloadTimer = 0;
  fullReloadTime = 2.3;

  hitFlash = 0;
  barrelKick = 0;
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

  canFire(): boolean {
    if (!this.alive || this.fireTimer > 0) return false;
    if (this.isPlayer) return this.ammo > 0 && !this.fullReloading;
    return true;
  }

  onFired(recoil: number) {
    this.fireTimer = this.params.shotCooldown;
    this.barrelKick = 1;
    this.aimDir(this._v);
    this.knockback.addScaledVector(this._v, -recoil);
    if (this.isPlayer) this.ammo = Math.max(0, this.ammo - 1);
  }

  startFullReload() {
    if (this.fullReloading || !this.alive) return;
    this.fullReloading = true;
    this.reloadTimer = this.fullReloadTime;
  }

  /** Тик перезарядки магазина (используется только для игрока с пушкой). */
  updateReload(dt: number) {
    if (this.fullReloading) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) {
        this.fullReloading = false;
        this.ammo = this.magazine;
      }
    } else if (this.ammo === 0) {
      this.startFullReload();
    }
  }

  takeDamage(dmg: number, attackerId: number) {
    if (!this.alive || dmg <= 0) return;
    this.health -= dmg;
    this.hitFlash = 1;
    this.lastAttackerId = attackerId;
    this.timeSinceHit = 0;
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
    scene.remove(this.visual.group);
    disposeObject3D(this.visual.group);
  }
}
