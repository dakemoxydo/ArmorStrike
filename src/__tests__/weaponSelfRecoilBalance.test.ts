// ===== Самоотдача оружий, баланс режимов «Гаусса», гейт playerNear =====
// 1) `Tank.onFired(recoil)` — импульс САМОМУ стрелку (сдвиг = значение /
//    KNOCKBACK_DECAY = 5.5). Оружия передавали туда константу knockback ИЗ
//    УРОНА: рельса 18 → 3.27 м за выстрел, снайпер-бот вылетал из полосы.
//    Теперь у рельсы и гаусса отдельные `selfRecoil` / `selfRecoilBot`.
// 2) DPS снайперского режима гаусса строго выше аркадного (иначе «тап-спам»
//    без захвата выгоднее заголовочного режима).
// 3) `playerNear` = «есть ли ХОТЯ БЫ ОДИН игрок в радиусе» независимо от
//    порядка игроков в ростере.
import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { RailgunWeapon } from '../game/weapons/RailgunWeapon';
import { GaussWeapon } from '../game/weapons/GaussWeapon';
import { CannonWeapon } from '../game/weapons/CannonWeapon';
import { TankEntity } from '../game/Tank';
import type { TankVisual } from '../game/Tank';
import { LightRig } from '../game/effects/LightRig';
import { WEAPON_TUNING } from '../core/catalog';
import { KNOCKBACK_DECAY } from '../game/tuning';
import type { CombatPeer, WeaponContext, WeaponDeps, WeaponOwner } from '../game/weapons/types';

const rt = WEAPON_TUNING.railgun;
const gt = WEAPON_TUNING.gauss;
const ct = WEAPON_TUNING.cannon;

/** Сдвиг корпуса от одного импульса отдачи (интеграл exp-затухания). */
function pushDistance(recoil: number): number {
  return recoil / KNOCKBACK_DECAY;
}

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

function makePeer(id: number, opts: { x?: number; z?: number; isPlayer?: boolean; alive?: boolean } = {}): CombatPeer {
  return {
    id,
    name: `P${id}`,
    isPlayer: opts.isPlayer ?? false,
    alive: opts.alive ?? true,
    health: 100,
    radius: 1.8,
    knockback: new THREE.Vector3(),
    position: new THREE.Vector3(opts.x ?? 0, 0, opts.z ?? 40),
    yaw: 0,
    teamId: null,
    takeDamage: vi.fn(),
    visual: { group: new THREE.Group() },
  } as unknown as CombatPeer;
}

function makeWeaponDeps() {
  const audio = {
    shoot: vi.fn(),
    chargeRailgun: vi.fn(() => ({ id: 1 })),
    stopChargeRailgun: vi.fn(),
    setChargeRailgunPitch: vi.fn(),
    railgunPierce: vi.fn(),
    startFlameLoop: vi.fn(),
    stopFlameLoop: vi.fn(),
  };
  const effects = {
    muzzle: vi.fn(),
    impact: vi.fn(),
    explosion: vi.fn(),
    railgunMuzzle: vi.fn(),
    railgunImpact: vi.fn(),
    trailPuff: vi.fn(),
    debris: vi.fn(),
    boostJet: vi.fn(),
    addShake: vi.fn(),
    addFovPunch: vi.fn(),
    setFovTighten: vi.fn(),
    spawnSmoke: vi.fn(),
  };
  const damageSystem = {
    applyDamage: vi.fn(),
    applyKnockback: vi.fn(),
    damageBlock: vi.fn(),
  };
  const deps = {
    scene: new THREE.Scene(),
    lights: new LightRig(new THREE.Scene()),
    audio,
    effects,
    damageSystem,
    projectiles: { fire: vi.fn(() => true) },
    onShotFired: vi.fn(),
  } as unknown as WeaponDeps;
  return { deps, audio, effects, damageSystem };
}

