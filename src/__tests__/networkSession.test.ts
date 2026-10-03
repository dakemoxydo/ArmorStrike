// ===== NetworkSession: откат отброшенного спавна бота + латч hostDisconnected =====
// makeBot коммитит бота в sim.tanks/nameplates/сцену ДО разрешения await, поэтому
// гонка с clearTanks оставляла alive-танк без меша. hostDisconnected больше не
// эмитится на первом же пропуске presence.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import { NetworkSession } from '../game/network/NetworkSession';
import { makeBot, type RosterSpawnCtx } from '../game/match/rosterSpawn';
import { TankEntity, type TankVisual } from '../game/Tank';
import type { Nameplate } from '../game/nameplate';
import type { BotEntry } from '../game/botSpawn';
import type { GameSimulation } from '../game/engine/GameSimulation';
import type { CombatSystem } from '../game/CombatSystem';
import type { WeaponFactoryDeps } from '../game/PlayerFactory';
import type { MultiplayerService } from '../game/network/multiplayerService';
import type { RemotePlayerManager } from '../game/network/RemotePlayerManager';
import type { RoomData } from '../game/network/types';
import type { GameEvent } from '../game/types';

vi.mock('../game/match/rosterSpawn', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../game/match/rosterSpawn')>();
  return { ...actual, makeBot: vi.fn() };
});

const PARAMS = {
  maxHealth: 100, speed: 15, reverseSpeed: 9, turnSpeed: 2.9,
  turretSpeed: 9, damage: 32, shotCooldown: 0.336,
  weaponType: 'cannon' as const, range: 75,
};

function makeVisual(): TankVisual {
  const group = new THREE.Group();
  const muzzle = new THREE.Object3D();
  group.add(muzzle);
  return {
    group, hull: new THREE.Group(), turret: new THREE.Group(),
    barrelGroup: new THREE.Group(), muzzle, ring: new THREE.Mesh(),
    bodyMats: [], bodyBaseColors: [],
    trackTex: null as unknown as THREE.CanvasTexture,
  };
}

function makeTank(name = 'BOT'): TankEntity {
  return new TankEntity(name, false, PARAMS, makeVisual());
}

function makePlate() {
  const sprite = new THREE.Sprite();
  return { sprite, dispose: vi.fn() };
}

function makeSim(): GameSimulation {
  return {
    player: null,
    tanks: [],
    rosterGen: 0,
    nameplates: new Map(),
    bots: { bots: [] as BotEntry[] },
    match: { config: { dmBotCount: 1, teamSize: 5 } },
    run: { currentHull: 'hunter', currentTurret: 'cannon' },
    input: { wantsFire: false, enabled: true },
  } as unknown as GameSimulation;
}

function makeRoom(over: Partial<RoomData> = {}): RoomData {
  return {
    id: 'room-1', name: 'Комната', host_id: 'host-1', host_name: 'Хост',
    mode: 'deathmatch', map_id: 'factory', max_players: 2, player_count: 2,
    has_password: false, bots_enabled: true, status: 'in_progress',
    ...over,
  };
}

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

function makeRemotes() {
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

function makeSession(opts: {
  sim: GameSimulation;
  scene: THREE.Scene;
  room: RoomData;
  isHost: boolean;
  emitEvent: (e: GameEvent) => void;
  service?: MultiplayerService;
  remotes?: RemotePlayerManager;
}) {
  return new NetworkSession({
    sim: opts.sim,
    scene: opts.scene,
    weaponDeps: {} as WeaponFactoryDeps,
    combat: {
      setNetworkBridge: vi.fn(),
      playDeathPresentation: vi.fn(),
    } as unknown as CombatSystem,
    room: opts.room,
    isHost: opts.isHost,
    localId: 'me',
    localTeam: null,
    service: opts.service ?? makeService(),
    remotes: opts.remotes ?? makeRemotes(),
    emitEvent: opts.emitEvent,
  });
}

/** Кадр без игрока: checkHostGone обязан сработать до раннего выхода в tick. */
function tickNoPlayer(session: NetworkSession) {
  session.tick({
    dt: 0.016,
    emit: vi.fn(),
    player: null as unknown as TankEntity,
    tanks: [],
    deathT: { value: -1 },
    prevReloading: { value: false },
  });
}

/** Коммит бота в общее состояние — ровно как rosterSpawn.makeBot после await. */
function commitBot(ctx: RosterSpawnCtx, tank: TankEntity, plate: ReturnType<typeof makePlate>) {
  ctx.scene.add(plate.sprite);
  ctx.nameplates.set(tank.id, { plate: plate as unknown as Nameplate, color: 0x00ff00 });
  ctx.scene.add(tank.visual.group);
  ctx.tanks.push(tank);
}

describe('NetworkSession: отброшенный по rosterGen спавн не оставляет бота-призрака', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('откатывает tanks, nameplates, неймплейт и меш, закоммиченные makeBot', async () => {
    const sim = makeSim();
    const scene = new THREE.Scene();
    const stale = makeTank('STALE');
    const fresh = makeTank('FRESH');
    const stalePlate = makePlate();
    const freshPlate = makePlate();
    let calls = 0;
    vi.mocked(makeBot).mockImplementation(async (_slot, _team, _x, _z, ctx) => {
      calls += 1;
      const tank = calls === 1 ? stale : fresh;
      const plate = calls === 1 ? stalePlate : freshPlate;
      if (calls === 1) {
        // clearTanks проходит, пока makeBot собирает меш: rosterGen растёт,
        // ростер обнуляется — после этого makeBot коммитит бота уже в пустой мир.
        sim.rosterGen += 1;
        sim.nameplates.clear();
        sim.tanks.length = 0;
      }
      commitBot(ctx, tank, plate);
      return { tank, ai: {} as BotEntry['ai'], objectiveDuty: false };
    });

    const session = makeSession({
      sim, scene, room: makeRoom(), isHost: true, emitEvent: vi.fn(),
    });
    session.bootstrapRoster();
    await vi.waitFor(() => expect(sim.bots.bots).toHaveLength(1));

    // Бот-призрак: ни в tanks, ни в nameplates, ни в сцене.
    expect(sim.tanks).not.toContain(stale);
    expect(sim.nameplates.has(stale.id)).toBe(false);
    expect(scene.children).not.toContain(stale.visual.group);
    expect(scene.children).not.toContain(stalePlate.sprite);
    expect(stalePlate.dispose).toHaveBeenCalledWith(scene);

    // Живой бот второго спавна остался целым — тест не чистит лишнего.
    expect(sim.tanks).toContain(fresh);
    expect(sim.nameplates.has(fresh.id)).toBe(true);
    expect(scene.children).toContain(fresh.visual.group);
    expect(sim.bots.bots[0].tank).toBe(fresh);
  });

  it('не шлёт peer_despawn для отброшенного бота (клиенты о нём не знали)', async () => {
    const sim = makeSim();
    const scene = new THREE.Scene();
    const stale = makeTank('STALE');
    let calls = 0;
    vi.mocked(makeBot).mockImplementation(async (_slot, _team, _x, _z, ctx) => {
      calls += 1;
      const tank = calls === 1 ? stale : makeTank('FRESH');
      if (calls === 1) {
        sim.rosterGen += 1;
        sim.nameplates.clear();
        sim.tanks.length = 0;
      }
      commitBot(ctx, tank, makePlate());
      return { tank, ai: {} as BotEntry['ai'], objectiveDuty: false };
    });
    const service = makeService();

    const session = makeSession({
      sim, scene, room: makeRoom(), isHost: true, emitEvent: vi.fn(), service,
    });
    session.bootstrapRoster();
    await vi.waitFor(() => expect(sim.bots.bots).toHaveLength(1));

    expect(service.sendPeerDespawn).not.toHaveBeenCalled();
  });
});

