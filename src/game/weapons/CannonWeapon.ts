// ===== ПУШКА «СМОКИ» (Cannon) =====
// Ранее логика выстрела была размазана по Game.tryFire + ProjectileManager.
// Теперь это обычное оружие с единым интерфейсом Weapon.
import * as THREE from 'three';
import { WEAPON_TUNING } from '../../core/catalog';
import type { TankEntity } from '../Tank';
import type { Weapon, WeaponContext, WeaponDeps } from './types';

const tmpMuzzle = new THREE.Vector3();
const tmpDir = new THREE.Vector3();

export class CannonWeapon implements Weapon {
  readonly owner: TankEntity;
  private deps: WeaponDeps;

  // Состояние магазина — инкапсулировано в оружии (ранее жило в TankEntity).
  private ammo: number;
  private magazine: number;
  private fullReloading = false;
  private reloadTimer = 0;
  private fullReloadTime: number;

  constructor(owner: TankEntity, deps: WeaponDeps) {
    this.owner = owner;
    this.deps = deps;
    this.magazine = WEAPON_TUNING.cannon.magazine;
    this.ammo = this.magazine;
    this.fullReloadTime = WEAPON_TUNING.cannon.reloadTime;
  }

  setFire(active: boolean) {
    if (active) this.fire();
  }

  private fire() {
    const t = this.owner;
    if (!this.canFire()) return;
    const muzzle = t.muzzleWorld(tmpMuzzle);
    const dir = t.aimDir(tmpDir);
    const recoil = t.isPlayer ? WEAPON_TUNING.cannon.knockback : 4;
    const range = t.params.range ?? WEAPON_TUNING.cannon.range;

    t.onFired(recoil);
    this.ammo = Math.max(0, this.ammo - 1);
    this.deps.projectiles.fire(t, muzzle, dir, t.params.damage, 'cannon', range);

    this.deps.effects.muzzle(muzzle, 0xffcc44);
    this.deps.effects.addShake(0.08);
    this.deps.audio.shoot('cannon');
    // HUD hit-pulse — только для игрока; автоперезарядка — для всех (боты иначе «глухнут» после магазина)
    if (t.isPlayer) this.deps.onShotFired?.();
    if (this.ammo === 0) this.startFullReload();
  }

  private canFire(): boolean {
    const t = this.owner;
    if (!t.alive || t.fireTimer > 0) return false;
    return this.ammo > 0 && !this.fullReloading;
  }

  private startFullReload() {
    if (this.fullReloading || !this.owner.alive) return;
    this.fullReloading = true;
    this.reloadTimer = this.fullReloadTime;
  }

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

  requestReload() {
    if (this.owner.alive && this.ammo < this.magazine) this.startFullReload();
  }

  update(_dt: number, _ctx: WeaponContext): void {
    // Пушка мгновенно спавнит снаряд; вся симуляция — в ProjectileManager.
  }

  getAmmoState() {
    const reloading = this.fullReloading;
    const reloadProgress = reloading ? 1 - this.reloadTimer / this.fullReloadTime : 0;
    return {
      ammo: reloading ? 0 : this.ammo,
      magazine: this.magazine,
      reloading,
      reloadProgress,
      isCharging: false,
    };
  }

  dispose(): void {
    // Нет собственных ресурсов сцены.
  }
}
