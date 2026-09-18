import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import { GaussWeapon } from '../game/weapons/GaussWeapon';
import { TankEntity } from '../game/Tank';
import { LightRig } from '../game/effects/LightRig';
import type { WeaponDeps, CombatPeer, WeaponContext } from '../game/weapons/types';
import type { TankVisual } from '../game/Tank';
import { WEAPON_TUNING } from '../core/catalog';
import type { Collider } from '../game/engine/physics';

function makeVisual(): TankVisual {
  const group = new THREE.Group();
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 1, 2);
  group.add(muzzle);
  const ring = new THREE.Mesh();
  return {
    group,
    hull: new THREE.Group(),
    turret: new THREE.Group(),
    barrelGroup: new THREE.Group(),
    muzzle,
    ring,
    bodyMats: [],
    bodyBaseColors: [],
    trackTex: null as unknown as THREE.CanvasTexture,
  };
}

const PARAMS = {
  maxHealth: 100,
  speed: 15,
  reverseSpeed: 9,
  turnSpeed: 2.9,
  turretSpeed: 8.5,
  damage: WEAPON_TUNING.gauss.damage,
  shotCooldown: 0,
  weaponType: 'gauss' as const,
  range: WEAPON_TUNING.gauss.range,
};

function makeTank(id: number, isPlayer = true, alive = true): TankEntity {
  const t = new TankEntity(`T${id}`, isPlayer, PARAMS, makeVisual());
  t.id = id;
  if (!alive) t.alive = false;
  return t;
}

function makeTarget(id: number, x: number, z: number, alive = true): CombatPeer {
  return {
    id,
    name: `Target${id}`,
    isPlayer: false,
    alive,
    health: 100,
    radius: 1.5,
    knockback: new THREE.Vector3(),
    position: new THREE.Vector3(x, 0, z),
    yaw: 0,
    teamId: null,
    takeDamage: vi.fn(),
    visual: { group: new THREE.Group() },
  };
}

function makeDeps(): WeaponDeps {
  return {
    scene: new THREE.Scene(),
    effects: {
      muzzle: vi.fn(),
      impact: vi.fn(),
      explosion: vi.fn(),
      addShake: vi.fn(),
      addFovPunch: vi.fn(),
    } as any,
    audio: {
      shoot: vi.fn(),
      chargeRailgun: vi.fn(() => ({ id: 1 })),
      setChargeRailgunPitch: vi.fn(),
      stopChargeRailgun: vi.fn(),
    } as any,
    damageSystem: {
      applyDamage: vi.fn(),
      applyKnockback: vi.fn(),
    } as any,
    projectiles: {} as any,
    lights: new LightRig(new THREE.Scene()),
    onShotFired: vi.fn(),
  };
}

