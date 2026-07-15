// ===== Танк: сущность танка (симуляция) + типы =====
import * as THREE from 'three';
import { BOOST, TANK } from './constants';
import type { HullId, TurretId } from './constants';
import { clamp, wrapAngle } from './physics';
import type { Weapon } from './weapons/types';

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

export interface TankStyle {
  body: string;
  dark: string;
  light: string;
  glow: number;      // цвет командного свечения
  accent: number;    // цвет ствола/деталей
  antenna: boolean;
}

export interface TankParams {
  maxHealth: number;
  speed: number;
  reverseSpeed: number;
  turnSpeed: number;
  turretSpeed: number;
  damage: number;
  shotCooldown: number;
  weaponType?: 'railgun' | 'flamethrower' | 'cannon';
  range?: number;
}

let nextTankId = 1;
const V = new THREE.Vector3();

export class TankEntity {
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
  boosting = false;      // запрос ускорения от контроллера
  boostActive = false;   // фактически активно (учитывает энергию/газ)
  boostEnergy = 1;       // запас нитро 0..1
  knockback = new THREE.Vector3();

  timeSinceHit = 0;      // сек с последнего получения урона (для саморемонта)
  smokeAcc = 0;          // аккумулятор дыма повреждений
  dustAcc = 0;           // аккумулятор пыли из-под гусениц
  hullId?: HullId;       // для табло счёта
  turretId?: TurretId;   // для табло счёта
  weapon?: Weapon;       // активное оружие (назначается Game)

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
    this.aimDir(V);
    this.knockback.addScaledVector(V, -recoil);
    if (this.isPlayer) this.ammo = Math.max(0, this.ammo - 1);
  }

  startFullReload() {
    if (this.fullReloading || !this.alive) return;
    this.fullReloading = true;
    this.reloadTimer = this.fullReloadTime;
  }

  takeDamage(dmg: number, attackerId: number) {
    if (!this.alive) return;
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

  update(dt: number) {
    const p = this.params;

    if (!this.alive) {
      this.boostActive = false;
      this.deathT += dt;
      this.visual.barrelGroup.rotation.x = THREE.MathUtils.damp(
        this.visual.barrelGroup.rotation.x, 0.3, 4, dt,
      );
      this.visual.turret.rotation.y += dt * 0.15;
      const k = clamp(1 - this.deathT * 0.5, 0.15, 1);
      for (const m of this.visual.bodyMats) {
        m.color.setScalar(k);
        m.emissive.setScalar(0);
      }
      this.visual.ring.visible = false;
      return;
    }

    const wantBoost = this.boosting && this.boostEnergy > BOOST.minActivate && this.throttle > 0.15;
    this.boostActive = wantBoost;

    // Саморемонт вне боя (как в game1)
    this.timeSinceHit += dt;
    if (this.timeSinceHit > 5 && this.health < this.maxHealth) {
      this.health = Math.min(this.maxHealth, this.health + 7 * dt);
    }
    this.boostEnergy = clamp(
      this.boostEnergy + (wantBoost ? -BOOST.drainPerSec : BOOST.rechargePerSec) * dt,
      0, 1,
    );

    const maxFwd = p.speed * (wantBoost ? BOOST.multiplier : 1);
    const targetSpeed = this.throttle >= 0
      ? this.throttle * maxFwd
      : this.throttle * p.reverseSpeed;
    this.speed = THREE.MathUtils.damp(this.speed, targetSpeed, wantBoost ? 6 : 4.5, dt);

    const agility = 0.55 + 0.45 * Math.min(Math.abs(this.speed) / p.speed, 1);
    this.yaw += this.steer * p.turnSpeed * agility * dt;

    const fx = Math.sin(this.yaw);
    const fz = Math.cos(this.yaw);
    const px = this.position.x;
    const pz = this.position.z;
    this.position.x += (fx * this.speed + this.knockback.x) * dt;
    this.position.z += (fz * this.speed + this.knockback.z) * dt;
    this.knockback.multiplyScalar(Math.exp(-5.5 * dt));
    this.vel.set((this.position.x - px) / dt, 0, (this.position.z - pz) / dt);

    this.fireTimer = Math.max(0, this.fireTimer - dt);

    if (this.isPlayer) {
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

    const rel = wrapAngle(this.aimYaw - this.yaw);
    const diff = wrapAngle(rel - this.turretYaw);
    const maxStep = p.turretSpeed * dt;
    this.turretYaw += clamp(diff, -maxStep, maxStep);

    this.visual.hull.rotation.y = this.yaw;
    this.visual.turret.rotation.y = this.turretYaw;
    this.barrelKick = THREE.MathUtils.damp(this.barrelKick, 0, 9, dt);
    this.visual.barrelGroup.position.z = 0.55 - this.barrelKick * 0.4;

    this.visual.trackTex.offset.y -= this.speed * dt * 0.22;

    if (this.hitFlash > 0) {
      this.hitFlash = Math.max(0, this.hitFlash - dt * 6);
      for (const m of this.visual.bodyMats) m.emissive.setScalar(this.hitFlash * 0.85);
    }

    const ringMat = this.visual.ring.material as THREE.MeshBasicMaterial;
    ringMat.opacity = 0.45 + Math.sin(performance.now() * 0.004 + this.id) * 0.18;
  }

  dispose(scene: THREE.Scene) {
    scene.remove(this.visual.group);
    this.visual.group.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) m.dispose();
      }
    });
  }
}
