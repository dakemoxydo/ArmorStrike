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

  constructor(owner: TankEntity, deps: WeaponDeps) {
    this.owner = owner;
    this.deps = deps;
  }

  setFire(active: boolean) {
    if (active) this.fire();
  }

  private fire() {
    const t = this.owner;
    if (!t.canFire()) return;
    const muzzle = t.muzzleWorld(tmpMuzzle);
    const dir = t.aimDir(tmpDir);
    const recoil = t.isPlayer ? WEAPON_TUNING.cannon.knockback : 4;
    const range = t.params.range ?? WEAPON_TUNING.cannon.range;

    t.onFired(recoil);
    this.deps.projectiles.fire(t, muzzle, dir, t.params.damage, 'cannon', range);

    this.deps.effects.muzzle(muzzle, 0xffcc44);
    this.deps.effects.addShake(0.08);
    this.deps.audio.shoot('cannon');
    if (t.isPlayer) this.deps.onShotFired?.();
  }

  update(_dt: number, _ctx: WeaponContext): void {
    // Пушка мгновенно спавнит снаряд; вся симуляция — в ProjectileManager.
  }

  getAmmoState() {
    const t = this.owner;
    const reloading = t.fullReloading;
    const reloadProgress = reloading ? 1 - t.reloadTimer / t.fullReloadTime : 0;
    return {
      ammo: reloading ? 0 : t.ammo,
      magazine: t.magazine,
      reloading,
      reloadProgress,
      isCharging: false,
    };
  }

  dispose(): void {
    // Нет собственных ресурсов сцены.
  }
}