/** Стрелок-рельса на моке: нужен только для RailgunWeapon.executeFiring. */
function makeRailgunOwner(isPlayer: boolean, onFired: (v: number) => void): WeaponOwner {
  const group = new THREE.Group();
  const barrelGroup = new THREE.Group();
  group.add(barrelGroup);
  const muzzle = new THREE.Object3D();
  barrelGroup.add(muzzle);
  return {
    id: 1,
    teamId: null,
    isPlayer,
    alive: true,
    isRemote: false,
    fireTimer: 0,
    position: new THREE.Vector3(),
    params: { damage: rt.damage, range: rt.range },
    visual: { group, barrelGroup, muzzle },
    muzzleWorld: (out: THREE.Vector3) => out.set(0, 1.6, 0),
    aimDir: (out: THREE.Vector3) => out.set(0, 0, 1),
    onFired,
    setBarrelKick: vi.fn(),
  } as unknown as WeaponOwner;
}

describe('Самоотдача (selfRecoil) — импульс стрелку ≠ knockback по цели', () => {
  it('рельса: onFired получает selfRecoil, а не knockback 18', () => {
    const seen: number[] = [];
    const owner = makeRailgunOwner(true, (v) => seen.push(v));
    const { deps } = makeWeaponDeps();
    const w = new RailgunWeapon(owner, deps);
    const ctx: WeaponContext = { tanks: [], colliders: [] };
    w.setFire(true);
    let guard = 0;
    while (w.state === 'CHARGING' && guard++ < 40) w.update(0.1, ctx);

    expect(w.state).toBe('COOLDOWN');
    expect(seen).toHaveLength(1);
    expect(seen[0]).toBe(rt.selfRecoil);
    expect(seen[0]).not.toBe(rt.knockback);
    // Сдвиг стрелка — сопоставим с пушкой, а не 3.27 м
    expect(pushDistance(seen[0])).toBeLessThanOrEqual(0.6);
    expect(pushDistance(seen[0])).toBeGreaterThanOrEqual(0.3);
    // knockback как самоотдача = 3.27 м — регресс, который поймал бы этот тест
    expect(pushDistance(rt.knockback)).toBeGreaterThan(3);
  });

  it('рельса: у бота самоотдача ещё меньше', () => {
    const seen: number[] = [];
    const owner = makeRailgunOwner(false, (v) => seen.push(v));
    const { deps } = makeWeaponDeps();
    const w = new RailgunWeapon(owner, deps);
    const ctx: WeaponContext = { tanks: [], colliders: [] };
    w.setFire(true);
    let guard = 0;
    while (w.state === 'CHARGING' && guard++ < 40) w.update(0.1, ctx);

    expect(seen[0]).toBe(rt.selfRecoilBot);
    expect(rt.selfRecoilBot).toBeLessThan(rt.selfRecoil);
    expect(pushDistance(rt.selfRecoilBot)).toBeLessThanOrEqual(0.4);
  });

  function gaussHarness(isPlayer: boolean) {
    const visual = makeVisual();
    const owner = new TankEntity('G', isPlayer, {
      maxHealth: 200, speed: 12, reverseSpeed: 8, turnSpeed: 2.4,
      turretSpeed: 6.5, damage: gt.damage, shotCooldown: 0,
      weaponType: 'gauss' as const, range: gt.range,
    }, visual);
    owner.id = 1;
    const onFired = vi.spyOn(owner, 'onFired');
    const { deps, effects } = makeWeaponDeps();
    const weapon = new GaussWeapon(owner, deps);
    return { owner, weapon, onFired, effects };
  }

  it('гаусс: снайперский залп шлёт в onFired selfRecoil, а не knockback 16', () => {
    const { weapon, onFired } = gaussHarness(true);
    const target = makePeer(2, { x: 0, z: 30 });
    const ctx: WeaponContext = { tanks: [target], colliders: [] };

    weapon.setFire(true);
    weapon.update(0.016, ctx);
    expect(weapon.state).toBe('LOCKING');
    weapon.update(gt.lockTime + 0.05, ctx);

    expect(onFired).toHaveBeenCalledTimes(1);
    expect(onFired.mock.calls[0][0]).toBe(gt.selfRecoil);
    expect(onFired.mock.calls[0][0]).not.toBe(gt.knockback);
    expect(pushDistance(gt.selfRecoil)).toBeLessThanOrEqual(0.6);
    expect(pushDistance(gt.selfRecoil)).toBeGreaterThanOrEqual(0.3);
    expect(pushDistance(gt.knockback)).toBeGreaterThan(2.5);
  });

  it('гаусс: аркадный выстрел шлёт arcadeSelfRecoil (не arcadeKnockback 6)', () => {
    const { weapon, onFired } = gaussHarness(true);
    // Пустой ростер → клик = мгновенная аркада (снайперская ветка не ищет цель).
    weapon.setFire(true);
    weapon.update(0.016, { tanks: [], colliders: [] });

    expect(weapon.state).toBe('COOLDOWN');
    expect(onFired).toHaveBeenCalledTimes(1);
    expect(onFired.mock.calls[0][0]).toBe(gt.arcadeSelfRecoil);
    expect(onFired.mock.calls[0][0]).not.toBe(gt.arcadeKnockback);
    expect(gt.arcadeSelfRecoil).toBeLessThan(gt.selfRecoil);
    expect(pushDistance(gt.arcadeSelfRecoil)).toBeLessThan(pushDistance(gt.selfRecoil));
  });

  it('гаусс: у бота самоотдаца обоих режимов меньше, чем у игрока', () => {
    expect(gt.selfRecoilBot).toBeLessThan(gt.selfRecoil);
    expect(gt.arcadeSelfRecoilBot).toBeLessThan(gt.arcadeSelfRecoil);
    const bot = gaussHarness(false);
    bot.weapon.setFire(true);
    bot.weapon.update(0.016, { tanks: [], colliders: [] });
    expect(bot.onFired.mock.calls[0][0]).toBe(gt.arcadeSelfRecoilBot);
  });
});

