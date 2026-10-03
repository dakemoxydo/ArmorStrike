// @vitest-environment jsdom
/**
 * Zero-allocation инварианты горячего пути кадра.
 *
 * Четыре места, где аллокация жила в per-frame коде; каждый тест ловит именно
 * ту регрессию, ради которой правка введена (не «вообще прошло»):
 *   1. ProjectileStage.update — HitContext + onTankHit больше не новые каждый
 *      кадр (было 2 аллокации × 60/с на самом горячем стейдже);
 *   2. prefersReducedMotion — MediaQueryList кешируется ОДИН раз, но кешируется
 *      ЖИВОЙ объект: смена настройки ОС посреди боя видна, а кеш значения
 *      (наивный фикс) ломается;
 *   3. RespawnController.update — claimed/threats переиспользуются между
 *      вызовами, при этом буфер threats не несёт мусора из прошлого кадра;
 *   4. CameraRig.avoidObstacles и GameLoop-контекст оружия — стабильная
 *      ссылка между кадрами.
 *
 * Поведенческие регрессии идут следом: onTankHit всё ещё гонит реальный HP
 * через applyDamage (C2), точки респауна по-прежнему разводятся между
 * одновременными респавнами и выбираются по удалённости от УГРОЗ, камера по-
 * прежнему не уезжает сквозь стену.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { ProjectileStage } from '../game/engine/stages/WorldStages';
import type { FrameContext } from '../game/engine/stages/types';
import type { HitContext } from '../game/engine/Projectile';
import { prefersReducedMotion, REDUCED_MOTION_QUERY } from '../lib/reducedMotion';
import { RespawnController } from '../game/match/RespawnController';
import { CameraRig } from '../game/CameraRig';
import { PlayingCameraMode } from '../game/camera/PlayingCameraMode';
import { GameLoop } from '../game/GameLoop';
import { FFA_SPAWN_POINTS } from '../game/match/spawnPoints';
import type { Collider } from '../game/engine/physics';
import type { TankEntity } from '../game/Tank';
import type { RunState } from '../game/RunState';

// ── 1. ProjectileStage: HitContext ───────────────────────────────────────────

function projectileHarness() {
  const seen: HitContext[] = [];
  const projectiles = {
    update: vi.fn((_dt: number, ctx: HitContext) => { seen.push(ctx); }),
  };
  const applyDamage = vi.fn();
  const arena = { colliders: [] as Collider[] };
  const stage = new ProjectileStage(
    projectiles as never,
    arena as never,
    {} as never,
    { damageSystem: { applyDamage } } as never,
  );
  const tanks: TankEntity[] = [];
  const ctx = { dt: 1 / 60, tanks } as unknown as FrameContext;
  return { stage, seen, arena, ctx, applyDamage, projectiles };
}

describe('ProjectileStage — HitContext собран один раз (не на кадр)', () => {
  it('один и тот же объект и одна и та же onTankHit на всех кадрах', () => {
    const { stage, seen, ctx, projectiles } = projectileHarness();
    for (let i = 0; i < 120; i++) stage.update(ctx);

    expect(seen).toHaveLength(120);
    for (const c of seen) expect(c).toBe(seen[0]);
    for (const c of seen) expect(c.onTankHit).toBe(seen[0].onTankHit);
    // dt по-прежнему прокидывается в менеджер снарядов.
    expect(projectiles.update).toHaveBeenLastCalledWith(1 / 60, seen[0]);
  });

  it('подмена массивов ростера/коллайдеров подхватывается без нового контекста', () => {
    const { stage, seen, ctx, arena } = projectileHarness();
    stage.update(ctx);
    const hit = seen[0];

    const fresh: Collider[] = [{
      id: 1, minX: -1, maxX: 1, minZ: -1, maxZ: 1, height: 3,
      kind: 'wall', active: true, blocksShots: true, blocksSight: true, destructible: false,
    }];
    const freshTanks: TankEntity[] = [];
    (ctx as { tanks: TankEntity[] }).tanks = freshTanks;
    arena.colliders = fresh;

    stage.update(ctx);
    expect(seen[1]).toBe(hit); // объект прежний…
    expect(hit.tanks).toBe(freshTanks); // …поля обновились
    expect(hit.colliders).toBe(fresh);
  });

  it('onTankHit по-прежнему гонит реальный HP через applyDamage (C2)', () => {
    const { stage, seen, applyDamage, ctx } = projectileHarness();
    stage.update(ctx);
    const target = { id: 1 } as never;
    const owner = { id: 2 } as never;
    seen[0].onTankHit(target, 30, owner);
    expect(applyDamage).toHaveBeenCalledWith(target, 30, owner);
  });
});

// ── 2. prefersReducedMotion: кеш MQL ──────────────────────────────────────────

afterEach(() => {
  Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true, value: undefined });
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/** Стаб matchMedia, отдающий ОДИН и тот же MQL-объект (как в браузере). */
function installMatchMedia(initial = false) {
  const mql = {
    matches: initial,
    media: REDUCED_MOTION_QUERY,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
  const factory = vi.fn(() => mql as unknown as MediaQueryList);
  Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true, value: factory });
  return { mql, queries: () => factory.mock.calls.length };
}

