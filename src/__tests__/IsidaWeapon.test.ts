// ===== «Изида»: FSM луча — режимы, тики, вампиризм, ремонт, баллон =====
// Кадрирование: шаг 0.1 с. Захват (0.3 с) занимает f1..f3 (acquireT уменьшается
// ПОСЛЕ вычисления mode), f4 уже 'attack'; первый тик — на f5 (t≈0.5 с).
import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { IsidaWeapon } from '../game/weapons/IsidaWeapon';
import { TankEntity } from '../game/Tank';
import type { TankVisual } from '../game/Tank';
import { LightRig } from '../game/effects/LightRig';
import { createDamageSystem } from '../core/DamageSystem';
import type { Collider } from '../game/engine/physics';
import type { CombatPeer, WeaponContext, WeaponDeps } from '../game/weapons/types';
import { WEAPON_TUNING, TURRETS } from '../core/catalog';
import { SCORE } from '../game/constants';

const tune = WEAPON_TUNING.isida;
const TICK_DMG = Math.round(tune.damagePerSec * tune.tickRate); // = TURRETS.isida.damage
const HEAL_PER_TICK = tune.healPerSec * tune.tickRate;

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
  maxHealth: 100,
  speed: 15,
  reverseSpeed: 9,
  turnSpeed: 2.9,
  turretSpeed: 10,
  damage: TURRETS.isida.damage,
  shotCooldown: 0,
  weaponType: 'isida' as const,
  range: tune.range,
};

function makeOwner(id = 1, isPlayer = true): TankEntity {
  const t = new TankEntity(`T${id}`, isPlayer, PARAMS, makeVisual());
  t.id = id;
  return t;
}

interface PeerOpts {
  teamId?: string | null;
  health?: number;
  maxHealth?: number;
  alive?: boolean;
  invulnT?: number;
  fx?: { healFlash: number };
}

function makeTarget(id: number, x: number, z: number, over: PeerOpts = {}): CombatPeer {
  const p: any = {
    id,
    name: `P${id}`,
    isPlayer: false,
    alive: over.alive ?? true,
    health: over.health ?? 100,
    maxHealth: over.maxHealth ?? 100,
    radius: 1.5,
    knockback: new THREE.Vector3(),
    position: new THREE.Vector3(x, 0, z),
    yaw: 0,
    teamId: over.teamId ?? null,
    invulnT: over.invulnT ?? 0,
    fx: over.fx,
    visual: { group: new THREE.Group() },
  };
  // Как реальный танк (TankEntity.takeDamage): урон клампится в 0 со смертью —
  // иначе избыток добивающего тика уходил бы в минус и ломал учёт «снятых HP».
  p.takeDamage = vi.fn((d: number) => {
    if (!p.alive || d <= 0) return;
    p.health -= d;
    if (p.health <= 0) {
      p.health = 0;
      p.alive = false;
    }
  });
  return p as CombatPeer;
}

function makeDeps() {
  const hooks = { onTankDamaged: vi.fn(), onBlockDestroyed: vi.fn() };
  const onSupportScore = vi.fn();
  const deps: WeaponDeps = {
    scene: new THREE.Scene(),
    effects: {
      muzzle: vi.fn(),
      impact: vi.fn(),
      trailPuff: vi.fn(),
      spawnSmoke: vi.fn(),
      explosion: vi.fn(),
      addShake: vi.fn(),
    } as any,
    audio: {} as any,
    damageSystem: createDamageSystem({ damageBlock: () => null }, hooks),
    projectiles: {} as any,
    lights: new LightRig(new THREE.Scene()),
    onSupportScore,
  };
  return { deps, hooks, onSupportScore };
}

function ctx(tanks: CombatPeer[], colliders: Collider[] = []): WeaponContext {
  return { tanks, colliders };
}

/** Прогон N кадров по 0.1 с. */
function run(weapon: IsidaWeapon, c: WeaponContext, frames: number): void {
  for (let i = 0; i < frames; i++) weapon.update(0.1, c);
}