describe('NetworkSession: hostDisconnected защищён от транзиентных разрывов', () => {
  const withHost = { host_id: 'host-1' };
  const withoutHost = { me: [{ userId: 'me' }] };
  const withHostPresence = {
    me: [{ userId: 'me' }],
    'host-1': [{ userId: 'host-1' }],
  };

  function makeClient(emitEvent: (e: GameEvent) => void) {
    const sim = makeSim();
    const scene = new THREE.Scene();
    const session = makeSession({
      sim, scene, room: makeRoom(withHost), isHost: false, emitEvent,
    });
    return { session, sim, scene };
  }

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('одиночный пропуск presence не выкидывает клиента', () => {
    const emitEvent = vi.fn();
    const { session } = makeClient(emitEvent);
    session.handleEvent('presence_sync', withoutHost);
    vi.advanceTimersByTime(1000);
    expect(emitEvent).not.toHaveBeenCalled();
  });

  it('подтверждённая серия пропусков вызывает hostDisconnected ровно один раз', () => {
    const emitEvent = vi.fn();
    const { session } = makeClient(emitEvent);
    session.handleEvent('presence_sync', withoutHost);
    session.handleEvent('presence_sync', withoutHost);
    expect(emitEvent).not.toHaveBeenCalled();
    session.handleEvent('presence_sync', withoutHost);
    expect(emitEvent).toHaveBeenCalledTimes(1);
    expect(emitEvent).toHaveBeenCalledWith({ type: 'hostDisconnected' });
    // Латч: последующие пропуски и тишина не эмитят повторно.
    session.handleEvent('presence_sync', withoutHost);
    vi.advanceTimersByTime(60000);
    expect(emitEvent).toHaveBeenCalledTimes(1);
  });

  it('вернувшийся хост сбрасывает серию пропусков', () => {
    const emitEvent = vi.fn();
    const { session } = makeClient(emitEvent);
    session.handleEvent('presence_sync', withoutHost);
    session.handleEvent('presence_sync', withoutHost);
    session.handleEvent('presence_sync', withHostPresence);
    session.handleEvent('presence_sync', withoutHost);
    session.handleEvent('presence_sync', withoutHost);
    expect(emitEvent).not.toHaveBeenCalled();
    session.handleEvent('presence_sync', withoutHost);
    expect(emitEvent).toHaveBeenCalledTimes(1);
  });

  it('тишина в presence дольше окна подтверждает разрыв даже без новых событий', () => {
    const emitEvent = vi.fn();
    const { session } = makeClient(emitEvent);
    session.handleEvent('presence_sync', withoutHost);
    expect(emitEvent).not.toHaveBeenCalled();
    // Тик раз в кадр — проверка не зависит от потока presence-событий.
    tickNoPlayer(session);
    expect(emitEvent).not.toHaveBeenCalled();
    vi.advanceTimersByTime(5000);
    tickNoPlayer(session);
    expect(emitEvent).toHaveBeenCalledTimes(1);
  });

  it('хост не вызывает hostDisconnected сам у себя', () => {
    const emitEvent = vi.fn();
    const scene = new THREE.Scene();
    const session = makeSession({
      sim: makeSim(), scene, room: makeRoom(), isHost: true, emitEvent,
    });
    session.handleEvent('presence_sync', withoutHost);
    session.handleEvent('presence_sync', withoutHost);
    session.handleEvent('presence_sync', withoutHost);
    expect(emitEvent).not.toHaveBeenCalled();
  });
});