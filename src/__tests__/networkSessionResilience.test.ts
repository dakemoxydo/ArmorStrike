/**
 * Устойчивость NetworkSession на границе сети:
 *
 *  · handleEvent отбрасывает не-объектный и «мусорный» payload вместо того,
 *    чтобы уронить обработчик на разыменовании (findTank/spawnPeer);
 *  · клиентский сторож по тишине match_sync закрывает разрыв, который
 *    presence-латч не видит: ни одного presence-события нет, поэтому серия
 *    пропусков не набирается никогда;
 *  · countHumans считает только «рождённых» пиров (hasPose), иначе хост
 *    занимал бы слот ещё не пришедшим игроком и недоберёл бота.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';

let nextTankId = 100;

function makeFakeTank(name: string) {
  const group = new THREE.Group();
  return {
    id: nextTankId++,
    name,
    isPlayer: false,
    isRemote: false,
    networkId: null as string | null,
    teamId: null as string | null,
    kills: 0,
    deaths: 0,
    alive: true,
    health: 100,
    maxHealth: 100,
    deathT: 0,
    invulnT: 0,
    throttle: 0,
    steer: 0,
    speed: 0,
    boostEnergy: 1,
    fireTimer: 0,
    critChance: 0,
    yaw: 0,
    aimYaw: 0,
    barrelPitch: 0,
    boosting: false,
    position: new THREE.Vector3(0, 0, 0),
    visual: {
      group,
      ring: new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial()),
      bodyMats: [{ color: { setHex: vi.fn() }, emissive: { setScalar: vi.fn() } }],
      bodyBaseColors: [0x445566],
      barrelGroup: new THREE.Group(),
    },
    weapon: null,
    dispose: vi.fn(),
  };
}

// Сборка удалённого танка/оружия заменена заглушкой (как в remotePeerLifecycle).
vi.mock('../game/PlayerFactory', () => ({
  createTankEntity: async (input: { name: string }) => makeFakeTank(input.name),
  createWeapon: () => ({ setFire: vi.fn(), onRespawn: vi.fn(), dispose: vi.fn() }),
}));

vi.mock('../game/match/rosterSpawn', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../game/match/rosterSpawn')>();
  return { ...actual, makeBot: vi.fn() };
});

import { NetworkSession } from '../game/network/NetworkSession';
import { RemotePlayerManager } from '../game/network/RemotePlayerManager';
import { makeBot } from '../game/match/rosterSpawn';
import type { CombatSystem } from '../game/CombatSystem';
import type { GameSimulation } from '../game/engine/GameSimulation';
import type { BotEntry } from '../game/botSpawn';
import type { MultiplayerService } from '../game/network/multiplayerService';
import type { RoomData, TankTransformPacket } from '../game/network/types';
import type { TankEntity } from '../game/Tank';
import type { WeaponFactoryDeps } from '../game/PlayerFactory';
import type { GameEvent } from '../game/types';

// ── canvas stub для Nameplate (контракт как в remotePeerLifecycle.test.ts) ──
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

function makeService() {
  return {
    connectToRoom: vi.fn(),
    sendTransform: vi.fn(),
    sendFire: vi.fn(),
    sendDamage: vi.fn(),
    sendMatchSync: vi.fn(),
    sendPeerDespawn: vi.fn(),
    sendBlockDestroy: vi.fn(),
  } as unknown as MultiplayerService;
}

function makeRemotesDouble() {
  return {
    onSilentDeath: null,
    update: vi.fn(),
    getPeers: () => [],
    removePeer: vi.fn(),
    spawnPeer: vi.fn().mockResolvedValue(null),
    handleTransform: vi.fn(),
    handleFire: vi.fn(),
    tankByNetworkId: () => null,
  } as unknown as RemotePlayerManager;
}

function makeSim() {
  return {
    player: null,
    tanks: [] as TankEntity[],
    rosterGen: 0,
    nameplates: new Map(),
    bots: { bots: [] as unknown[] },
    match: { config: { dmBotCount: 1, teamSize: 5 }, applyHostSync: vi.fn() },
    run: { currentHull: 'hunter', currentTurret: 'cannon' },
    input: { wantsFire: false, enabled: true },
  };
}

function makeRoom(over: Partial<RoomData> = {}): RoomData {
  return {
    id: 'room-1', name: 'Комната', host_id: 'host-1', host_name: 'Хост',
    mode: 'deathmatch', map_id: 'factory', max_players: 4, player_count: 2,
    has_password: false, bots_enabled: true, status: 'in_progress',
    ...over,
  };
}

function makeSession(opts: {
  sim: ReturnType<typeof makeSim>;
  scene: THREE.Scene;
  isHost: boolean;
  emitEvent?: (e: GameEvent) => void;
  service?: MultiplayerService;
  remotes?: RemotePlayerManager;
  room?: RoomData;
}) {
  const combat = {
    setNetworkBridge: vi.fn(),
    playDeathPresentation: vi.fn(),
    applyReplicatedHit: vi.fn(),
    applyReplicatedBlock: vi.fn(),
  };
  const session = new NetworkSession({
    sim: opts.sim as unknown as GameSimulation,
    scene: opts.scene,
    weaponDeps: {} as WeaponFactoryDeps,
    combat: combat as unknown as CombatSystem,
    room: opts.room ?? makeRoom(),
    isHost: opts.isHost,
    localId: 'me',
    localTeam: null,
    service: opts.service ?? makeService(),
    remotes: opts.remotes ?? makeRemotesDouble(),
    emitEvent: opts.emitEvent,
  });
  return { session, combat };
}

/** Кадр без игрока: сторож обязан сработать до раннего выхода в tick. */
function tick(session: NetworkSession, dt = 0.016) {
  session.tick({
    dt,
    emit: vi.fn(),
    player: null as unknown as TankEntity,
    tanks: [],
    deathT: { value: -1 },
    prevReloading: { value: false },
  });
}

