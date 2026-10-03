/**
 * Граница доверия к хосту: match_sync принимается только в проверенном виде.
 *
 * Покрывает три класса дефектов:
 *  · нефинитный timeSec навсегда отравлял run.matchTime (из NaN не выходит
 *    `+= dt`) → матч по лимиту переставал завершаться, окна серий залипали,
 *    часы рисовали NaN:NaN;
 *  · zone.progress из сети не клампился в 0..1 (а NaN ломал шаг захвата);
 *  · фраги/очки/победа в DM считались из клиентских данных: локальные
 *    счётчики накручиваются, а DM-победа сверялась по display name.
 */
import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import { MatchRuntime } from '../game/match/MatchRuntime';
import type { MatchRuntimeHooks } from '../game/match/MatchRuntime';
import { CaptureController } from '../game/match/CaptureController';
import {
  findSyncPlayer,
  isFinitePosePacket,
  localPlayerWonFromSync,
  reconcilePlayerScore,
  sanitizeSyncPlayers,
} from '../game/network/replication';
import type { TankEntity } from '../game/Tank';
import type { MatchResult } from '../game/match/matchTypes';
import type { MatchSyncPacket, TankTransformPacket } from '../game/network/types';

// ── canvas stub для CaptureMarkers (контракт как в matchRuntime.test.ts) ──
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

const tanks = (...list: unknown[]) => list as unknown as TankEntity[];

function makeHooks() {
  const run = { mode: 'playing', paused: false, score: 0, kills: 0, matchTime: 0 };
  const overs: MatchResult[] = [];
  const hooks = {
    run,
    audio: { startEngine: vi.fn(), stopEngine: vi.fn() },
    input: { enabled: false, requestLock: vi.fn(), releaseLock: vi.fn() },
    bots: { bots: [] },
    emit: vi.fn(),
    requestMatchOver: (r: MatchResult) => overs.push(r),
    getDeathT: () => -1,
    setDeathT: vi.fn(),
  } as unknown as MatchRuntimeHooks & { run: typeof run };
  return { hooks, run, overs };
}

function fakePlayer(over: Partial<TankEntity> = {}): TankEntity {
  return {
    id: 1,
    name: 'Ace',
    isPlayer: true,
    isRemote: false,
    networkId: 'me',
    teamId: null,
    alive: true,
    kills: 0,
    deaths: 0,
    invulnT: 0,
    deathT: 0,
    health: 100,
    maxHealth: 100,
    position: { x: 0, y: 0, z: 0 },
    visual: {
      group: { position: { set: vi.fn() } },
      bodyMats: [{ color: { setHex: vi.fn() }, emissive: { setScalar: vi.fn() } }],
      bodyBaseColors: [0x445566],
      ring: { visible: false },
      barrelGroup: { rotation: { x: 0 } },
    },
    ...over,
  } as unknown as TankEntity;
}

function basePacket(over: Partial<MatchSyncPacket> = {}): MatchSyncPacket {
  return { timeSec: 0, ...over };
}

describe('MatchRuntime.applyHostSync — часы матча', () => {
  it('нефинитный timeSec не превращает run.matchTime в NaN', () => {
    const { hooks, run } = makeHooks();
    const rt = new MatchRuntime(hooks);
    rt.replication = 'client';
    run.matchTime = 42;

    for (const bad of [Number.NaN, Infinity, -Infinity, -5, 'abc' as unknown as number]) {
      rt.applyHostSync(basePacket({ timeSec: bad }), fakePlayer());
    }
    expect(Number.isFinite(run.matchTime)).toBe(true);
    expect(run.matchTime).toBe(42);
  });

  it('после битого пакета матч по-прежнему закрывается лимитом времени', () => {
    const { hooks, run, overs } = makeHooks();
    const rt = new MatchRuntime(hooks);
    rt.replication = 'client';
    rt.applyHostSync(basePacket({ timeSec: Number.NaN }), fakePlayer());
    expect(Number.isFinite(run.matchTime)).toBe(true);

    // Часы доходят до лимита — конец матча по time срабатывает как обычно.
    rt.replication = 'local';
    run.matchTime = rt.config.timeLimitSec;
    const p = fakePlayer();
    rt.update(1 / 60, tanks(p), p);
    expect(overs).toHaveLength(1);
    expect(overs[0].reason).toBe('time');
    expect(overs[0].matchTimeSec).toBe(rt.config.timeLimitSec);
  });

  it('битый счёт команд не затирает предыдущие значения (пара проверяется целиком)', () => {
    const { hooks } = makeHooks();
    const rt = new MatchRuntime(hooks);
    rt.replication = 'client';
    rt.teamScore.alpha = 10;
    rt.teamScore.bravo = 20;
    rt.teamKills.bravo = 4;

    rt.applyHostSync(basePacket({
      timeSec: 1,
      teamScore: { alpha: Number.NaN, bravo: 20 },
      teamKills: { alpha: 7, bravo: Number.POSITIVE_INFINITY },
    }), fakePlayer());
    expect(rt.teamScore).toEqual({ alpha: 10, bravo: 20 });
    expect(rt.teamKills).toEqual({ alpha: 0, bravo: 4 });

    rt.applyHostSync(basePacket({
      timeSec: 2,
      teamScore: { alpha: 30, bravo: 40 },
    }), fakePlayer());
    expect(rt.teamScore).toEqual({ alpha: 30, bravo: 40 });
  });
});