describe('«Гаусс»: снайперский режим выгоднее аркадного по DPS', () => {
  const sniperCycle = gt.lockTime + gt.reloadTime;
  const arcadeCycle = gt.arcadeReloadTime;
  const sniperDps = gt.damage / sniperCycle;
  const arcadeDps = gt.arcadeDamage / arcadeCycle;

  it('инвариант: dps снайпера строго выше dps аркады', () => {
    expect(sniperDps).toBeGreaterThan(arcadeDps);
    // Конкретные числа каталога: 65/3.5 = 18.57 против 30/2.1 = 14.29
    expect(sniperDps).toBeCloseTo(65 / 3.5, 6);
    expect(arcadeDps).toBeCloseTo(30 / 2.1, 6);
    expect(sniperDps / arcadeDps).toBeGreaterThan(1.1);
  });

  it('старый баланс (arcadeReloadTime 1.05) ломал инвариант — регресс-маркер', () => {
    expect(gt.arcadeDamage / 1.05).toBeGreaterThan(sniperDps);
  });

  it('снайпер выигрывает и по дальности, и по knockback, и по альфе', () => {
    expect(gt.range).toBeGreaterThan(gt.arcadeRange);
    expect(gt.knockback).toBeGreaterThan(gt.arcadeKnockback);
    expect(gt.damage).toBeGreaterThan(gt.arcadeDamage * 2);
    // dps на метр: снайпер не хуже аркады (аркада — «спам» у ближней границы)
    expect(sniperDps / gt.range).toBeGreaterThan(arcadeDps / gt.arcadeRange);
  });

  it('аркадный cooldown действительно применяется в COOLDOWN', () => {
    const visual = makeVisual();
    const owner = new TankEntity('G', true, {
      maxHealth: 200, speed: 12, reverseSpeed: 8, turnSpeed: 2.4,
      turretSpeed: 6.5, damage: gt.damage, shotCooldown: 0,
      weaponType: 'gauss' as const, range: gt.range,
    }, visual);
    owner.id = 1;
    const { deps } = makeWeaponDeps();
    const weapon = new GaussWeapon(owner, deps);
    weapon.setFire(true);
    weapon.update(0.016, { tanks: [], colliders: [] });
    expect(weapon.state).toBe('COOLDOWN');
    expect(weapon.getAmmoState().reloading).toBe(true);

    weapon.update(arcadeCycle - 0.05, { tanks: [], colliders: [] });
    expect(weapon.state).toBe('COOLDOWN');
    weapon.update(0.1, { tanks: [], colliders: [] });
    expect(weapon.state).toBe('IDLE');
  });
});