const countHumansOf = (session: NetworkSession) =>
  (session as unknown as { countHumans: () => number }).countHumans();

function posePacket(userId: string): TankTransformPacket {
  return {
    userId,
    x: 12,
    y: 0,
    z: -34,
    yaw: 0,
    aimYaw: 0,
    barrelPitch: 0,
    speed: 0,
    boosting: false,
    alive: true,
    timestamp: 1,
    hullId: 'hunter',
    turretId: 'railgun',
    username: 'Ace',
    team: 'alpha',
  };
}

// ── 1. Граница доверия: мусорный payload ──────────────────────────────────────

describe('handleEvent: мусорный payload отбрасывается, а не роняет обработчик', () => {
  const JUNK: Array<[string, unknown]> = [
    ['null', null],
    ['undefined', undefined],
    ['строка', 'tank_transform'],
    ['число', 42],
    ['булево', true],
  ];

  it.each(JUNK)('%s не доходит до обработчиков', (_label, junk) => {
    const sim = makeSim();
    const remotes = makeRemotesDouble();
    const { session, combat } = makeSession({ sim, scene: new THREE.Scene(), isHost: false, remotes });

    for (const event of ['tank_transform', 'weapon_fire', 'tank_damage', 'match_sync',
      'block_destroy', 'peer_despawn', 'presence_sync', 'player_left']) {
      expect(() => session.handleEvent(event, junk)).not.toThrow();
    }

    expect(remotes.handleTransform).not.toHaveBeenCalled();
    expect(remotes.handleFire).not.toHaveBeenCalled();
    expect(remotes.removePeer).not.toHaveBeenCalled();
    expect(combat.applyReplicatedHit).not.toHaveBeenCalled();
    expect(combat.applyReplicatedBlock).not.toHaveBeenCalled();
    expect(sim.match.applyHostSync).not.toHaveBeenCalled();
  });

  it('пустой/объектный userId отбрасывается (иначе фантомный пир по ключу-объекту)', () => {
    const remotes = makeRemotesDouble();
    const { session } = makeSession({ sim: makeSim(), scene: new THREE.Scene(), isHost: false, remotes });

    session.handleEvent('tank_transform', { userId: { evil: true }, x: 1, z: 2 });
    session.handleEvent('tank_transform', { x: 1, z: 2 });
    session.handleEvent('weapon_fire', { userId: 7, barrelPitch: 0 });
    session.handleEvent('tank_damage', { targetUserId: null, attackerUserId: 'x', damage: 5 });
    session.handleEvent('peer_despawn', { userId: {} });
    session.handleEvent('block_destroy', { blockId: 'nope' });
    session.handleEvent('player_left', [null, 'u1']);

    expect(remotes.handleTransform).not.toHaveBeenCalled();
    expect(remotes.handleFire).not.toHaveBeenCalled();
    expect(remotes.removePeer).not.toHaveBeenCalled();
  });

  it('валидные пакеты доходят по-прежнему и без копирования', () => {
    const sim = makeSim();
    const remotes = makeRemotesDouble();
    const { session, combat } = makeSession({ sim, scene: new THREE.Scene(), isHost: false, remotes });
    const pose = posePacket('u1');
    const sync = { timeSec: 12, ended: false };

    session.handleEvent('tank_transform', pose);
    session.handleEvent('weapon_fire', { userId: 'u1', barrelPitch: 0.2 });
    session.handleEvent('match_sync', sync);
    session.handleEvent('block_destroy', { blockId: 7 });
    session.handleEvent('peer_despawn', { userId: 'u2' });
    session.handleEvent('player_left', [{ userId: 'u3' }]);

    expect(remotes.handleTransform).toHaveBeenCalledWith(pose);
    expect(remotes.handleFire).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u1' }));
    expect(sim.match.applyHostSync).toHaveBeenCalledWith(sync, null);
    expect(combat.applyReplicatedBlock).toHaveBeenCalledWith(7);
    expect(remotes.removePeer).toHaveBeenCalledWith('u2');
    expect(remotes.removePeer).toHaveBeenCalledWith('u3');
  });

  it('мусорный match_sync не портит время матча (applyHostSync не вызывается)', () => {
    const sim = makeSim();
    const { session } = makeSession({ sim, scene: new THREE.Scene(), isHost: false });

    expect(() => session.handleEvent('match_sync', null)).not.toThrow();
    expect(sim.match.applyHostSync).not.toHaveBeenCalled();
  });
});

