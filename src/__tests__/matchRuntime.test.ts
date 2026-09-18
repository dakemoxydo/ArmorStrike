/**
 * J8 — Match-runtime слой под тестами (батч аудита 2026-09-15).
 *
 * gameModeLifecycle.test.ts мокает match и пинит только порядок вызовов —
 * именно так просочились I4/I5. Здесь — поведение самих классов:
 * матрица MatchRuntime.reset (вкл. ветку сохранения CP-зон без opts, L-4),
 * onTankKilled (kill-credit / team pools / guard 'ended'),
 * RespawnController.update (claimed-дедуп, player-only requestLock),
 * CaptureController.update (пулинг массивов, шаг владения, скоринг),
 * update → evaluateMatchEnd (здесь же сквозной пин draw-семантики C7).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as THREE from 'three';
import { MatchRuntime } from '../game/match/MatchRuntime';
import type { MatchRuntimeHooks } from '../game/match/MatchRuntime';
import { RespawnController } from '../game/match/RespawnController';
import { CaptureController } from '../game/match/CaptureController';
import type { GameEvent } from '../game/types';
import type { TankEntity } from '../game/Tank';
import type { MatchResult } from '../game/match/matchTypes';

// ── canvas stub для CaptureMarkers (тот же контракт, что в factoryMap.test.ts) ──
const gradient = { addColorStop: () => {} };
const ctx2d = new Proxy(
  {},
  {
    get(_t, prop) {
      if (prop === 'createRadialGradient' || prop === 'createLinearGradient') return () => gradient;
      return () => {};
    },
    set() {
      return true;
    },
  },
);
globalThis.document = {
  createElement: (tag: string) =>
    tag === 'canvas' ? { width: 0, height: 0, getContext: () => ctx2d } : undefined,
} as unknown as Document;

// ── tank/entity fakes ───────────────────────────────────────────────────────

interface FakeTank {
  id: number;
  name: string;
  teamId: string | null;
  isPlayer: boolean;
  alive: boolean;
  kills: number;
  deaths: number;
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
    name: `T${p.id}`,
    teamId: null,
    isPlayer: false,
    alive: true,
    kills: 0,
    deaths: 0,
    invulnT: 0,
    deathT: 0,
    health: 100,
    maxHealth: 100,
    throttle: 0.5,
    steer: 0.5,
    speed: 9,
    boostEnergy: 0.2,
    fireTimer: 1,
    position: { x: 0, z: 0 },
    yaw: 7,
    aimYaw: 7,
    turretYaw: 3,
    knockback: { set: vi.fn() },
    weapon: { onRespawn: vi.fn() },
    visual: {
      group: { position: { set: vi.fn() } },
      bodyMats: [{ color: { setHex: vi.fn() }, emissive: { setScalar: vi.fn() } }],
      bodyBaseColors: [0x445566],
      ring: { visible: false },
      barrelGroup: { rotation: { x: 0.7 } },
    },
    ...p,
  };
}

const tanks = (...list: FakeTank[]) => list as unknown as TankEntity[];
const T = (t: FakeTank) => t as unknown as TankEntity;

function makeHooks() {
  const run = { mode: 'playing', paused: false, score: 0, kills: 0, matchTime: 0 };
  const audio = { startEngine: vi.fn(), stopEngine: vi.fn() };
  const input = { enabled: false, requestLock: vi.fn(), releaseLock: vi.fn() };
  const events: GameEvent[] = [];
  const overs: MatchResult[] = [];
  let deathT = 5;
  const hooks = {
    run,
    audio,
    input,
    bots: { bots: [] },
    emit: (e: GameEvent) => events.push(e),
    requestMatchOver: (r: MatchResult) => overs.push(r),
    getDeathT: () => deathT,
    setDeathT: (v: number) => {
      deathT = v;
    },
  } as unknown as MatchRuntimeHooks & {
    run: typeof run;
    audio: typeof audio;
    input: typeof input;
  };
  return { hooks, run, audio, input, events, overs, getDeathT: () => deathT };
}

describe('MatchRuntime.reset — матрица режимов (J8)', () => {
  it('capture_point + mapId + scene монтирует 3 зоны и маркеры', () => {
    const { hooks } = makeHooks();
    const rt = new MatchRuntime(hooks);
    const scene = new THREE.Scene();
    rt.reset('capture_point', { mapId: 'factory', scene });
    expect(rt.zones.map((z) => z.id)).toEqual(['A', 'B', 'C']);
    expect(scene.children.some((c) => c.name === 'captureMarkers')).toBe(true);
  });

  it('capture_point без opts сохраняет зоны (L-4), но снимает маркеры', () => {
    const { hooks } = makeHooks();
    const rt = new MatchRuntime(hooks);
    const scene = new THREE.Scene();
    rt.reset('capture_point', { mapId: 'factory', scene });
    const zones = rt.zones;
    rt.reset('capture_point'); // нет mapId/scene
    expect(rt.zones).toBe(zones); // тот же массив, не разорван между clearTanks и стартом
    expect(scene.children.some((c) => c.name === 'captureMarkers')).toBe(false);
  });

  it('уход из CP в DM чистит зоны; reset обнуляет состояние матча', () => {
    const { hooks } = makeHooks();
    const rt = new MatchRuntime(hooks);
    rt.reset('capture_point', { mapId: 'city', scene: new THREE.Scene() });
    rt.ended = true;
    rt.teamKills.alpha = 9;
    rt.teamScore.bravo = 500;
    rt.lastResult = { reason: 'score' } as unknown as MatchResult;

    rt.reset('deathmatch');
    expect(rt.zones).toHaveLength(0);
    expect(rt.mode).toBe('deathmatch');
    expect(rt.ended).toBe(false);
    expect(rt.teamKills).toEqual({ alpha: 0, bravo: 0 });
    expect(rt.teamScore).toEqual({ alpha: 0, bravo: 0 });
    expect(rt.lastResult).toBeNull();
  });
});

describe('MatchRuntime.onTankKilled (J8)', () => {
  it('вражеский фраг: kills/deaths, team pool, score игрока, kill-ивент', () => {
    const { hooks, run, events } = makeHooks();
    const rt = new MatchRuntime(hooks);
    rt.reset('team_deathmatch');
    const owner = fakeTank({ id: 1, teamId: 'alpha', isPlayer: true });
    const victim = fakeTank({ id: 2, teamId: 'bravo' });
    rt.onTankKilled(T(victim), T(owner), tanks(owner, victim));
    expect(owner.kills).toBe(1);
    expect(victim.deaths).toBe(1);
    expect(rt.teamKills).toEqual({ alpha: 1, bravo: 0 });
    expect(run.kills).toBe(1);
    expect(run.score).toBeGreaterThan(0);
    expect(events).toEqual([{ type: 'kill', victim: 'T2', byPlayer: true }]);
  });

  it('дружественный «килл» (do-splash): только deaths, без кредита и пула', () => {
    const { hooks, run, events } = makeHooks();
    const rt = new MatchRuntime(hooks);
    rt.reset('team_deathmatch');
    const owner = fakeTank({ id: 1, teamId: 'alpha', isPlayer: true });
    const ally = fakeTank({ id: 2, teamId: 'alpha' });
    rt.onTankKilled(T(ally), T(owner), tanks(owner, ally));
    expect(owner.kills).toBe(0);
    expect(ally.deaths).toBe(1);
    expect(rt.teamKills).toEqual({ alpha: 0, bravo: 0 });
    expect(run.score).toBe(0);
    // byPlayer — атрибутика ленты («кто нанес урон»), кредита всё равно нет
    expect(events[0]).toMatchObject({ byPlayer: true });
  });

  it('null owner (взрыв блока): deaths и ивент, кредита нет', () => {
    const { hooks, events } = makeHooks();
    const rt = new MatchRuntime(hooks);
    rt.reset('deathmatch');
    const victim = fakeTank({ id: 3 });
    rt.onTankKilled(T(victim), null, tanks(victim));
    expect(victim.deaths).toBe(1);
    expect(events[0]).toMatchObject({ type: 'kill', byPlayer: false });
  });

  it('после ended — no-op (ни deaths, ни ивентов)', () => {
    const { hooks, events } = makeHooks();
    const rt = new MatchRuntime(hooks);
    rt.ended = true;
    const victim = fakeTank({ id: 4 });
    rt.onTankKilled(T(victim), T(fakeTank({ id: 5 })), tanks(victim));
    expect(victim.deaths).toBe(0);
    expect(events).toHaveLength(0);
  });
});

describe('MatchRuntime.update (J8 + сквозной C7)', () => {
  it('гейты: не playing / ended — ничего не тикает', () => {
    const { hooks, run } = makeHooks();
    const rt = new MatchRuntime(hooks);
    rt.reset('deathmatch');
    const t = fakeTank({ id: 1, invulnT: 2 });
    run.mode = 'menu';
    rt.update(1, tanks(t), t as unknown as TankEntity);
    expect(t.invulnT).toBe(2);
    run.mode = 'playing';
    rt.ended = true;
    rt.update(1, tanks(t), t as unknown as TankEntity);
    expect(t.invulnT).toBe(2);
  });

  it('тикет: invuln тает, смерть игрока синхронизирует death-cam ячейку', () => {
    const { hooks, getDeathT } = makeHooks();
    const rt = new MatchRuntime(hooks);
    rt.reset('deathmatch');
    const p = fakeTank({ id: 1, alive: false, deathT: 0, invulnT: 2 });
    rt.update(0.5, tanks(p), p as unknown as TankEntity);
    expect(p.invulnT).toBeCloseTo(1.5);
    expect(getDeathT()).toBe(0);
    // ожил (respawn ниже отработает) — после revival deathT уходит в -1
  });

  it('client replication: does not evaluate win or step capture', () => {
    const { hooks, run, overs } = makeHooks();
    const rt = new MatchRuntime(hooks);
    rt.reset('deathmatch');
    rt.replication = 'client';
    run.matchTime = 60;
    const a = fakeTank({ id: 1, isPlayer: true, name: 'Ace', kills: rt.config.winKills });
    rt.update(1 / 60, tanks(a), a as unknown as TankEntity);
    expect(overs).toHaveLength(0);
    expect(rt.ended).toBe(false);

    rt.applyHostSync({
      timeSec: 12,
      teamKills: { alpha: 3, bravo: 1 },
      ended: true,
      reason: 'score',
      winnerName: 'Ace',
      winnerTeam: null,
    }, a as unknown as TankEntity);
    expect(run.matchTime).toBe(12);
    expect(rt.ended).toBe(true);
    expect(overs).toHaveLength(1);
    expect(overs[0].playerWon).toBe(true);
  });

  it('порог фразового добивания в одном тике → draw без смещения (C7, end-to-end)', () => {
    const { hooks, run, overs } = makeHooks();
    const rt = new MatchRuntime(hooks);
    rt.reset('deathmatch');
    run.matchTime = 60;
    const a = fakeTank({ id: 1, isPlayer: true, kills: rt.config.winKills });
    const b = fakeTank({ id: 2, kills: rt.config.winKills });
    rt.update(1 / 60, tanks(a, b), a as unknown as TankEntity);
    expect(overs).toHaveLength(1);
    expect(rt.ended).toBe(true);
    expect(rt.lastResult).toBe(overs[0]);
    expect(overs[0]).toMatchObject({ reason: 'score', winnerName: null, playerWon: false });
  });

  it('CP: update копит teamScore из владения зонами', () => {
    const { hooks, run } = makeHooks();
    const rt = new MatchRuntime(hooks);
    rt.reset('capture_point', { mapId: 'factory', scene: new THREE.Scene() });
    // захват A (-88, 8): alpha стоит один 8+ тиков
    const a = fakeTank({ id: 1, teamId: 'alpha', position: { x: -88, z: 8 } });
    const list = tanks(a);
    for (let i = 0; i < 9; i++) rt.update(1, list, a as unknown as TankEntity);
    expect(rt.zones[0].owner).toBe('alpha');
    const before = rt.teamScore.alpha;
    rt.update(1, list, a as unknown as TankEntity);
    expect(rt.teamScore.alpha).toBeGreaterThan(before);
    void run;
  });
});

describe('RespawnController.update (J8)', () => {
  it('два трупа одной команды в один кадр не делят точку респауна (claimed-дедуп)', () => {
    const { hooks, audio, input } = makeHooks();
    const respawn = new RespawnController({
      run: hooks.run,
      audio: hooks.audio as never,
      input: hooks.input as never,
      setDeathT: hooks.setDeathT,
    });
    const enemy = fakeTank({ id: 9, teamId: 'bravo', position: { x: 0, z: 0 } });
    const d1 = fakeTank({ id: 1, teamId: 'alpha', alive: false, deathT: 4 });
    const d2 = fakeTank({ id: 2, teamId: 'alpha', alive: false, deathT: 4 });
    respawn.update(0.1, tanks(enemy, d1, d2), 4, 2);

    const set1 = d1.visual.group.position.set as ReturnType<typeof vi.fn>;
    const set2 = d2.visual.group.position.set as ReturnType<typeof vi.fn>;
    expect(set1).toHaveBeenCalledTimes(1);
    expect(set2).toHaveBeenCalledTimes(1);
    const [px1, , pz1] = set1.mock.calls[0] as [number, number, number];
    const [px2, , pz2] = set2.mock.calls[0] as [number, number, number];
    expect([px1, pz1]).not.toEqual([px2, pz2]);
    // боевое состояние восстановлено, инвулн выдан
    expect(d1.alive).toBe(true);
    expect(d1.health).toBe(d1.maxHealth);
    expect(d1.invulnT).toBe(2);
    expect(d1.weapon!.onRespawn).toHaveBeenCalled();
    // к бою не из respawn-пула — игровые хуки не трогались
    expect(input.requestLock).not.toHaveBeenCalled();
    expect(audio.startEngine).not.toHaveBeenCalled();
  });

  it('игрок: requestLock + input.enabled + startEngine + deathT=-1 + unpause', () => {
    const { hooks, audio, input, getDeathT } = makeHooks();
    const respawn = new RespawnController({
      run: hooks.run,
      audio: hooks.audio as never,
      input: hooks.input as never,
      setDeathT: hooks.setDeathT,
    });
    hooks.run.paused = true;
    input.enabled = false;
    const p = fakeTank({ id: 1, isPlayer: true, teamId: 'alpha', alive: false, deathT: 4 });
    respawn.update(0.1, tanks(p), 4, 2);
    expect(input.requestLock).toHaveBeenCalledTimes(1);
    expect(input.enabled).toBe(true);
    expect(audio.startEngine).toHaveBeenCalledTimes(1);
    expect(getDeathT()).toBe(-1);
    expect(hooks.run.paused).toBe(false);
    // позиция/ракурс переставлены на спавн (face в арену)
    const set = p.visual.group.position.set as ReturnType<typeof vi.fn>;
    expect(set).toHaveBeenCalledTimes(1);
    expect(p.yaw).toBeCloseTo(Math.atan2(-set.mock.calls[0][0], -set.mock.calls[0][2]), 6);
    expect(p.visual.ring.visible).toBe(true);
  });

  it('не доживший до delay труп не респавнится', () => {
    const { hooks } = makeHooks();
    const respawn = new RespawnController({
      run: hooks.run,
      audio: hooks.audio as never,
      input: hooks.input as never,
      setDeathT: hooks.setDeathT,
    });
    const d = fakeTank({ id: 1, alive: false, deathT: 3.9 });
    respawn.update(0.1, tanks(d), 4, 2);
    expect(d.alive).toBe(false);
  });
});

describe('CaptureController.update (J8)', () => {
  let cc: CaptureController;
  beforeEach(() => {
    cc = new CaptureController();
    cc.reset('factory', new THREE.Scene());
  });

  it('пулинг: steady-state не пересоздаёт массив зон', () => {
    const initial = cc.getCaptureZones();
    cc.update(1, []);
    const after1 = cc.getCaptureZones();
    cc.update(1, []);
    expect(cc.getCaptureZones()).toBe(after1); // тот же массив, мутации in place
    expect(after1).not.toBe(initial); // посев пула — одна копия на смену anchor-набора
  });

  it('эксклюзивное присутствие захватывает нейтральную зону за captureSec', () => {
    const a = fakeTank({ id: 1, teamId: 'alpha', position: { x: -88, z: 8 } });
    cc.update(4, tanks(a));
    expect(cc.zones[0].actor).toBe('alpha');
    expect(cc.zones[0].progress).toBeCloseTo(0.5);
    cc.update(4, tanks(a));
    expect(cc.zones[0].owner).toBe('alpha');
    expect(cc.zones[0].progress).toBe(0);
  });

  it('контест замораживает прогресс без смены актёра', () => {
    const a = fakeTank({ id: 1, teamId: 'alpha', position: { x: -88, z: 8 } });
    cc.update(4, tanks(a));
    const b = fakeTank({ id: 2, teamId: 'bravo', position: { x: -84, z: 10 } });
    cc.update(4, tanks(a, b));
    expect(cc.zones[0].progress).toBeCloseTo(0.5); // не обнулился и не вырос
    expect(cc.zones[0].contested).toBe(true);
    expect(cc.zones[0].owner).toBeNull();
  });

  it('скоринг: только владельцы зон начисляют', () => {
    const a = fakeTank({ id: 1, teamId: 'alpha', position: { x: -88, z: 8 } });
    for (let i = 0; i < 8; i++) cc.update(1, tanks(a));
    expect(cc.zones[0].owner).toBe('alpha');
    const delta = cc.update(1, tanks(a));
    expect(delta.alpha).toBeCloseTo(1);
    expect(delta.bravo).toBe(0);
  });
});