describe('IsidaWeapon — баллон и режимы без цели', () => {
  it('в покое: энергия полная, beamMode none, ammo = magazine', () => {
    const { deps } = makeDeps();
    const weapon = new IsidaWeapon(makeOwner(), deps);
    const ammo = weapon.getAmmoState();
    expect(ammo.ammo).toBe(tune.energyMax);
    expect(ammo.magazine).toBe(tune.energyMax);
    expect(weapon.getBeamMode()).toBe('none');
    weapon.dispose();
  });

  it('спуск без цели — idle с холостым расходом; отпускание — regen с потолком', () => {
    const { deps } = makeDeps();
    const weapon = new IsidaWeapon(makeOwner(), deps);
    const c = ctx([]);
    weapon.setFire(true);
    run(weapon, c, 5);
    expect(weapon.getBeamMode()).toBe('idle');
    expect(weapon.energy).toBeCloseTo(tune.energyMax - tune.drainIdle * 0.5, 4);
    // Отпущен: regen 24 у.е./с — кадр 0.1 с добавляет 2.4 очка...
    weapon.setFire(false);
    run(weapon, c, 1);
    expect(weapon.getBeamMode()).toBe('none');
    expect(weapon.energy).toBeCloseTo(tune.energyMax - tune.drainIdle * 0.5 + tune.rechargeRate * 0.1, 4);
    // ...и на полном баллоне упирается в потолок, а не переливается.
    run(weapon, c, 40);
    expect(weapon.energy).toBe(tune.energyMax);
    weapon.dispose();
  });

  it('баллон ниже порога старта (>5): кадр в none, затем regen зажигает луч', () => {
    const { deps } = makeDeps();
    const weapon = new IsidaWeapon(makeOwner(), deps);
    weapon.energy = 4;
    const c = ctx([]);
    weapon.setFire(true);
    weapon.update(0.1, c); // гейт порога проверяется ДО регена кадра
    expect(weapon.getBeamMode()).toBe('none');
    expect(weapon.getAmmoState().reloading).toBe(true); // энергия < 10
    // 6.4 у.е. после первого кадра > 5 → на втором спуск зажигается: баллон копится всегда.
    run(weapon, c, 1);
    expect(weapon.getBeamMode()).toBe('idle');
    weapon.energy = 50;
    run(weapon, c, 1);
    expect(weapon.getBeamMode()).toBe('idle');
    weapon.dispose();
  });
});