// ── 2. Сторож по тишине match_sync ────────────────────────────────────────────

describe('сторож match_sync: матч без хоста не длится вечно', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('тишина дольше окна выкидывает клиента из комнаты', () => {
    const emitEvent = vi.fn();
    const { session } = makeSession({ sim: makeSim(), scene: new THREE.Scene(), isHost: false, emitEvent });

    vi.advanceTimersByTime(5000);
    tick(session);
    expect(emitEvent).not.toHaveBeenCalled();

    vi.advanceTimersByTime(3100);
    tick(session);
    expect(emitEvent).toHaveBeenCalledWith({ type: 'hostDisconnected' });
  });

  it('пришедший match_sync продлевает жизнь сессии', () => {
    const emitEvent = vi.fn();
    const { session } = makeSession({ sim: makeSim(), scene: new THREE.Scene(), isHost: false, emitEvent });

    vi.advanceTimersByTime(7000);
    session.handleEvent('match_sync', { timeSec: 7 });
    vi.advanceTimersByTime(5000);
    tick(session);
    expect(emitEvent).not.toHaveBeenCalled();

    vi.advanceTimersByTime(3100);
    tick(session);
    expect(emitEvent).toHaveBeenCalledWith({ type: 'hostDisconnected' });
  });

  it('латч: после срабатывания событие не дублируется', () => {
    const emitEvent = vi.fn();
    const { session } = makeSession({ sim: makeSim(), scene: new THREE.Scene(), isHost: false, emitEvent });

    vi.advanceTimersByTime(9000);
    tick(session);
    vi.advanceTimersByTime(60000);
    tick(session);
    session.handleEvent('match_sync', { timeSec: 10 });

    expect(emitEvent).toHaveBeenCalledTimes(1);
  });

  it('хост у себя сторож не проверяет', () => {
    const emitEvent = vi.fn();
    const { session } = makeSession({ sim: makeSim(), scene: new THREE.Scene(), isHost: true, emitEvent });

    vi.advanceTimersByTime(60000);
    tick(session);

    expect(emitEvent).not.toHaveBeenCalled();
  });

  it('сторож не дублирует и не ломает presence-латч', () => {
    const emitEvent = vi.fn();
    const { session } = makeSession({ sim: makeSim(), scene: new THREE.Scene(), isHost: false, emitEvent });

    // presence без хоста: первый пропуск не выкидывает клиента.
    session.handleEvent('presence_sync', { me: [{ userId: 'me' }] });
    vi.advanceTimersByTime(1000);
    tick(session);
    expect(emitEvent).not.toHaveBeenCalled();

    // Подтверждённая серия попадает в тот же латч, а не в второй event.
    session.handleEvent('presence_sync', { me: [{ userId: 'me' }] });
    session.handleEvent('presence_sync', { me: [{ userId: 'me' }] });
    expect(emitEvent).toHaveBeenCalledTimes(1);
    expect(emitEvent).toHaveBeenCalledWith({ type: 'hostDisconnected' });
  });
});

