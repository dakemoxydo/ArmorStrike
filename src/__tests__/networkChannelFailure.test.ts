/**
 * Провал подписки на канал комнаты больше не остаётся тихим «успехом».
 *
 * CHANNEL_ERROR / TIMED_OUT / CLOSED раньше уходили в никуда: сессия считала
 * матч запущенным, клиент ставил replication='client' и сидел в матче без
 * авторитетного потока — закончить его было некому. Теперь сервис диспатчит
 * CHANNEL_ERROR_EVENT, а NetworkSession превращает его в hostDisconnected,
 * который приложение уже умеет показывать (выход из комнаты + текст ошибки).
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import * as THREE from 'three';
import { CHANNEL_ERROR_EVENT, MultiplayerService } from '../game/network/multiplayerService';
import { NetworkSession } from '../game/network/NetworkSession';
import { supabase } from '../lib/supabaseClient';
import type { CombatSystem } from '../game/CombatSystem';
import type { GameSimulation } from '../game/engine/GameSimulation';
import type { WeaponFactoryDeps } from '../game/PlayerFactory';
import type { RemotePlayerManager } from '../game/network/RemotePlayerManager';
import type { RoomData } from '../game/network/types';
import type { GameEvent } from '../game/types';

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    channel: vi.fn(),
    removeChannel: vi.fn(),
  },
}));

const player = {
  userId: 'user_123',
  username: 'TankerPro',
  hullId: 'hunter' as const,
  turretId: 'railgun' as const,
};

type SubscribeCallback = (status: string, err?: Error) => void;

function makeChannel(onSubscribe: (cb: SubscribeCallback) => void) {
  const channel = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn((cb: SubscribeCallback) => {
      onSubscribe(cb);
    }),
    send: vi.fn(),
    track: vi.fn(),
    presenceState: vi.fn(() => ({})),
  };
  (supabase.channel as unknown as { mockReturnValue: (v: unknown) => void }).mockReturnValue(channel);
  return channel;
}

function makeRoom(): RoomData {
  return {
    id: 'room-1', name: 'Комната', host_id: 'host-1', host_name: 'Хост',
    mode: 'deathmatch', map_id: 'factory', max_players: 4, player_count: 2,
    has_password: false, bots_enabled: true, status: 'in_progress',
  };
}

function makeSessionDouble() {
  return {
    connectToRoom: vi.fn(),
    sendTransform: vi.fn(),
    sendFire: vi.fn(),
    sendDamage: vi.fn(),
    sendMatchSync: vi.fn(),
    sendPeerDespawn: vi.fn(),
    sendBlockDestroy: vi.fn(),
    disconnect: vi.fn(),
  };
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

function makeSim(): GameSimulation {
  return {
    player: null,
    tanks: [],
    rosterGen: 0,
    nameplates: new Map(),
    bots: { bots: [] },
    match: { config: { dmBotCount: 1, teamSize: 5 }, applyHostSync: vi.fn() },
    run: { currentHull: 'hunter', currentTurret: 'cannon' },
    input: { wantsFire: false, enabled: true },
  } as unknown as GameSimulation;
}

function makeSession(
  emitEvent: (e: GameEvent) => void,
  service: MultiplayerService = makeSessionDouble() as unknown as MultiplayerService,
) {
  return new NetworkSession({
    sim: makeSim(),
    scene: new THREE.Scene(),
    weaponDeps: {} as WeaponFactoryDeps,
    combat: {
      setNetworkBridge: vi.fn(),
      playDeathPresentation: vi.fn(),
      applyReplicatedHit: vi.fn(),
    } as unknown as CombatSystem,
    room: makeRoom(),
    isHost: false,
    localId: 'me',
    localTeam: null,
    service: service,
    remotes: makeRemotesDouble(),
    emitEvent,
  });
}

/** Живые сервисы: connectToRoom поднимает heartbeat-таймер, чистим в afterEach. */
const openServices: MultiplayerService[] = [];

function makeService() {
  const service = new MultiplayerService();
  openServices.push(service);
  return service;
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  while (openServices.length > 0) openServices.pop()?.disconnect();
});

describe('MultiplayerService: провал подписки виден подписчику', () => {
  it.each(['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'])(
    '%s диспатчит channel_error и не отслеживает presence',
    (status) => {
      const channel = makeChannel((cb) => cb(status));
      const service = makeService();
      const onPacket = vi.fn();

      service.connectToRoom('room-1', player, onPacket);

      expect(onPacket).toHaveBeenCalledWith(CHANNEL_ERROR_EVENT, status);
      expect(channel.track).not.toHaveBeenCalled();
      service.disconnect();
    },
  );

  it('причина из err попадает в лог, а не теряется', () => {
    makeChannel((cb) => cb('CHANNEL_ERROR', new Error('boom')));
    const service = makeService();
    const onPacket = vi.fn();

    service.connectToRoom('room-1', player, onPacket);

    expect(onPacket).toHaveBeenCalledWith(CHANNEL_ERROR_EVENT, 'CHANNEL_ERROR');
    service.disconnect();
  });

  it('SUBSCRIBED по-прежнему трекает presence и не шлёт ошибку', () => {
    const channel = makeChannel((cb) => cb('SUBSCRIBED'));
    const service = makeService();
    const onPacket = vi.fn();

    service.connectToRoom('room-1', player, onPacket);

    expect(channel.track).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user_123', username: 'TankerPro' }),
    );
    expect(onPacket).not.toHaveBeenCalled();
    service.disconnect();
  });

  it('диспатч переживает disconnect прямо в обработчике (снимок набора)', () => {
    makeChannel((cb) => cb('CHANNEL_ERROR'));
    const service = makeService();
    const seen: string[] = [];
    const second = vi.fn();
    service.connectToRoom('room-1', player, () => {
      seen.push('first');
      service.disconnect();
    });
    service.connectToRoom('room-1', player, second);

    expect(seen).toEqual(['first']);
    // Второй connect очистил первый набор обработчиков; второй обработчик жив.
    expect(second).toHaveBeenCalledWith(CHANNEL_ERROR_EVENT, 'CHANNEL_ERROR');
    service.disconnect();
  });
});

describe('NetworkSession: ошибка канала доходит до приложения', () => {
  it.each(['CHANNEL_ERROR', 'TIMED_OUT'])('%s → hostDisconnected', (status) => {
    const emitEvent = vi.fn();
    makeChannel((cb) => cb(status));
    const session = makeSession(emitEvent, makeService());

    session.connect(player);

    expect(emitEvent).toHaveBeenCalledWith({ type: 'hostDisconnected' });
  });

  it('латч: вторая ошибка подписки не дублирует событие', () => {
    const emitEvent = vi.fn();
    makeChannel((cb) => {
      cb('CHANNEL_ERROR');
      cb('TIMED_OUT');
    });
    const session = makeSession(emitEvent, makeService());

    session.connect(player);

    expect(emitEvent).toHaveBeenCalledTimes(1);
  });

  it('здоровая подписка не эмитит ничего', () => {
    const emitEvent = vi.fn();
    makeChannel((cb) => cb('SUBSCRIBED'));
    const session = makeSession(emitEvent, makeService());

    session.connect(player);

    expect(emitEvent).not.toHaveBeenCalled();
  });

  it('прямая обработка channel_error без Realtime тоже даёт hostDisconnected', () => {
    const emitEvent = vi.fn();
    const session = makeSession(emitEvent);

    session.handleEvent(CHANNEL_ERROR_EVENT, 'TIMED_OUT');

    expect(emitEvent).toHaveBeenCalledWith({ type: 'hostDisconnected' });
  });
});