describe('CaptureController.applyNetworkState — прогресс зоны', () => {
  it('клампит progress в 0..1 и игнорирует нефинитное значение', () => {
    const cc = new CaptureController();
    cc.reset('factory', new THREE.Scene());

    cc.applyNetworkState([{ id: 'A', owner: null, progress: 0.4 }]);
    expect(cc.zones[0].progress).toBeCloseTo(0.4);

    cc.applyNetworkState([{ id: 'A', owner: null, progress: 1.5 }]);
    expect(cc.zones[0].progress).toBe(1);

    cc.applyNetworkState([{ id: 'A', owner: null, progress: -2 }]);
    expect(cc.zones[0].progress).toBe(0);

    cc.applyNetworkState([{ id: 'A', owner: null, progress: 0.7 }]);
    cc.applyNetworkState([{ id: 'A', owner: null, progress: Number.NaN }]);
    expect(cc.zones[0].progress).toBeCloseTo(0.7);
  });
});

describe('MatchRuntime.applyHostSync — авторитетные награды', () => {
  it('берёт фраги/очки/счёт из players[] хоста, а не из локальных счётчиков', () => {
    const { hooks, run, overs } = makeHooks();
    const rt = new MatchRuntime(hooks);
    rt.replication = 'client';
    // Клиент накрутил локальные счётчики.
    run.kills = 99;
    run.score = 9900;
    const p = fakePlayer({ kills: 99, deaths: 3 });

    rt.applyHostSync(basePacket({
      timeSec: 100,
      ended: true,
      reason: 'score',
      players: [{ networkId: 'me', name: 'Ace', kills: 7, deaths: 2, score: 700, bestStreak: 4 }],
    }), p);

    expect(overs).toHaveLength(1);
    expect(overs[0]).toMatchObject({
      playerKills: 7,
      playerDeaths: 2,
      playerScore: 700,
      playerBestStreak: 4,
    });
    expect(run.kills).toBe(7);
  });

  it('support-очки клиента (Изида) сохраняются поверх киловой части хоста', () => {
    const { hooks, run, overs } = makeHooks();
    const rt = new MatchRuntime(hooks);
    rt.replication = 'client';
    run.kills = 7;
    run.score = 7 * 100 + 250; // 7 фрагов + 250 очков поддержки
    const p = fakePlayer({ kills: 7, deaths: 1 });

    rt.applyHostSync(basePacket({
      timeSec: 10,
      ended: true,
      reason: 'time',
      players: [{ networkId: 'me', name: 'Ace', kills: 7, deaths: 1, score: 700, bestStreak: 1 }],
    }), p);
    expect(overs[0].playerScore).toBe(950);
  });

  it('старый хост (без players) — откат на локальные значения', () => {
    const { hooks, run, overs } = makeHooks();
    const rt = new MatchRuntime(hooks);
    rt.replication = 'client';
    run.kills = 5;
    run.score = 500;
    const p = fakePlayer({ kills: 5, deaths: 2 });

    rt.applyHostSync(basePacket({
      timeSec: 100,
      ended: true,
      reason: 'score',
      winnerName: 'Ace',
      winnerTeam: null,
    }), p);
    expect(overs[0]).toMatchObject({ playerKills: 5, playerDeaths: 2, playerScore: 500 });
    expect(run.kills).toBe(5);
  });

  it('players без нашей строки — тоже откат (строка не нашлась)', () => {
    const { hooks, run, overs } = makeHooks();
    const rt = new MatchRuntime(hooks);
    rt.replication = 'client';
    run.kills = 4;
    run.score = 400;
    rt.applyHostSync(basePacket({
      timeSec: 100,
      ended: true,
      reason: 'score',
      players: [{ networkId: 'other', name: 'Bot', kills: 30, deaths: 1, score: 3000 }],
    }), fakePlayer({ kills: 4, deaths: 0 }));
    expect(overs[0].playerKills).toBe(4);
    expect(overs[0].playerScore).toBe(400);
  });
});