describe('playerNear — есть ли ХОТЯ БЫ ОДИН игрок рядом (порядок в ростере не важен)', () => {
  function cannonTank(isPlayer: boolean): TankEntity {
    const t = new TankEntity('C', isPlayer, {
      maxHealth: 100, speed: 15, reverseSpeed: 9, turnSpeed: 2.9,
      turretSpeed: 8, damage: ct.damage, shotCooldown: ct.shotCooldown,
      weaponType: 'cannon' as const, range: ct.range,
    }, makeVisual());
    t.id = 1;
    return t;
  }

  it('пушка: бот трясёт камеру, даже если ДРУГОЙ игрок стоит дальше радиуса', () => {
    const bot = cannonTank(false);
    bot.position.set(0, 0, 0);
    const farPlayer = makePeer(2, { x: 0, z: ct.fireShakeBotRange + 30, isPlayer: true });
    const nearPlayer = makePeer(3, { x: 0, z: ct.fireShakeBotRange - 5, isPlayer: true });
    const { deps, effects } = makeWeaponDeps();
    const weapon = new CannonWeapon(bot, deps);

    // Дальний игрок в ростере ПЕРВЫМ — старый код возвращался по нему и гасил тряску.
    weapon.update(0.016, { tanks: [bot, farPlayer, nearPlayer], colliders: [] });
    bot.fireTimer = 0;
    weapon.setFire(true);

    expect(effects.addShake).toHaveBeenCalledWith(ct.fireShakeBot);
  });

  it('пушка: дальние игроки (все дальше радиуса) — тишина', () => {
    const bot = cannonTank(false);
    bot.position.set(0, 0, 0);
    const farA = makePeer(2, { x: 0, z: ct.fireShakeBotRange + 30, isPlayer: true });
    const farB = makePeer(3, { x: 0, z: ct.fireShakeBotRange + 60, isPlayer: true });
    const { deps, effects } = makeWeaponDeps();
    const weapon = new CannonWeapon(bot, deps);

    weapon.update(0.016, { tanks: [bot, farA, farB], colliders: [] });
    bot.fireTimer = 0;
    weapon.setFire(true);

    expect(effects.addShake).not.toHaveBeenCalled();
  });

  it('пушка: мёртвый игрок в радиусе не считается «рядом»', () => {
    const bot = cannonTank(false);
    bot.position.set(0, 0, 0);
    const deadNear = makePeer(2, { x: 0, z: 1, isPlayer: true, alive: false });
    const { deps, effects } = makeWeaponDeps();
    const weapon = new CannonWeapon(bot, deps);

    weapon.update(0.016, { tanks: [bot, deadNear], colliders: [] });
    bot.fireTimer = 0;
    weapon.setFire(true);

    expect(effects.addShake).not.toHaveBeenCalled();
  });

  it('рельса: бот трясёт камеру, если близкий игрок в ростере НЕ первый', () => {
    const seen: number[] = [];
    const owner = makeRailgunOwner(false, (v) => seen.push(v));
    const farPlayer = makePeer(2, { x: 0, z: rt.fireShakeBotRange + 30, isPlayer: true });
    const nearPlayer = makePeer(3, { x: 0, z: rt.fireShakeBotRange - 5, isPlayer: true });
    const { deps, effects } = makeWeaponDeps();
    const w = new RailgunWeapon(owner, deps);
    const ctx: WeaponContext = { tanks: [farPlayer, nearPlayer], colliders: [] };

    w.setFire(true);
    let guard = 0;
    while (w.state === 'CHARGING' && guard++ < 40) w.update(0.1, ctx);

    expect(w.state).toBe('COOLDOWN');
    expect(effects.addShake).toHaveBeenCalledWith(rt.fireShakeBot);
  });

  it('рельса: только дальние игроки — тишина', () => {
    const seen: number[] = [];
    const owner = makeRailgunOwner(false, (v) => seen.push(v));
    const farPlayer = makePeer(2, { x: 0, z: rt.fireShakeBotRange + 30, isPlayer: true });
    const { deps, effects } = makeWeaponDeps();
    const w = new RailgunWeapon(owner, deps);
    const ctx: WeaponContext = { tanks: [farPlayer], colliders: [] };

    w.setFire(true);
    let guard = 0;
    while (w.state === 'CHARGING' && guard++ < 40) w.update(0.1, ctx);

    expect(effects.addShake).not.toHaveBeenCalled();
  });
});