describe('prefersReducedMotion — MQL запрашивается один раз, но остаётся живым', () => {
  it('30 кадров гейта = 1 вызов matchMedia, смена matches видна сразу', () => {
    const { mql, queries } = installMatchMedia(false);
    for (let i = 0; i < 30; i++) expect(prefersReducedMotion()).toBe(false);
    expect(queries()).toBe(1);

    // Переключение настройки ОС посреди боя: браузер меняет matches НА ТОМ ЖЕ
    // MQL. Кеш значения (наивный фикс) здесь вернул бы прежний false.
    mql.matches = true;
    expect(prefersReducedMotion()).toBe(true);
    mql.matches = false;
    expect(prefersReducedMotion()).toBe(false);
    expect(queries()).toBe(1);
  });

  it('подмена самой функции matchMedia пересоздаёт кеш (окно/тестовый стаб)', () => {
    const first = installMatchMedia(true);
    expect(prefersReducedMotion()).toBe(true);
    expect(first.queries()).toBe(1);

    const second = installMatchMedia(false);
    expect(prefersReducedMotion()).toBe(false);
    expect(second.queries()).toBe(1);
  });

  it('бросающий matchMedia даёт false и не оставляет протухший кеш', () => {
    const boom = () => { throw new Error('no media'); };
    Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true, value: boom });
    expect(prefersReducedMotion()).toBe(false);
    expect(prefersReducedMotion()).toBe(false);

    // После починки окружения гейт снова живой, а не залип на false.
    const { queries } = installMatchMedia(true);
    expect(prefersReducedMotion()).toBe(true);
    expect(queries()).toBe(1);
  });
});

// ── 3. RespawnController: claimed / threats ───────────────────────────────────

interface FakeTank {
  id: number;
  teamId: string | null;
  isPlayer: boolean;
  isRemote?: boolean;
  alive: boolean;
  invulnT: number;
  deathT: number;
  health: number;
  maxHealth: number;
  throttle: number;
  steer: number;
  speed: number;
  boostEnergy: number;
  fireTimer: number;
  position: { x: number; z: number };
  yaw: number;
  aimYaw: number;
  turretYaw: number;
  knockback: { set: (x: number, y: number, z: number) => void };
  weapon: { onRespawn: () => void } | null;
  visual: {
    group: { position: { set: (x: number, y: number, z: number) => void } };
    bodyMats: Array<{ color: { setHex: (n: number) => void }; emissive: { setScalar: (n: number) => void } }>;
    bodyBaseColors: number[];
    ring: { visible: boolean };
    barrelGroup: { rotation: { x: number } };
  };
}

function fakeTank(p: Partial<FakeTank> & { id: number }): FakeTank {
  return {
    teamId: null,
    isPlayer: false,
    alive: true,
    invulnT: 0,
    deathT: 0,
    health: 100,
    maxHealth: 100,
    throttle: 0,
    steer: 0,
    speed: 0,
    boostEnergy: 0,
    fireTimer: 0,
    position: { x: 0, z: 0 },
    yaw: 0,
    aimYaw: 0,
    turretYaw: 0,
    knockback: { set: vi.fn() },
    weapon: { onRespawn: vi.fn() },
    visual: {
      group: { position: { set: vi.fn() } },
      bodyMats: [{ color: { setHex: vi.fn() }, emissive: { setScalar: vi.fn() } }],
      bodyBaseColors: [0x445566],
      ring: { visible: false },
      barrelGroup: { rotation: { x: 0 } },
    },
    ...p,
  };
}

