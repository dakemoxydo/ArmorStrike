import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import { CannonWeapon } from '../game/weapons/CannonWeapon';
import { TankEntity } from '../game/Tank';
import type { WeaponDeps } from '../game/weapons/types';
import type { TankVisual } from '../game/Tank';
import { WEAPON_TUNING } from '../core/catalog';

function makeVisual(): TankVisual {
  const group = new THREE.Group();
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 1, 2);
  group.add(muzzle);
  const ring = new THREE.Mesh();
  return {
    group, hull: new THREE.Group(), turret: new THREE.Group(),
    barrelGroup: new THREE.Group(), muzzle, ring,
    bodyMats: [], trackTex: null as unknown as THREE.CanvasTexture,
  };
}

const PARAMS = {
  maxHealth: 100, speed: 15, reverseSpeed: 9, turnSpeed: 2.9,
  turretSpeed: 9, damage: 32, shotCooldown: 0.28,
  weaponType: 'cannon' as const, range: 75,
};

function makeTank(isPlayer = true, alive = true): TankEntity {
  const t = new TankEntity('T', isPlayer, PARAMS, makeVisual());
  if (!alive) t.alive = false;
  return t;
}

function makeDeps(): WeaponDeps {
  return {
    scene: new THREE.Scene(),
    effects: { muzzle: vi.fn(), addShake: vi.fn(), impact: vi.fn() } as any,
    audio: { shoot: vi.fn(), reload: vi.fn() } as any,
    damageSystem: {} as any,
    projectiles: { fire: vi.fn() } as any,
    onShotFired: vi.fn(),
  };
}

function emptyMag(w: CannonWeapon, t: TankEntity) {
  const n = WEAPON_TUNING.cannon.magazine;
  for (let i = 0; i < n; i++) {
    t.fireTimer = 0;
    w.setFire(true);
    w.setFire(false);
  }
}

describe('CannonWeapon — инкапсулированная перезарядка', () => {
  it('после 10 выстрелов магазин пуст и стартует полная перезарядка', () => {
    const t = makeTank();
    const w = new CannonWeapon(t, makeDeps());
    emptyMag(w, t);
    expect(w.getAmmoState().ammo).toBe(0);
    expect(w.getAmmoState().reloading).toBe(true);
  });

  it('updateReload восполняет магазин после истечения fullReloadTime', () => {
    const t = makeTank();
    const w = new CannonWeapon(t, makeDeps());
    emptyMag(w, t);
    expect(w.getAmmoState().reloading).toBe(true);
    w.updateReload(2.0);
    expect(w.getAmmoState().reloading).toBe(false);
    expect(w.getAmmoState().ammo).toBe(WEAPON_TUNING.cannon.magazine);
  });

  it('requestReload запускает перезарядку только при неполном магазине', () => {
    const t = makeTank();
    const w = new CannonWeapon(t, makeDeps());
    expect(w.getAmmoState().ammo).toBe(WEAPON_TUNING.cannon.magazine);
    w.requestReload();
    expect(w.getAmmoState().reloading).toBe(false);

    t.fireTimer = 0; w.setFire(true); w.setFire(false);
    expect(w.getAmmoState().ammo).toBe(WEAPON_TUNING.cannon.magazine - 1);
    w.requestReload();
    expect(w.getAmmoState().reloading).toBe(true);
  });

  it('мёртвый танк не стреляет и не перезаряжается', () => {
    const t = makeTank(true, false);
    const deps = makeDeps();
    const w = new CannonWeapon(t, deps);
    w.setFire(true);
    expect(deps.projectiles.fire).not.toHaveBeenCalled();
    w.updateReload(2.0);
    expect(w.getAmmoState().reloading).toBe(false);
  });

  it('бот после опустошения магазина перезаряжается и снова стреляет', () => {
    const bot = makeTank(false, true);
    const deps = makeDeps();
    const w = new CannonWeapon(bot, deps);

    emptyMag(w, bot);
    expect(w.getAmmoState().reloading).toBe(true);
    expect(deps.projectiles.fire).toHaveBeenCalledTimes(WEAPON_TUNING.cannon.magazine);
    // HUD pulse только у игрока
    expect(deps.onShotFired).not.toHaveBeenCalled();

    // без updateReload бот бы «залип» навечно
    w.updateReload(WEAPON_TUNING.cannon.reloadTime + 0.01);
    expect(w.getAmmoState().reloading).toBe(false);
    expect(w.getAmmoState().ammo).toBe(WEAPON_TUNING.cannon.magazine);

    bot.fireTimer = 0;
    w.setFire(true);
    expect(deps.projectiles.fire).toHaveBeenCalledTimes(WEAPON_TUNING.cannon.magazine + 1);
    expect(w.getAmmoState().ammo).toBe(WEAPON_TUNING.cannon.magazine - 1);
  });

  it('onShotFired вызывается только для игрока', () => {
    const player = makeTank(true);
    const deps = makeDeps();
    const w = new CannonWeapon(player, deps);
    player.fireTimer = 0;
    w.setFire(true);
    expect(deps.onShotFired).toHaveBeenCalledTimes(1);
  });
});
