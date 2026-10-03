/**
 * Жизненный цикл сетевого пира: спавн, поза, уход.
 *
 *  · пир рождается на спавн-точке команды и `alive = false` до первого
 *    tank_transform — иначе он стоял бы в (0,0,0) (внутри зоны захвата на всех
 *    картах) и давал presence своей команде ещё до первого пакета;
 *  · removePeer отменяет спавн «в полёте» (иначе фантом живёт 15 секунд по
 *    таймауту и считается в humans) и чистит буферы, иначе переподключившийся
 *    тот же userId получает устаревшую позу/выстрел из очереди;
 *  · поза с нефинитными числами отбрасывается целиком.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as THREE from 'three';

let nextTankId = 1;
let createCalls = 0;
const spawnQueue: Array<() => void> = [];
let deferSpawns = false;

function makeFakeTank(name: string) {
  const group = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
  return {
    id: nextTankId++,
    name,
    isPlayer: false,
    isRemote: false,
    networkId: null,
    teamId: null,
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
    position: group.position,
    visual: {
      group,
      ring,
      bodyMats: [{ color: { setHex: vi.fn() }, emissive: { setScalar: vi.fn() } }],
      bodyBaseColors: [0x445566],
      barrelGroup: new THREE.Group(),
    },
    weapon: null,
    dispose: vi.fn(),
  };
}

// Сборка танка/оружия заменена заглушкой: нужен управляемый await, чтобы
// поймать окно «spawnPeer в полёте».
vi.mock('../game/PlayerFactory', () => ({
  createTankEntity: async (input: { name: string }) => {
    createCalls += 1;
    if (deferSpawns) {
      await new Promise<void>((resolve) => {
        spawnQueue.push(resolve);
      });
    }
    return makeFakeTank(input.name);
  },
  createWeapon: () => ({
    setFire: vi.fn(),
    onRespawn: vi.fn(),
    dispose: vi.fn(),
  }),
}));

import { RemotePlayerManager } from '../game/network/RemotePlayerManager';
import { ALPHA_SPAWN_POINTS, BRAVO_SPAWN_POINTS, FFA_SPAWN_POINTS } from '../game/match/spawnPoints';
import { CAPTURE, countPresenceInZone } from '../game/match/captureLogic';
import type { TankEntity } from '../game/Tank';
import type { TankTransformPacket, WeaponFirePacket } from '../game/network/types';

// ── canvas stub для Nameplate (контракт как в matchRuntime.test.ts) ──
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

function spawnPacket(over: Partial<TankTransformPacket> = {}): TankTransformPacket {
  return {
    userId: 'u1',
    x: 40,
    y: 0,
    z: -40,
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
    ...over,
  };
}

function firePacket(over: Partial<WeaponFirePacket> = {}): WeaponFirePacket {
  return {
    userId: 'u1',
    turretId: 'railgun',
    origin: [0, 1.2, 0],
    dir: [0, 0, 1],
    barrelPitch: 0,
    timestamp: 1,
    ...over,
  };
}

/** Разрешает отложенные createTankEntity. */
function flushSpawns(): void {
  while (spawnQueue.length > 0) spawnQueue.shift()?.();
}

function makeMgr() {
  const scene = new THREE.Scene();
  const tanksList: TankEntity[] = [];
  const nameplates = new Map<number, never>();
  const mgr = new RemotePlayerManager(scene, {} as never, tanksList, nameplates as never);
  const buffers = mgr as unknown as {
    pendingFire: Map<string, unknown>;
    pendingTransform: Map<string, unknown>;
  };
  return { mgr, scene, tanksList, nameplates, buffers };
}

const inPool = (pool: readonly [number, number][], t: TankEntity) =>
  pool.some(([x, z]) => x === t.position.x && z === t.position.z);

const centerZone = { x: 0, z: 0, radius: CAPTURE.radius };

beforeEach(() => {
  spawnQueue.length = 0;
  createCalls = 0;
  deferSpawns = false;
});