describe('победа в DM — по networkId, а не по имени', () => {
  it('host winnerId выигрывает у игрока с тем же именем', () => {
    const { hooks, overs } = makeHooks();
    const rt = new MatchRuntime(hooks);
    rt.replication = 'client';
    // Локальный игрок назвался как победитель — по имени это была бы победа.
    rt.applyHostSync(basePacket({
      timeSec: 100,
      ended: true,
      reason: 'score',
      winnerName: 'Ace',
      winnerId: 'someone-else',
      players: [{ networkId: 'someone-else', name: 'Ace', kills: 25, deaths: 9, score: 2500 }],
    }), fakePlayer({ networkId: 'me', name: 'Ace' }));
    expect(overs[0].playerWon).toBe(false);
  });

  it('host winnerId наш — победа засчитывается', () => {
    const { hooks, overs } = makeHooks();
    const rt = new MatchRuntime(hooks);
    rt.replication = 'client';
    rt.applyHostSync(basePacket({
      timeSec: 100,
      ended: true,
      reason: 'score',
      winnerName: 'Чужое имя',
      winnerId: 'me',
      players: [{ networkId: 'me', name: 'Ace', kills: 25, deaths: 9, score: 2500 }],
    }), fakePlayer({ networkId: 'me', name: 'Ace' }));
    expect(overs[0].playerWon).toBe(true);
  });

  it('localPlayerWonFromSync: team → id → имя (старый хост)', () => {
    expect(localPlayerWonFromSync(
      { winnerTeam: 'bravo', winnerName: null, winnerId: null },
      { teamId: 'bravo', name: 'Me', networkId: 'me' },
    )).toBe(true);
    expect(localPlayerWonFromSync(
      { winnerTeam: null, winnerName: 'Me', winnerId: 'other' },
      { teamId: null, name: 'Me', networkId: 'me' },
    )).toBe(false);
    expect(localPlayerWonFromSync(
      { winnerTeam: null, winnerName: 'Me' },
      { teamId: null, name: 'Me' },
    )).toBe(true);
  });
});

describe('хост наполняет players[] авторитетными строками', () => {
  it('toSyncPacket отдаёт kills/deaths/networkId и winnerId победителя', () => {
    const { hooks, run } = makeHooks();
    const rt = new MatchRuntime(hooks);
    rt.replication = 'host';
    run.score = 700;
    rt.update(1 / 60, tanks(
      fakePlayer({ kills: 7, deaths: 2, networkId: 'me' }),
      {
        id: 2, name: 'Rival', isPlayer: false, networkId: 'bot:0', teamId: null,
        alive: true, kills: 3, deaths: 1, invulnT: 0,
      } as unknown as TankEntity,
    ), null);

    const packet = rt.toSyncPacket();
    expect(packet.players).toEqual([
      { networkId: 'me', name: 'Ace', kills: 7, deaths: 2, score: 700, bestStreak: 0 },
      { networkId: 'bot:0', name: 'Rival', kills: 3, deaths: 1, score: 300, bestStreak: 0 },
    ]);

    // DM-победа по лимиту: winnerId = networkId лидера, а не имя.
    run.matchTime = rt.config.timeLimitSec;
    rt.update(1 / 60, tanks(
      fakePlayer({ kills: 7, deaths: 2, networkId: 'me' }),
    ), null);
    const end = rt.toSyncPacket(true);
    expect(end.ended).toBe(true);
    expect(end.winnerName).toBe('Ace');
    expect(end.winnerId).toBe('me');
  });
});

describe('чистые хелперы границы доверия', () => {
  it('sanitizeSyncPlayers выкидывает мусорные строки', () => {
    const rows = sanitizeSyncPlayers([
      { networkId: 'me', name: 'Ace', kills: 2, deaths: 1, score: 200, bestStreak: 2 },
      { networkId: '', name: 'Без id' },
      null,
      'мусор',
      { networkId: 'x', kills: Number.NaN, deaths: -1 },
    ]);
    expect(rows).toEqual([
      { networkId: 'me', name: 'Ace', kills: 2, deaths: 1, score: 200, bestStreak: 2 },
      { networkId: 'x', name: '', kills: 0, deaths: 0 },
    ]);
    expect(sanitizeSyncPlayers(undefined)).toEqual([]);
  });

  it('findSyncPlayer ищет строку по networkId', () => {
    const rows = sanitizeSyncPlayers([{ networkId: 'me', kills: 1 }]);
    expect(findSyncPlayer(rows, 'me')?.kills).toBe(1);
    expect(findSyncPlayer(rows, 'nobody')).toBeNull();
    expect(findSyncPlayer(undefined, 'me')).toBeNull();
    expect(findSyncPlayer(rows, null)).toBeNull();
  });

  it('reconcilePlayerScore без hostScore берёт локальное значение', () => {
    expect(reconcilePlayerScore(undefined, 950, 7)).toBe(950);
    expect(reconcilePlayerScore(700, 950, 7)).toBe(950);
    expect(reconcilePlayerScore(700, 700, 7)).toBe(700);
  });

  it('isFinitePosePacket режет позу с нефинитными числами', () => {
    const good: TankTransformPacket = {
      userId: 'u1', x: 1, y: 0, z: -2, yaw: 0.5, aimYaw: 0.5, barrelPitch: 0,
      speed: 9, boosting: false, timestamp: 1,
    };
    expect(isFinitePosePacket(good)).toBe(true);
    expect(isFinitePosePacket({ ...good, y: undefined })).toBe(true);
    expect(isFinitePosePacket({ ...good, x: Number.NaN })).toBe(false);
    expect(isFinitePosePacket({ ...good, z: Infinity })).toBe(false);
    expect(isFinitePosePacket({ ...good, yaw: Number.NaN })).toBe(false);
    expect(isFinitePosePacket({ ...good, speed: -Infinity })).toBe(false);
  });
});