const asTanks = (list: FakeTank[]) => list as unknown as TankEntity[];
const spawnOf = (t: FakeTank) =>
  (t.visual.group.position.set as ReturnType<typeof vi.fn>).mock.calls[0] as [number, number, number];

function respawnHarness() {
  const ctrl = new RespawnController({
    run: { paused: false } as unknown as RunState,
    audio: { startEngine: vi.fn() } as never,
    input: { enabled: false, requestLock: vi.fn() } as never,
    setDeathT: vi.fn(),
  });
  const buf = ctrl as unknown as {
    claimed: Set<number>;
    threats: Array<{ x: number; z: number }>;
  };
  return { ctrl, claimed: buf.claimed, threats: buf.threats };
}

describe('RespawnController — буферы claimed/threats переиспользуются', () => {
  it('один и тот же Set на все кадры, и на пустом кадре он пуст', () => {
    const { ctrl, claimed } = respawnHarness();
    const dead = fakeTank({ id: 1, alive: false, deathT: 4 });
    const alive = fakeTank({ id: 2 });

    ctrl.update(0.1, asTanks([dead, alive]), 4, 2);
    // Мёртвый занял точку — Set держит claim до конца текущего прогона.
    expect(claimed.size).toBe(1);

    // Следующий кадр: никого не мёртв — тот же Set, но очищенный на входе.
    // (Свежий Set на кадр не выполнил бы вторую проверку; оставленный мусор
    //  из прошлого кадра съел бы точку следующему респавну.)
    ctrl.update(0.1, asTanks([alive]), 4, 2);
    expect(claimed.size).toBe(0);

    const again = fakeTank({ id: 3, alive: false, deathT: 4 });
    ctrl.update(0.1, asTanks([alive, again]), 4, 2);
    expect(claimed.size).toBe(1);
  });

  it('строки threats — те же объекты с обновлёнными координатами', () => {
    const { ctrl, threats } = respawnHarness();
    const e1 = fakeTank({ id: 2, position: { x: 10, z: 20 } });
    const e2 = fakeTank({ id: 3, position: { x: -30, z: 5 } });
    const dead = fakeTank({ id: 1, alive: false, deathT: 4 });

    ctrl.update(0.1, asTanks([dead, e1, e2]), 4, 2);
    expect(threats).toHaveLength(2);
    const rowA = threats[0];
    const rowB = threats[1];
    expect(rowA).toMatchObject({ x: 10, z: 20 });
    expect(rowB).toMatchObject({ x: -30, z: 5 });

    // Тот же массив и те же строки, только значения переписаны.
    e1.position.x = 99;
    e2.position.x = -99;
    dead.alive = false;
    dead.deathT = 4;
    ctrl.update(0.1, asTanks([dead, e1, e2]), 4, 2);
    expect(threats[0]).toBe(rowA);
    expect(threats[1]).toBe(rowB);
    expect(rowA).toMatchObject({ x: 99, z: 20 });
    expect(rowB).toMatchObject({ x: -99, z: 5 });
  });

  it('буфер threats схлопывается: мёртвые и союзники в него не попадают', () => {
    const { ctrl, threats } = respawnHarness();
    const me = fakeTank({ id: 1, teamId: 'alpha', alive: false, deathT: 4 });
    const ally = fakeTank({ id: 2, teamId: 'alpha' });
    // Труп врага, ещё не дождавшийся delay — в прогоне этого кадра не участвует.
    const corpse = fakeTank({ id: 3, teamId: 'bravo', alive: false, deathT: 1 });
    const enemy = fakeTank({ id: 4, teamId: 'bravo', position: { x: 5, z: 5 } });

    ctrl.update(0.1, asTanks([me, ally, corpse, enemy]), 4, 2);
    expect(threats).toHaveLength(1);
    expect(threats[0]).toMatchObject({ x: 5, z: 5 });
  });

  it('буфер threats пуст, когда живых врагов нет (не остаётся хвоста)', () => {
    const { ctrl, threats } = respawnHarness();
    const me = fakeTank({ id: 1, teamId: 'alpha', alive: false, deathT: 4 });
    const enemy = fakeTank({ id: 2, teamId: 'bravo', position: { x: 1, z: 1 } });
    ctrl.update(0.1, asTanks([me, enemy]), 4, 2);
    expect(threats).toHaveLength(1);

    enemy.alive = false;
    me.deathT = 4;
    me.alive = false;
    ctrl.update(0.1, asTanks([me, enemy]), 4, 2);
    expect(threats).toHaveLength(0);
  });
});

