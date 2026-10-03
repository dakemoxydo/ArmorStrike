// ===== «Огнемёт Firebird»: DPS не зависит от частоты кадров =====
// Регресс на одиночное вычитание в аккумуляторе тиков
// (`if (tickTimer >= tickRate)`): максимум ОДИН тик урона за кадр, поэтому при
// крупном dt ( hitch, catch-up-шаг, тестовая обёртка) накопленный урон терялся,
// и dps = damagePerTick / tickRate плыл вместе с fps. Теперь catch-up `while`
// (как у «Изиды», IsidaWeapon.ts:157-161).
import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { FlamethrowerWeapon } from '../game/weapons/FlamethrowerWeapon';
import { TankEntity } from '../game/Tank';
import type { TankVisual } from '../game/Tank';
import { LightRig } from '../game/effects/LightRig';
import type { CombatPeer, WeaponContext, WeaponDeps } from '../game/weapons/types';
import { WEAPON_TUNING } from '../core/catalog';

const tune = WEAPON_TUNING.flamethrower;

function makeVisual(): TankVisual {
  const group = new THREE.Group();
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 1, 2);
  group.add(muzzle);
  return {
    group,
    hull: new THREE.Group(),
    turret: new THREE.Group(),
    barrelGroup: new THREE.Group(),
    muzzle,
    ring: new THREE.Mesh(),
    bodyMats: [],
    bodyBaseColors: [],
    trackTex: null as unknown as THREE.CanvasTexture,
  };
}

const PARAMS = {
  maxHealth: 200,
  speed: 12,
  reverseSpeed: 8,
  turnSpeed: 2.4,
  turretSpeed: tune.coneAngle > 0 ? 8.5 : 0,
  damage: tune.damagePerTick,
  shotCooldown: 0,
  weaponType: 'flamethrower' as const,
  range: tune.range,
};

function makeOwner(): TankEntity {
  const t = new TankEntity('T', true, PARAMS, makeVisual());
  t.id = 1;
  return t;
}

/** Мусор в конусе пламени: по курсу ствола (+Z), в пределах range. */
function makeTarget(id: number): CombatPeer {
  return {
    id,
    name: `T${id}`,
    isPlayer: false,
    alive: true,
    health: 100000,
    radius: 1.8,
    knockback: new THREE.Vector3(),
    position: new THREE.Vector3(0, 0, 8),
    yaw: 0,
    teamId: null,
    takeDamage: vi.fn(),
    visual: { group: new THREE.Group() },
  } as unknown as CombatPeer;
}

/** Мок damageSystem: суммируем реально нанесённый урон по тикам. */
function makeDeps() {
  let totalDamage = 0;
  const damageSystem = {
    applyDamage: vi.fn((_target: unknown, dmg: number) => {
      totalDamage += dmg;
    }),
    applyKnockback: vi.fn(),
  };
  const deps = {
    scene: new THREE.Scene(),
    effects: {
      muzzle: vi.fn(),
      impact: vi.fn(),
      explosion: vi.fn(),
      addShake: vi.fn(),
      spawnSmoke: vi.fn(),
    } as any,
    audio: { startFlameLoop: vi.fn(), stopFlameLoop: vi.fn() } as any,
    damageSystem,
    projectiles: {} as any,
    lights: new LightRig(new THREE.Scene()),
  } as unknown as WeaponDeps;
  return { deps, damageSystem, damage: () => totalDamage, resets: () => { totalDamage = 0; } };
}

/** Прогоняетweapon.update с шагом 1/fps и возвращает суммарный урон. */
function burn(fps: number, simSeconds: number) {
  const owner = makeOwner();
  const { deps, damage } = makeDeps();
  const weapon = new FlamethrowerWeapon(owner, deps);
  const target = makeTarget(2);
  const ctx: WeaponContext = { tanks: [owner, target], colliders: [] };
  weapon.setFire(true);
  const dt = 1 / fps;
  const frames = Math.floor(simSeconds * fps);
  for (let i = 0; i < frames; i++) weapon.update(dt, ctx);
  return { damage: damage(), ticks: frames };
}

describe('FlamethrowerWeapon — dps не зависит от fps', () => {
  it('одинаковый суммарный урон за одинаковое игровое время на 30 / 60 / 144 fps', () => {
    // 2.55 с симуляции: 25 тиков по 0.1 с. Время специально НЕ кратно tickRate —
    // иначе результат зависел бы от накопления float-ошибки на границе тика.
    const at30 = burn(30, 2.55);
    const at60 = burn(60, 2.55);
    const at144 = burn(144, 2.55);

    expect(at60.damage).toBe(at30.damage);
    expect(at144.damage).toBe(at30.damage);
    // 25 тиков × 5.2 = 130
    expect(at30.damage).toBeCloseTo(25 * tune.damagePerTick, 6);
  });

  it('dps сходится с номиналом damagePerTick / tickRate', () => {
    const { damage } = burn(60, 3.0 + 0.01);
    const nominal = tune.damagePerTick / tune.tickRate;
    expect(damage / 3.0).toBeGreaterThan(nominal * 0.95);
    expect(damage / 3.0).toBeLessThan(nominal * 1.05);
  });

  it('hitch-кадр (dt ≥ 2 × tickRate) наносит все накопленные тики, а не один', () => {
    const owner = makeOwner();
    const { deps, damage, damageSystem } = makeDeps();
    const weapon = new FlamethrowerWeapon(owner, deps);
    const target = makeTarget(2);
    const ctx: WeaponContext = { tanks: [owner, target], colliders: [] };
    weapon.setFire(true);

    weapon.update(0.5, ctx);

    // Один кадр = 0.5 с = 5 тиков. Старый `if` успевал только за один.
    expect(damageSystem.applyDamage).toHaveBeenCalledTimes(5);
    expect(damage()).toBeCloseTo(5 * tune.damagePerTick, 6);
  });

  it('dt = 0 не наносит урон', () => {
    const owner = makeOwner();
    const { deps, damageSystem } = makeDeps();
    const weapon = new FlamethrowerWeapon(owner, deps);
    const target = makeTarget(2);
    weapon.setFire(true);
    weapon.update(0, { tanks: [owner, target], colliders: [] });
    expect(damageSystem.applyDamage).not.toHaveBeenCalled();
  });

  it('после отпускания спуска аккумулятор обнуляется (тиков-«хвостов» нет)', () => {
    const owner = makeOwner();
    const { deps, damageSystem } = makeDeps();
    const weapon = new FlamethrowerWeapon(owner, deps);
    const target = makeTarget(2);
    const ctx: WeaponContext = { tanks: [owner, target], colliders: [] };
    weapon.setFire(true);
    weapon.update(0.09, ctx);
    expect(damageSystem.applyDamage).not.toHaveBeenCalled();

    weapon.setFire(false);
    weapon.update(0.05, ctx);
    weapon.setFire(true);
    weapon.update(0.05, ctx);
    // Накопленное до отпускания (0.09 с) не «выстрелило» разом при новом нажатии.
    expect(damageSystem.applyDamage).not.toHaveBeenCalled();
  });
});