describe('GaussWeapon — снайперский захват цели и автовыстрел', () => {
  it('в покое находится в IDLE, ammo = 1', () => {
    const owner = makeTank(1);
    const deps = makeDeps();
    const weapon = new GaussWeapon(owner, deps);

    expect(weapon.state).toBe('IDLE');
    expect(weapon.getAmmoState().ammo).toBe(1);
    expect(weapon.getAmmoState().isCharging).toBe(false);
    expect(weapon.getAmmoState().reloading).toBe(false);
  });

  it('при удержании ЛКМ и наличии врага в конусе переходит в LOCKING', () => {
    const owner = makeTank(1);
    owner.position.set(0, 0, 0);
    const target = makeTarget(2, 0, 30); // Прямо по курсу (Z+)
    const deps = makeDeps();
    const weapon = new GaussWeapon(owner, deps);

    const ctx: WeaponContext = {
      tanks: [target],
      colliders: [],
    };

    weapon.setFire(true);
    weapon.update(0.016, ctx);

    expect(weapon.state).toBe('LOCKING');
    expect(weapon.isCharging).toBe(true);
    expect(weapon.currentTarget).toBe(target);
    expect(deps.audio.chargeRailgun).toHaveBeenCalled();
  });

  it('отпускание ЛКМ до 100% производит аркадный выстрел навскидку и переходит в COOLDOWN', () => {
    const owner = makeTank(1);
    const target = makeTarget(2, 0, 30);
    const deps = makeDeps();
    const weapon = new GaussWeapon(owner, deps);
    const ctx: WeaponContext = { tanks: [target], colliders: [] };

    weapon.setFire(true);
    weapon.update(0.016, ctx);
    expect(weapon.state).toBe('LOCKING');

    weapon.setFire(false);
    expect(weapon.currentTarget).toBeNull();
    weapon.update(0.016, ctx);

    expect(weapon.state).toBe('COOLDOWN');
    expect(deps.damageSystem.applyDamage).toHaveBeenCalledWith(
      target,
      WEAPON_TUNING.gauss.arcadeDamage,
      owner,
    );
    expect(deps.audio.stopChargeRailgun).toHaveBeenCalled();
  });

  it('клик в IDLE при отсутствии цели производит мгновенный аркадный выстрел навскидку', () => {
    const owner = makeTank(1);
    const deps = makeDeps();
    const weapon = new GaussWeapon(owner, deps);
    const ctx: WeaponContext = { tanks: [], colliders: [] };

    weapon.setFire(true);
    weapon.update(0.016, ctx);

    expect(weapon.state).toBe('COOLDOWN');
    expect(deps.audio.shoot).toHaveBeenCalledWith('gauss');
    expect(deps.onShotFired).toHaveBeenCalled();
  });

  it('аркадный выстрел останавливается стеной, не доставая танк за ней', () => {
    const owner = makeTank(1);
    const target = makeTarget(2, 0, 30);
    const wall: Collider = {
      id: 10,
      minX: -5,
      maxX: 5,
      minZ: 10,
      maxZ: 15,
      height: 4,
      blocksShots: true,
      blocksSight: true,
      destructible: false,
      active: true,
      kind: 'wall',
    };
    const deps = makeDeps();
    const weapon = new GaussWeapon(owner, deps);
    const ctx: WeaponContext = { tanks: [target], colliders: [wall] };

    weapon.setFire(true);
    weapon.update(0.016, ctx);

    expect(weapon.state).toBe('COOLDOWN');
    // Урон танку НЕ нанесён, так как стена блокирует выстрел
    expect(deps.damageSystem.applyDamage).not.toHaveBeenCalled();
    expect(deps.effects.explosion).toHaveBeenCalled();
  });

  it('снайперский залп останавливается shot-blocker (билборд без LOS)', () => {
    const owner = makeTank(1);
    owner.position.set(0, 0, 0);
    const target = makeTarget(2, 0, 30);
    const billboard: Collider = {
      id: 11,
      minX: -5,
      maxX: 5,
      minZ: 10,
      maxZ: 15,
      height: 4,
      blocksShots: true,
      blocksSight: false,
      destructible: false,
      active: true,
      kind: 'wall',
    };
    const deps = makeDeps();
    const weapon = new GaussWeapon(owner, deps);
    const ctx: WeaponContext = { tanks: [target], colliders: [billboard] };

    weapon.setFire(true);
    weapon.update(0.016, ctx);
    expect(weapon.state).toBe('LOCKING');
    weapon.update(WEAPON_TUNING.gauss.lockTime + 0.05, ctx);

    expect(weapon.state).toBe('COOLDOWN');
    expect(deps.damageSystem.applyDamage).not.toHaveBeenCalled();
    expect(deps.effects.explosion).toHaveBeenCalled();
  });

  it('разрыв прямой видимости (LOS) стеной срывает захват', () => {
    const owner = makeTank(1);
    owner.position.set(0, 0, 0);
    const target = makeTarget(2, 0, 30);
    const deps = makeDeps();
    const weapon = new GaussWeapon(owner, deps);

    const wall: Collider = {
      id: 1,
      minX: -5,
      maxX: 5,
      minZ: 10,
      maxZ: 15,
      height: 4,
      blocksShots: true,
      blocksSight: true,
      destructible: false,
      active: true,
      kind: 'wall',
    };

    const ctxClear: WeaponContext = { tanks: [target], colliders: [] };
    const ctxBlocked: WeaponContext = { tanks: [target], colliders: [wall] };

    weapon.setFire(true);
    weapon.update(0.016, ctxClear);
    expect(weapon.state).toBe('LOCKING');

    // Стена перекрыла LOS
    weapon.update(0.016, ctxBlocked);
    expect(weapon.state).toBe('IDLE');
    expect(weapon.currentTarget).toBeNull();
  });

  it('смерть цели срывает захват', () => {
    const owner = makeTank(1);
    const target = makeTarget(2, 0, 30);
    const deps = makeDeps();
    const weapon = new GaussWeapon(owner, deps);
    const ctx: WeaponContext = { tanks: [target], colliders: [] };

    weapon.setFire(true);
    weapon.update(0.016, ctx);
    expect(weapon.state).toBe('LOCKING');

    target.alive = false;
    weapon.update(0.016, ctx);
    expect(weapon.state).toBe('IDLE');
    expect(weapon.currentTarget).toBeNull();
  });

  it('по заполнению 100% времени захвата происходит автоматический выстрел и вход в COOLDOWN', () => {
    const owner = makeTank(1, true);
    const target = makeTarget(2, 0, 30);
    const deps = makeDeps();
    const weapon = new GaussWeapon(owner, deps);
    const ctx: WeaponContext = { tanks: [target], colliders: [] };

    weapon.setFire(true);
    weapon.update(0.016, ctx);
    expect(weapon.state).toBe('LOCKING');

    // Заряжаем до 100% (lockTime = 1.15)
    weapon.update(WEAPON_TUNING.gauss.lockTime + 0.05, ctx);

    // Должен был произойти выстрел
    expect(deps.damageSystem.applyDamage).toHaveBeenCalledWith(
      target,
      WEAPON_TUNING.gauss.damage,
      owner,
    );
    expect(deps.audio.shoot).toHaveBeenCalledWith('gauss');
    expect(deps.onShotFired).toHaveBeenCalled();
    expect(weapon.state).toBe('COOLDOWN');
    expect(weapon.getAmmoState().reloading).toBe(true);
    expect(weapon.getAmmoState().ammo).toBe(0);

    // По истечении времени перезарядки возвращается в IDLE
    weapon.update(WEAPON_TUNING.gauss.reloadTime + 0.1, ctx);
    expect(weapon.state).toBe('IDLE');
    expect(weapon.getAmmoState().ammo).toBe(1);
    expect(weapon.getAmmoState().reloading).toBe(false);
  });

  it('C4: снайпер-пад применяется ровно один раз — лок = lockTime/mul, не /mul²', () => {
    const owner = makeTank(1, true);
    owner.reloadSpeedMul = 1.5;
    const target = makeTarget(2, 0, 30);
    const deps = makeDeps();
    const weapon = new GaussWeapon(owner, deps);
    const ctx: WeaponContext = { tanks: [target], colliders: [] };

    weapon.setFire(true);
    weapon.update(0.016, ctx);
    expect(weapon.state).toBe('LOCKING');

    const lockDur = WEAPON_TUNING.gauss.lockTime / 1.5; // = 0.767 с
    const doubleApplied = WEAPON_TUNING.gauss.lockTime / (1.5 * 1.5); // баг: 0.511 с
    // Прогон чуть дальше «багованного» момента — при двойном применении
    // выстрел уже случился бы здесь.
    weapon.update(doubleApplied + 0.05 - 0.016, ctx);
    expect(deps.damageSystem.applyDamage).not.toHaveBeenCalled();
    expect(weapon.state).toBe('LOCKING');

    // И только на корректной длине лока происходит автовыстрел.
    weapon.update(lockDur - doubleApplied - 0.05 + 0.05, ctx);
    expect(deps.damageSystem.applyDamage).toHaveBeenCalledWith(
      target,
      WEAPON_TUNING.gauss.damage,
      owner,
    );
    expect(weapon.state).toBe('COOLDOWN');
  });

  it('getLockTarget возвращает цель только в состоянии LOCKING', () => {
    const owner = makeTank(1);
    const target = makeTarget(2, 0, 30);
    const deps = makeDeps();
    const weapon = new GaussWeapon(owner, deps);
    const ctx: WeaponContext = { tanks: [target], colliders: [] };

    expect(weapon.getLockTarget()).toBeNull();

    weapon.setFire(true);
    weapon.update(0.016, ctx);
    expect(weapon.getLockTarget()).toBe(target);

    weapon.setFire(false);
    expect(weapon.getLockTarget()).toBeNull();
  });

  it('перевод прицела на другого врага мгновенно сбрасывает накопление заряда (не переносится)', () => {
    const owner = makeTank(1);
    owner.position.set(0, 0, 0);
    // Цель 1 чуть в стороне, но попадает в конус
    const target1 = makeTarget(2, 0.4, 30);
    const deps = makeDeps();
    const weapon = new GaussWeapon(owner, deps);

    // Захватываем первую цель
    weapon.setFire(true);
    weapon.update(0.016, { tanks: [target1], colliders: [] });
    expect(weapon.state).toBe('LOCKING');
    expect(weapon.currentTarget).toBe(target1);

    // Накапливаем 50% заряда
    weapon.update(WEAPON_TUNING.gauss.lockTime * 0.5, { tanks: [target1], colliders: [] });
    expect(weapon.getAmmoState().reloadProgress).toBeGreaterThan(0.4);

    // Появляется цель 2 строго по центру прицела (лучший dot)
    const target2 = makeTarget(3, 0, 30);
    weapon.update(0.016, { tanks: [target1, target2], colliders: [] });

    // Захват срывается, накопление сброшено в 0, состояние IDLE
    expect(weapon.state).toBe('IDLE');
    expect(weapon.currentTarget).toBeNull();
    expect(weapon.getAmmoState().reloadProgress).toBe(1); // IDLE full ready state
    expect(deps.audio.stopChargeRailgun).toHaveBeenCalled();
  });

  it('увод прицела за пределы узкого конуса (~4.3°) срывает захват', () => {
    const owner = makeTank(1);
    owner.position.set(0, 0, 0);
    const target = makeTarget(2, 0, 30);
    const deps = makeDeps();
    const weapon = new GaussWeapon(owner, deps);

    weapon.setFire(true);
    weapon.update(0.016, { tanks: [target], colliders: [] });
    expect(weapon.state).toBe('LOCKING');

    // Цель сместилась за пределы конуса (x=5 при z=30 даёт угол ~9.5°, конус ~4.3°)
    target.position.set(5, 0, 30);
    weapon.update(0.016, { tanks: [target], colliders: [] });

    expect(weapon.state).toBe('IDLE');
    expect(weapon.currentTarget).toBeNull();
  });
});