describe('RespawnController — поведение не изменилось', () => {
  it('два одновременных респавна не делят точку, оба оживают', () => {
    const { ctrl } = respawnHarness();
    const d1 = fakeTank({ id: 1, alive: false, deathT: 4 });
    const d2 = fakeTank({ id: 2, alive: false, deathT: 4 });
    ctrl.update(0.1, asTanks([d1, d2]), 4, 2);

    const [x1, , z1] = spawnOf(d1);
    const [x2, , z2] = spawnOf(d2);
    expect([x1, z1]).not.toEqual([x2, z2]);
    expect(d1.alive).toBe(true);
    expect(d2.alive).toBe(true);
    expect(d1.health).toBe(d1.maxHealth);
    expect(d1.invulnT).toBe(2);
    expect(d1.weapon!.onRespawn).toHaveBeenCalledTimes(1);
  });

  it('точка выбирается по удалённости от ЖИВЫХ врагов (буфер threats наполнен)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const { ctrl } = respawnHarness();
    // FFA-пул: живой враг стоит ровно на точке [128,128] → самой дальней
    // оказывается [-128,-128] (362 м против 256/128 у остальных).
    const me = fakeTank({ id: 1, alive: false, deathT: 4 });
    const foe = fakeTank({ id: 2, position: { x: 128, z: 128 } });
    ctrl.update(0.1, asTanks([me, foe]), 4, 2);

    const [x, , z] = spawnOf(me);
    expect([x, z]).toEqual([-128, -128]);
  });

  it('мёртвый враг угрозой не считается', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const { ctrl } = respawnHarness();
    // Если бы [-128,-128] попал в угрозы, дальней стала бы [-134,0].
    const me = fakeTank({ id: 1, alive: false, deathT: 4 });
    const foe = fakeTank({ id: 2, position: { x: 128, z: 128 } });
    const corpse = fakeTank({ id: 3, position: { x: -128, z: -128 }, alive: false, deathT: 9 });
    ctrl.update(0.1, asTanks([me, foe, corpse]), 4, 2);

    const [x, , z] = spawnOf(me);
    expect([x, z]).toEqual([-128, -128]);
  });

  it('точки респауна берутся из FFA-пула', () => {
    const { ctrl } = respawnHarness();
    const me = fakeTank({ id: 1, alive: false, deathT: 4 });
    ctrl.update(0.1, asTanks([me]), 4, 2);
    const [x, , z] = spawnOf(me);
    expect(FFA_SPAWN_POINTS.some(([px, pz]) => px === x && pz === z)).toBe(true);
  });
});

// ── 4a. CameraRig.avoidObstacles: переиспользуемая ячейка ─────────────────────

function wall(z: number): Collider {
  return {
    id: z, minX: -5, maxX: 5, minZ: z - 0.25, maxZ: z + 0.25, height: 3,
    kind: 'wall', active: true, blocksShots: true, blocksSight: true, destructible: false,
  };
}