// ── 3. countHumans: «рождённый» пир занимает слот ──────────────────────────────

describe('countHumans: зарегистрированный пир без первой позы слот не занимает', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(makeBot).mockImplementation(async () => ({
      tank: makeFakeTank('BOT') as unknown as TankEntity,
      ai: { wantsFire: false } as unknown as BotEntry['ai'],
      objectiveDuty: false,
    }));
  });

  /** Хост в комнате на 4 места: desired = min(4, dmBotCount + 1) - humans. */
  function makeHostSession() {
    const sim = makeSim();
    const scene = new THREE.Scene();
    const remotes = new RemotePlayerManager(
      scene,
      {} as WeaponFactoryDeps,
      sim.tanks,
      sim.nameplates as never,
    );
    const service = makeService();
    const { session } = makeSession({ sim, scene, isHost: true, remotes, service });
    return { sim, scene, remotes, service, session };
  }

  it('пир без позы не учитывается: бот остаётся, лишнего спавна нет', async () => {
    const { sim, remotes, service, session } = makeHostSession();

    session.bootstrapRoster();
    await vi.waitFor(() => expect(sim.bots.bots).toHaveLength(1));
    expect(vi.mocked(makeBot)).toHaveBeenCalledTimes(1);
    expect(countHumansOf(session)).toBe(1);

    // Пир зарегистрирован (как из presence), но ни одной позы ещё не было.
    await remotes.spawnPeer('u1', 'Ace', 'hunter', 'railgun', 'alpha');
    expect(countHumansOf(session)).toBe(1);

    // reconcileBots() без humanCount — единственная публичная дорога к countHumans().
    session.handleEvent('player_left', [{ userId: 'ghost' }]);

    expect(countHumansOf(session)).toBe(1);
    expect(sim.bots.bots).toHaveLength(1);
    expect(vi.mocked(makeBot)).toHaveBeenCalledTimes(1);
    expect(service.sendPeerDespawn).not.toHaveBeenCalled();
  });

  it('после первой позы пир занимает слот, и лишний бот уходит', async () => {
    const { sim, remotes, service, session } = makeHostSession();

    session.bootstrapRoster();
    await vi.waitFor(() => expect(sim.bots.bots).toHaveLength(1));
    await remotes.spawnPeer('u1', 'Ace', 'hunter', 'railgun', 'alpha');
    remotes.handleTransform(posePacket('u1'));

    expect(countHumansOf(session)).toBe(2);

    session.handleEvent('player_left', [{ userId: 'ghost' }]);

    expect(sim.bots.bots).toHaveLength(0);
    expect(vi.mocked(makeBot)).toHaveBeenCalledTimes(1);
    expect(service.sendPeerDespawn).toHaveBeenCalledWith('bot:0');
  });

  it('уход пира возвращает слот хостовому боту', async () => {
    const { sim, remotes, session } = makeHostSession();

    session.bootstrapRoster();
    await vi.waitFor(() => expect(sim.bots.bots).toHaveLength(1));
    await remotes.spawnPeer('u1', 'Ace', 'hunter', 'railgun', 'alpha');
    remotes.handleTransform(posePacket('u1'));
    session.handleEvent('player_left', [{ userId: 'ghost' }]);
    expect(sim.bots.bots).toHaveLength(0);

    // Уход «рождённого» пира → humans = 1 → хост доливает бота обратно.
    session.handleEvent('player_left', [{ userId: 'u1' }]);
    await vi.waitFor(() => expect(sim.bots.bots).toHaveLength(1));
    expect(countHumansOf(session)).toBe(1);
  });
});
