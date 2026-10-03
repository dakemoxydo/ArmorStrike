import * as THREE from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { spawnMatchRoster, type RosterSpawnCtx } from '../game/match/rosterSpawn';
import { configForMode } from '../game/match/matchConfig';
import type { TeamId } from '../game/match/matchTypes';
import { ALPHA_SPAWN_POINTS, BRAVO_SPAWN_POINTS } from '../game/match/spawnPoints';
import type { WeaponFactoryDeps } from '../game/PlayerFactory';

/**
 * Спавн игрока обязан смотреть В арену. Конвенция движения:
 * forward = (sin(yaw), 0, cos(yaw)), значит yaw = 0 → +Z. База bravo лежит на
 * северной стороне (z > 0), и старая константа yaw = 0 разворачивала игрока
 * (и его камеру, GameModeController делает sim.input.look.reset(player.yaw)) в
 * северную стену. Боты и респавн используют yaw = atan2(-x, -z) — тест
 * требует того же для игрока.
 *
 * TankEntity собирается тяжёлой процедурной геометрией, поэтому createTankEntity /
 * createWeapon / Nameplate / AIController замоканы: проверяется реальный код
 * spawnMatchRoster (выбор точки и yaw), а не только формула.
 */

vi.mock('../game/PlayerFactory', () => ({
  createTankEntity: vi.fn(async (input: { isPlayer: boolean }) => makeFakeTank(input.isPlayer)),
  createWeapon: vi.fn(() => ({ onRespawn: () => {} })),
}));

vi.mock('../game/nameplate', () => ({
  Nameplate: class {
    sprite = new THREE.Object3D();
    dispose = vi.fn();
  },
}));

vi.mock('../game/AI', () => ({
  AIController: class {
    constructor(..._args: unknown[]) {}
  },
}));

let nextId = 1;

function makeFakeTank(isPlayer: boolean) {
  const group = new THREE.Group();
  return {
    id: nextId++,
    name: isPlayer ? 'ВЫ' : 'Б-1',
    isPlayer,
    yaw: 0,
    aimYaw: 0,
    turretYaw: 0,
    kills: 0,
    deaths: 0,
    invulnT: 0,
    teamId: null as TeamId,
    weapon: null as unknown,
    // TankEntity отдаёт position геттером на visual.group.position.
    get position(): THREE.Vector3 {
      return group.position;
    },
    visual: { group, ring: { material: new THREE.MeshBasicMaterial() } },
  };
}

/** Структурный срез TankEntity, который реально трогает placeTank. */
type PlacedTank = {
  yaw: number;
  aimYaw: number;
  position: THREE.Vector3;
};

function makeCtx(playerTeam?: TeamId): RosterSpawnCtx {
  return {
    scene: new THREE.Scene(),
    weaponDeps: {} as unknown as WeaponFactoryDeps,
    tanks: [],
    nameplates: new Map(),
    hullId: 'hunter',
    turretId: 'railgun',
    playerTeam,
  };
}

/** forward = (sin(yaw), 0, cos(yaw)) — та же формула, что в TankMotionSystem. */
function forwardXz(yaw: number): { x: number; z: number } {
  return { x: Math.sin(yaw), z: Math.cos(yaw) };
}

/** Точка смотрит в центр арены, если forward сонаправлен с (-x, -z). */
function dotTowardCenter(tank: PlacedTank): number {
  const f = forwardXz(tank.yaw);
  const len = Math.hypot(tank.position.x, tank.position.z) || 1;
  return f.x * (-tank.position.x / len) + f.z * (-tank.position.z / len);
}

/** Спавн по rng: pickPointIndex берёт farUnused[floor(rng() * n) % n]. */
function stubRng(rngValue: number) {
  return vi.spyOn(Math, 'random').mockReturnValue(rngValue);
}

let rngSpy: ReturnType<typeof vi.spyOn> | null = null;

beforeEach(() => {
  nextId = 1;
});

afterEach(() => {
  rngSpy?.mockRestore();
  rngSpy = null;
});

describe('spawnMatchRoster: игрок смотрит в арену', () => {
  it('bravo: yaw развёрнут в сторону арены, а не в северную стену', async () => {
    for (const [rngValue, expected] of [
      [0, BRAVO_SPAWN_POINTS[0]],
      [0.5, BRAVO_SPAWN_POINTS[3]],
      [0.95, BRAVO_SPAWN_POINTS[6]],
    ] as const) {
      rngSpy = stubRng(rngValue);
      const cfg = { ...configForMode('team_deathmatch'), teamSize: 2 };
      const res = await spawnMatchRoster(cfg, makeCtx('bravo'));
      rngSpy.mockRestore();
      rngSpy = null;

      const player = res.player as unknown as PlacedTank;
      expect([player.position.x, player.position.z]).toEqual(expected);
      expect(expected[1]).toBeGreaterThan(0); // база bravo — северная сторона
      // Регресс: yaw = 0 даёт forward = +Z — ровно в северную стену.
      expect(dotTowardCenter(player)).toBeCloseTo(1, 5);
      expect(forwardXz(player.yaw).z).toBeLessThan(0);
      // Камера стартует с sim.input.look.reset(player.yaw) — aimYaw тоже смотрит туда.
      expect(player.aimYaw).toBe(player.yaw);
    }
  });

  it('alpha: остаётся развёрнут в арену (база на юге, yaw = 0 совпадал)', async () => {
    rngSpy = stubRng(0);
    const res = await spawnMatchRoster(
      { ...configForMode('team_deathmatch'), teamSize: 2 },
      makeCtx('alpha'),
    );
    rngSpy.mockRestore();
    rngSpy = null;

    const player = res.player as unknown as PlacedTank;
    expect([player.position.x, player.position.z]).toEqual(ALPHA_SPAWN_POINTS[0]);
    expect(player.yaw).toBeCloseTo(0, 5);
    expect(dotTowardCenter(player)).toBeCloseTo(1, 5);
  });

  it('deathmatch: игрок на (0, -120) смотрит в +Z, к арене', async () => {
    const res = await spawnMatchRoster(
      { ...configForMode('deathmatch'), dmBotCount: 0 },
      makeCtx(null),
    );
    const player = res.player as unknown as PlacedTank;
    expect([player.position.x, player.position.z]).toEqual([0, -120]);
    expect(player.yaw).toBeCloseTo(0, 5);
    expect(dotTowardCenter(player)).toBeCloseTo(1, 5);
    expect(player.aimYaw).toBe(player.yaw);
  });

  it('боты обеих команд по-прежнему смотрят в арену', async () => {
    rngSpy = stubRng(0.31);
    const res = await spawnMatchRoster(
      { ...configForMode('capture_point'), teamSize: 2 },
      makeCtx('bravo'),
    );
    rngSpy.mockRestore();
    rngSpy = null;

    expect(res.bots).toHaveLength(3); // 1 союзник + 2 противника
    for (const bot of res.bots) {
      expect(dotTowardCenter(bot.tank as unknown as PlacedTank)).toBeCloseTo(1, 5);
    }
    // Союзники — bravo (север), противники — alpha (юг): обе базы в арену.
    const zs = res.bots.map((b) => (b.tank as unknown as PlacedTank).position.z);
    expect(zs.filter((z) => z > 0).length).toBeGreaterThan(0);
    expect(zs.filter((z) => z < 0).length).toBeGreaterThan(0);
  });
});