describe('spawnPeer — фантомный пир в зоне захвата', () => {
  it('стартует на спавн-точке своей команды, а не в (0,0,0)', async () => {
    const { mgr, tanksList } = makeMgr();
    const alpha = (await mgr.spawnPeer('u1', 'Ace', 'hunter', 'railgun', 'alpha'))!;
    const bravo = (await mgr.spawnPeer('u2', 'Bravo', 'hunter', 'railgun', 'bravo'))!;
    const ffa = (await mgr.spawnPeer('u3', 'Ffa', 'hunter', 'railgun', null))!;

    expect(inPool(ALPHA_SPAWN_POINTS, alpha)).toBe(true);
    expect(inPool(BRAVO_SPAWN_POINTS, bravo)).toBe(true);
    expect(inPool(FFA_SPAWN_POINTS, ffa)).toBe(true);
    expect(tanksList).toHaveLength(3);
  });

  it('до первого transform танк не жив — presence в зоне B пустая', async () => {
    const { mgr, tanksList } = makeMgr();
    const tank = (await mgr.spawnPeer('u1', 'Ace', 'hunter', 'railgun', 'alpha'))!;

    expect(tank.alive).toBe(false);
    expect(countPresenceInZone(centerZone, tanksList)).toEqual({ alpha: 0, bravo: 0 });

    mgr.handleTransform(spawnPacket({ x: 5, z: 5 }));
    expect(tank.alive).toBe(true);
    expect(tank.position.x).toBe(5);
    expect(tank.position.z).toBe(5);
    expect(countPresenceInZone(centerZone, tanksList)).toEqual({ alpha: 1, bravo: 0 });
  });

  it('нефинитная поза отбрасывается: танк не рождается и остаётся на спавне', async () => {
    const { mgr, tanksList } = makeMgr();
    const tank = (await mgr.spawnPeer('u1', 'Ace', 'hunter', 'railgun', 'alpha'))!;

    mgr.handleTransform(spawnPacket({ x: Number.NaN, alive: true }));
    mgr.handleTransform(spawnPacket({ z: Infinity, alive: true }));
    mgr.handleTransform(spawnPacket({ yaw: Number.NaN, alive: true }));

    expect(tank.alive).toBe(false);
    expect(inPool(ALPHA_SPAWN_POINTS, tank)).toBe(true);
    expect(countPresenceInZone(centerZone, tanksList)).toEqual({ alpha: 0, bravo: 0 });
  });
});

describe('removePeer — отмена спавна в полёте и чистка буферов', () => {
  it('уход во время await: танк утилизирован, peer не зарегистрирован', async () => {
    const { mgr, tanksList } = makeMgr();
    deferSpawns = true;
    const inflight = mgr.spawnPeer('u1', 'Ace', 'hunter', 'railgun', 'alpha');
    mgr.removePeer('u1');
    flushSpawns();

    expect(await inflight).toBeNull();
    expect(mgr.peerCount).toBe(0);
    expect(tanksList).toHaveLength(0);
    expect(mgr.tankByNetworkId('u1')).toBeNull();
  });

  it('буферы не переживают уход: перезаход не получает устаревшую позу', async () => {
    const { mgr, tanksList, buffers } = makeMgr();
    const spawnSpy = vi.spyOn(mgr, 'spawnPeer');
    // Позы и выстрел пришли до спавна — легли в буферы и запустили spawnPeer.
    mgr.handleTransform(spawnPacket({ x: 999, z: 999 }));
    mgr.handleFire(firePacket());
    expect(buffers.pendingTransform.size).toBe(1);
    expect(buffers.pendingFire.size).toBe(1);

    mgr.removePeer('u1');
    flushSpawns();
    expect(await spawnSpy.mock.results[0].value).toBeNull();
    expect(buffers.pendingTransform.size).toBe(0);
    expect(buffers.pendingFire.size).toBe(0);
    expect(createCalls).toBe(1);
    expect(mgr.peerCount).toBe(0);

    // Тот же userId заходит снова: доставлены свежие данные, не очередь.
    const tank = (await mgr.spawnPeer('u1', 'Ace', 'hunter', 'railgun', 'alpha'))!;
    expect(tanksList).toHaveLength(1);
    expect(tank.alive).toBe(false);
    expect(inPool(ALPHA_SPAWN_POINTS, tank)).toBe(true);

    mgr.handleTransform(spawnPacket({ x: 12, z: -34 }));
    expect(tank.alive).toBe(true);
    expect(tank.position.x).toBe(12);
    expect(tank.position.z).toBe(-34);
  });

  it('clear() отменяет висящие спавны (вызывающий чистит tanksList)', async () => {
    const { mgr, tanksList } = makeMgr();
    deferSpawns = true;
    const inflight = mgr.spawnPeer('u1', 'Ace', 'hunter', 'railgun', 'alpha');
    mgr.clear();
    flushSpawns();

    expect(await inflight).toBeNull();
    expect(tanksList).toHaveLength(0);
    expect(mgr.peerCount).toBe(0);
  });

  it('установленный peer удаляется из сцены и ростера', async () => {
    const { mgr, scene, tanksList } = makeMgr();
    const tank = (await mgr.spawnPeer('u1', 'Ace', 'hunter', 'railgun', 'alpha'))!;
    expect(scene.children).toHaveLength(2); // корпус + никнеймплейт

    mgr.removePeer('u1');
    expect(mgr.peerCount).toBe(0);
    expect(tanksList).toHaveLength(0);
    expect(scene.children).toHaveLength(0);
    expect(tank.dispose).toHaveBeenCalled();
  });
});