describe('IsidaWeapon — атака: захват, тики, вампиризм', () => {
  it('враг в конусе: f1 acquire → f4 attack (перестроение 0.3 с)', () => {
    const { deps } = makeDeps();
    const weapon = new IsidaWeapon(makeOwner(), deps);
    const enemy = makeTarget(2, 0, 10);
    const c = ctx([enemy]);
    weapon.setFire(true);
    weapon.update(0.1, c);
    expect(weapon.getBeamMode()).toBe('acquire');
    run(weapon, c, 3); // f2..f4
    expect(weapon.getBeamMode()).toBe('attack');
    weapon.dispose();
  });

  it('тики: кратно тиковому урону; вампиризм 35% возвращается стрелку', () => {
    const { deps, hooks } = makeDeps();
    const owner = makeOwner();
    owner.health = 30;
    const weapon = new IsidaWeapon(owner, deps);
    const enemy = makeTarget(2, 0, 10, { health: 1000, maxHealth: 1000 });
    const c = ctx([enemy]);
    weapon.setFire(true);
    run(weapon, c, 30); // 3 с: ~10 тиков, энергия 100−90 > 0
    expect(hooks.onTankDamaged).toHaveBeenCalled();
    const ticks = (1000 - enemy.health) / TICK_DMG;
    expect(ticks).toBeGreaterThanOrEqual(8);
    expect(Number.isInteger(ticks)).toBe(true);
    expect(owner.health).toBeCloseTo(30 + ticks * TICK_DMG * tune.vampirism, 4);
    weapon.dispose();
  });

  it('C8: вампиризм от фактического урона — добивающий тик не «пере-лечит»', () => {
    const { deps } = makeDeps();
    const owner = makeOwner();
    owner.health = 50;
    const weapon = new IsidaWeapon(owner, deps);
    // 1 HP цели против тикового TICK_DMG: снимутся ровно 1 HP → возврат 1×vampirism.
    // Кап — ПОСЛЕ DamageSystem (полный dmg в applyHit, возврат от снятых HP).
    const enemy = makeTarget(2, 0, 10, { health: 1, maxHealth: 1 });
    const c = ctx([enemy]);
    weapon.setFire(true);
    run(weapon, c, 8);
    expect(enemy.health).toBe(0);
    expect(enemy.alive).toBe(false);
    expect(owner.health).toBeCloseTo(50 + 1 * tune.vampirism, 6);
    weapon.dispose();
  });

  it('C8-пин: кап после резистов — избыток сверх остатка HP не лечит', () => {
    const { deps } = makeDeps();
    const owner = makeOwner();
    (owner.params as any).damageType = 'nano';
    owner.health = 50;
    const weapon = new IsidaWeapon(owner, deps);
    // Цель 5 HP с поглощением nano 0.5: тик 11 → dealt 5.5, снимутся 5 HP.
    // Возврат обязан быть 5×vampirism, а не 11× и не 5.5× (до-кап давал меньше).
    const enemy = makeTarget(2, 0, 10, { health: 5, maxHealth: 100 });
    (enemy as any).damageResist = { nano: 0.5 };
    const c = ctx([enemy]);
    weapon.setFire(true);
    run(weapon, c, 8);
    expect(enemy.health).toBe(0);
    expect(owner.health).toBeCloseTo(50 + 5 * tune.vampirism, 6);
    weapon.dispose();
  });

  it('неуязвимая цель: ни урона, ни вампиризма, но луч цель держит', () => {
    const { deps, hooks } = makeDeps();
    const owner = makeOwner();
    owner.health = 50;
    const weapon = new IsidaWeapon(owner, deps);
    const enemy = makeTarget(2, 0, 10, { invulnT: 5 });
    const c = ctx([enemy]);
    weapon.setFire(true);
    run(weapon, c, 20);
    expect(hooks.onTankDamaged).not.toHaveBeenCalled();
    expect(enemy.health).toBe(100);
    expect(owner.health).toBe(50);
    expect(weapon.getBeamMode()).toBe('attack');
    weapon.dispose();
  });

  it('смерть цели снимает лок → idle', () => {
    const { deps } = makeDeps();
    const weapon = new IsidaWeapon(makeOwner(), deps);
    const enemy = makeTarget(2, 0, 10);
    const c = ctx([enemy]);
    weapon.setFire(true);
    run(weapon, c, 10);
    expect(weapon.getBeamMode()).toBe('attack');
    enemy.alive = false;
    weapon.update(0.1, c);
    expect(weapon.getBeamMode()).toBe('idle');
    weapon.dispose();
  });

  it('стена рвёт луч (LOS и у стики, и у захвата)', () => {
    const { deps } = makeDeps();
    const weapon = new IsidaWeapon(makeOwner(), deps);
    const enemy = makeTarget(2, 0, 10);
    const blocker: Collider = {
      id: 7, minX: -4, maxX: 4, minZ: 5, maxZ: 6,
      height: 4, blocksShots: true, blocksSight: true, destructible: false, active: true, kind: 'wall',
    };
    weapon.setFire(true);
    run(weapon, ctx([enemy]), 10);
    expect(weapon.getBeamMode()).toBe('attack');
    run(weapon, ctx([enemy], [blocker]), 1);
    expect(weapon.getBeamMode()).toBe('idle');
    weapon.dispose();
  });

  it('союзник в конусе НЕ приоритетнее врага (attack, не heal)', () => {
    const { deps, hooks } = makeDeps();
    const owner = makeOwner();
    owner.teamId = 'alpha';
    const weapon = new IsidaWeapon(owner, deps);
    const ally = makeTarget(3, 0, 8, { teamId: 'alpha', health: 40 });
    const enemy = makeTarget(4, 0, 12, { teamId: 'bravo' });
    const c = ctx([ally, enemy]);
    weapon.setFire(true);
    run(weapon, c, 10);
    expect(weapon.getBeamMode()).toBe('attack');
    expect(ally.health).toBe(40); // не лечился
    expect(hooks.onTankDamaged).toHaveBeenCalled();
    weapon.dispose();
  });
});