describe('CameraRig.avoidObstacles — стабильная ссылка, живые значения', () => {
  it('возвращает одну и ту же ячейку, значения соответствуют последнему вызову', () => {
    const rig = new CameraRig(new THREE.PerspectiveCamera());
    const first = rig.avoidObstacles(0, 0, 0, -10, 2, []);
    expect(first).toMatchObject({ dx: 0, dz: -10, dy: 2 });

    const second = rig.avoidObstacles(0, 0, 0, -10, 2, [wall(-3)]);
    expect(second).toBe(first); // ссылка не плодится
    expect(Math.abs(second.dz)).toBeLessThan(3.5); // стена отодвинула камеру

    const third = rig.avoidObstacles(0, 0, 0, -10, 2, []);
    expect(third).toBe(first);
    expect(third.dz).toBe(-10); // прежнее значение не залипло
  });

  it('регрессия: ближняя стена режет хвост, дальняя — нет', () => {
    const rig = new CameraRig(new THREE.PerspectiveCamera());
    const near = rig.avoidObstacles(0, 0, 0, -10, 2, [wall(-3)]);
    const nearDz = near.dz;
    const far = rig.avoidObstacles(0, 0, 0, -10, 2, [wall(-8)]);
    expect(Math.abs(nearDz)).toBeLessThan(Math.abs(far.dz));
  });

  it('PlayingCameraMode с настоящим ригом держит камеру до стены', () => {
    const rig = new CameraRig(new THREE.PerspectiveCamera());
    rig.camPos.set(0, 2, 0);
    const mode = new PlayingCameraMode();
    const params = {
      player: {
        position: { x: 0, z: 0 },
        alive: true,
        speed: 0,
        boostActive: false,
        params: { speed: 10 },
      },
      look: { yaw: 0, pitch: 0 },
      colliders: [wall(-3)],
      effects: { getFovBias: () => 0, getShake: () => 0 },
    } as unknown as Parameters<typeof mode.update>[1];

    for (let i = 0; i < 40; i++) mode.update(1 / 60, params, rig);
    expect(rig.camPos.z).toBeGreaterThan(-3.5);
  });
});

// ── 4b. GameLoop: контекст догоняющих орудий ─────────────────────────────────

function gameLoopHarness() {
  const weaponCtx: unknown[] = [];
  const tank = {
    id: 1,
    alive: true,
    weapon: {
      update: vi.fn((_dt: number, ctx: unknown) => { weaponCtx.push(ctx); }),
      setFire: vi.fn(),
    },
  };
  const tanks = [tank];
  const colliders: Collider[] = [];
  const sim = {
    run: { mode: 'over', paused: false },
    networked: false,
    tanks,
    player: null,
    step: vi.fn(),
    arena: { colliders, update: vi.fn() },
    effects: { update: vi.fn() },
    input: { look: { yaw: 0, pitch: 0 }, scoreHeld: false },
    audio: { setListener: vi.fn(), setEngine: vi.fn(), setPaused: vi.fn() },
  };
  const loop = new GameLoop({
    sim: sim as never,
    cameraRig: { camPos: new THREE.Vector3(), update: vi.fn() } as never,
    renderWorld: { render: vi.fn() } as never,
    hudModel: { getHud: vi.fn() } as never,
    hud: {} as never,
    emit: vi.fn(),
    getPreviewVisual: () => null,
    onHud: vi.fn(),
  });
  return { loop, weaponCtx, tanks, colliders, sim };
}

describe('GameLoop — контекст оружия вне боя переиспользуется', () => {
  it('экран итогов: один объект на все кадры, ссылки на бой и коллайдеры живые', () => {
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => { frames.push(fn); return frames.length; });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());

    const { loop, weaponCtx, tanks, colliders, sim } = gameLoopHarness();
    loop.start();
    frames[0](0);
    frames[0](16.7);
    frames[0](33.4);

    expect(weaponCtx).toHaveLength(3);
    for (const c of weaponCtx) expect(c).toBe(weaponCtx[0]);
    const ctx = weaponCtx[0] as { tanks: unknown; colliders: unknown };
    expect(ctx.tanks).toBe(tanks);
    expect(ctx.colliders).toBe(colliders);
    // Танк вне боя всё равно догоняется оружием (A7).
    expect(tanks[0].weapon.update).toHaveBeenCalledTimes(3);
    expect(sim.step).not.toHaveBeenCalled();

    loop.stop();
  });

  it('подмена массива коллайдеров доезжает до оружия на следующем кадре', () => {
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => { frames.push(fn); return frames.length; });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());

    const { loop, weaponCtx, sim } = gameLoopHarness();
    loop.start();
    frames[0](0);
    const fresh: Collider[] = [];
    (sim.arena as { colliders: Collider[] }).colliders = fresh;
    frames[0](16.7);

    expect(weaponCtx[1]).toBe(weaponCtx[0]);
    expect((weaponCtx[1] as { colliders: unknown }).colliders).toBe(fresh);
    loop.stop();
  });
});