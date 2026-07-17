// ===== FIREBIRD (Огнемёт) =====
// Оружие ближнего боя с геометрическим Overlap-check; пул частиц пламени
// вынесен в FlameParticlePool.
import * as THREE from 'three';
import { WEAPON_TUNING } from '../../core/catalog';
import type { TankLike } from '../../core/types';
import type { WeaponOwner } from './types';
import type { Weapon, WeaponContext, WeaponDeps } from './types';
import { applyHit } from '../engine/applyHit';
import { buildAmmoState } from './types';
import { FlameParticlePool } from './FlameParticlePool';

const tmpMuzzle = new THREE.Vector3();
const tmpMuzzleQuat = new THREE.Quaternion();
const tmpDir = new THREE.Vector3();
const tmpTargetVec = new THREE.Vector3();

export class FlamethrowerWeapon implements Weapon {
  readonly owner: WeaponOwner;
  energy = WEAPON_TUNING.flamethrower.energyMax;
  isFiring = false;

  private tickTimer = 0;
  private flamePool: FlameParticlePool;

  private deps: WeaponDeps;

  constructor(owner: WeaponOwner, deps: WeaponDeps) {
    this.owner = owner;
    this.deps = deps;
    this.flamePool = new FlameParticlePool(deps.scene, WEAPON_TUNING.flamethrower.particleCount);
  }

  setFire(active: boolean) {
    if (active && !this.isFiring && this.energy > 5 && this.owner.alive) {
      this.isFiring = true;
      this.deps.audio.startFlameLoop();
    } else if (!active && this.isFiring) {
      this.isFiring = false;
      this.deps.audio.stopFlameLoop();
    }
  }

  get energyRatio(): number {
    return this.energy / WEAPON_TUNING.flamethrower.energyMax;
  }

  update(dt: number, ctx: WeaponContext) {
    // Точная позиция, кватернион и направление ствола в мировых координатах
    this.owner.muzzleWorld(tmpMuzzle);
    this.owner.visual.muzzle.getWorldQuaternion(tmpMuzzleQuat);
    tmpDir.set(0, 0, 1).applyQuaternion(tmpMuzzleQuat).normalize();

    this.updateEnergy(dt);
    this.updateOverlapAndLight(dt, ctx);
    this.flamePool.update(dt, tmpMuzzleQuat, this.isFiring, tmpMuzzle);
  }

  /** Расход / восстановление энергии пламени. */
  private updateEnergy(dt: number) {
    if (this.isFiring && this.owner.alive) {
      this.energy -= WEAPON_TUNING.flamethrower.consumptionRate * dt;
      if (this.energy <= 0) {
        this.energy = 0;
        this.isFiring = false;
        this.deps.audio.stopFlameLoop();
      }
    } else {
      this.energy = Math.min(
        WEAPON_TUNING.flamethrower.energyMax,
        this.energy + WEAPON_TUNING.flamethrower.rechargeRate * dt,
      );
    }
  }

  /** Overlap-check урона (throttling). Мерцание дульного света — в пуле. */
  private updateOverlapAndLight(dt: number, ctx: WeaponContext) {
    if (this.isFiring) {
      this.tickTimer += dt;
      if (this.tickTimer >= WEAPON_TUNING.flamethrower.tickRate) {
        this.tickTimer -= WEAPON_TUNING.flamethrower.tickRate;
        this.processOverlapDamage(ctx.tanks);
      }
    } else {
      this.tickTimer = 0;
    }
  }

  /** Геометрический Overlap-check поражения целей в конусе пламени */
  private processOverlapDamage(tanks: TankLike[]) {
    const halfCone = WEAPON_TUNING.flamethrower.coneAngle * 0.5;

    for (const t of tanks) {
      if (t.id === this.owner.id || !t.alive) continue;

      tmpTargetVec.subVectors(t.position, tmpMuzzle);
      const dist = tmpTargetVec.length();

      if (dist <= WEAPON_TUNING.flamethrower.range) {
        tmpTargetVec.normalize();
        const angle = tmpDir.angleTo(tmpTargetVec);

         if (angle <= halfCone) {
          // Цель внутри конуса поражения!
          const dmg = WEAPON_TUNING.flamethrower.damagePerTick;
          applyHit(
            this.deps.damageSystem, t, dmg, this.owner, tmpTargetVec, WEAPON_TUNING.flamethrower.knockback,
            (p) => this.deps.effects.spawnSmoke(p, 1, 1.0, false),
            t.position,
          );
        }
      }
    }
  }

  updateReload(_dt: number): void {}

  requestReload(): void {}

  getAmmoState() {
    return buildAmmoState({
      ammo: Math.round(this.energy),
      magazine: Math.round(WEAPON_TUNING.flamethrower.energyMax),
      reloading: this.energy < 10,
      reloadProgress: this.energyRatio,
    });
  }

  dispose() {
    this.deps.audio.stopFlameLoop();
    this.flamePool.dispose();
  }
}
