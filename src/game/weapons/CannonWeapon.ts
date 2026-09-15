// ===== ПУШКА «СМОКИ» (Cannon) =====
// Ранее логика выстрела была размазана по Game.tryFire + ProjectileManager.
// Теперь это обычное оружие с единым интерфейсом Weapon.
import * as THREE from 'three';
import { WEAPON_TUNING } from '../../core/catalog';
import type { Weapon, WeaponContext, WeaponDeps, WeaponOwner, WeaponAmmoState } from './types';
import { fillAmmoState } from './types';
import { fillMuzzleAndAim } from './muzzle';
import { ownerReloadMul } from './reloadMul';

const tmpMuzzle = new THREE.Vector3();
const tmpDir = new THREE.Vector3();

export class CannonWeapon implements Weapon {
  readonly owner: WeaponOwner;
  private deps: WeaponDeps;

  // Состояние магазина — инкапсулировано в оружии (ранее жило в TankEntity).
  private ammo: number;
  private magazine: number;
  private fullReloading = false;
  private reloadTimer = 0;
  private fullReloadTime: number;

  constructor(owner: WeaponOwner, deps: WeaponDeps) {
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
    fillMuzzleAndAim(t, tmpMuzzle, tmpDir);
    const muzzle = tmpMuzzle;
    const dir = tmpDir;
    const recoil = t.isPlayer ? WEAPON_TUNING.cannon.knockback : WEAPON_TUNING.cannon.botKnockback;
    const range = t.params.range ?? WEAPON_TUNING.cannon.range;

    // Pool exhausted → no shot: keep the round, skip recoil/FX/sfx so the
    // player never pays for a silent dry-fire (fire() reports success).
    if (!this.deps.projectiles.fire(t, muzzle, dir, t.params.damage, 'cannon', range)) {
      return;
    }

    t.onFired(recoil);
    this.ammo = Math.max(0, this.ammo - 1);
    this.deps.effects.muzzle(muzzle, 0xffcc44);
    if (t.isPlayer) this.deps.effects.addShake(0.08);
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

  private effectiveReloadTime(): number {
    return this.fullReloadTime / ownerReloadMul(this.owner);
  }

  private startFullReload() {
    if (this.fullReloading || !this.owner.alive) return;
    this.fullReloading = true;
    this.reloadTimer = this.effectiveReloadTime();
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

  getAmmoState(out?: WeaponAmmoState): WeaponAmmoState {
    const reloading = this.fullReloading;
    const dur = this.effectiveReloadTime();
    const reloadProgress = reloading && dur > 0 ? 1 - this.reloadTimer / dur : 0;
    return fillAmmoState(out, {
      ammo: reloading ? 0 : this.ammo,
      magazine: this.magazine,
      reloading,
      reloadProgress,
    });
  }

  onRespawn(): void {
    this.ammo = this.magazine;
    this.fullReloading = false;
    this.reloadTimer = 0;
  }

  dispose(): void {
    // Нет собственных ресурсов сцены.
  }
}