describe('IsidaWeapon — ремонт союзника и очки поддержки', () => {
  it('TDM: без врагов лечит союзника (кратно healPerTick) и вешает healFlash', () => {
    // Лечение критует из pity-накопителя башни (rollCrit ← Math.random):
    // без фиксации RNG тест флакает (~17% прогонов). Глушим криты.
    const rng = vi.spyOn(Math, 'random').mockReturnValue(0.999);
    const { deps } = makeDeps();
    const owner = makeOwner();
    owner.teamId = 'alpha';
    const weapon = new IsidaWeapon(owner, deps);
    const ally = makeTarget(3, 0, 9, { teamId: 'alpha', health: 40, fx: { healFlash: 0 } });
    weapon.setFire(true);
    run(weapon, ctx([ally]), 14); // 1.4 с → 4 тика лечения
    expect(weapon.getBeamMode()).toBe('heal');
    const healed = ally.health - 40;
    expect(healed).toBeGreaterThan(0);
    expect(healed / HEAL_PER_TICK).toBeCloseTo(Math.round(healed / HEAL_PER_TICK), 6);
    expect((ally as any).fx.healFlash).toBe(1);
    weapon.dispose();
    rng.mockRestore();
  });

  it('очки поддержки игроку: floor(фактическое лечение × supportPerHp)', () => {
    const { deps, onSupportScore } = makeDeps();
    const owner = makeOwner();
    owner.teamId = 'alpha';
    const weapon = new IsidaWeapon(owner, deps);
    const ally = makeTarget(3, 0, 9, { teamId: 'alpha', health: 40 });
    weapon.setFire(true);
    run(weapon, ctx([ally]), 14);
    const total = onSupportScore.mock.calls.reduce((s: number, c: number[]) => s + c[0], 0);
    const healed = ally.health - 40;
    expect(healed).toBeGreaterThan(0);
    expect(total).toBeGreaterThan(0);
    // Дробный carry: сумма очков = floor от накопленного лечения (±float-шум).
    expect(Math.abs(total - healed * SCORE.supportPerHp)).toBeLessThan(1);
    weapon.dispose();
  });

  it('бот-владелец очков не получает; долеченный союзник отпускается', () => {
    const { deps, onSupportScore } = makeDeps();
    const owner = makeOwner(2, false);
    owner.teamId = 'alpha';
    const weapon = new IsidaWeapon(owner, deps);
    const ally = makeTarget(3, 0, 9, { teamId: 'alpha', health: 97 });
    weapon.setFire(true);
    run(weapon, ctx([ally]), 20);
    expect(onSupportScore).not.toHaveBeenCalled();
    expect(ally.health).toBeGreaterThan(97);
    expect(weapon.getBeamMode()).toBe('idle');
    weapon.dispose();
  });

  it('в DM союзников нет (null team) — неполноценный хил-лок невозможен', () => {
    const { deps } = makeDeps();
    const weapon = new IsidaWeapon(makeOwner(), deps);
    // Второй танк с null team — по семантике враг, не союзник.
    const other = makeTarget(3, 0, 9, { health: 40 });
    weapon.setFire(true);
    run(weapon, ctx([other]), 8);
    expect(weapon.getBeamMode()).toBe('attack');
    weapon.dispose();
  });
});

describe('IsidaWeapon — жизненный цикл', () => {
  it('onOwnerDeath гасит луч, onRespawn наполняет баллон', () => {
    const { deps } = makeDeps();
    const weapon = new IsidaWeapon(makeOwner(), deps);
    const enemy = makeTarget(2, 0, 10);
    weapon.setFire(true);
    run(weapon, ctx([enemy]), 10);
    expect(weapon.getBeamMode()).toBe('attack');
    weapon.onOwnerDeath();
    expect(weapon.getBeamMode()).toBe('none');
    weapon.energy = 12;
    weapon.onRespawn();
    expect(weapon.energy).toBe(tune.energyMax);
    expect(weapon.getBeamMode()).toBe('none');
    weapon.dispose();
  });
});
