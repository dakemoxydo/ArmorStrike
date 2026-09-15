// ===== D1: таблица дежурств/ролей ростера по режимам vs AI_Bots.md =====
// Индексная модель зеркалит rosterSpawn.spawnMatchRoster:
//   DM      — makeBot(i, null)   для i в 0..dmBotCount-1;
//   TDM / CP — makeBot(i,'alpha') для i в 0..teamSize-2,
//              makeBot(i,'bravo') для i в teamSize-1..2*(teamSize-1).
// Дежурства: isObjectiveDuty(i) ≈ 50% (GDD band 40–60% на команду).
import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { configForMode, BOT_NORMAL } from '../game/match/matchConfig';
import { isObjectiveDuty } from '../game/match/aiObjective';
import { roleForBot } from '../game/aiRoles';
import { TURRET_IDS, HULL_IDS, TURRETS } from '../core/catalog';
import { BOT_TURRETS } from '../game/match/rosterSpawn';
import { AIController } from '../game/AI';
import { BotRoster } from '../game/BotRoster';
import { BotAiStage } from '../game/engine/stages/BotAiStage';
import { TankEntity, type TankVisual } from '../game/Tank';
import type { CaptureZoneState } from '../game/match/captureLogic';
import type { Arena } from '../game/Arena';
import type { MatchRuntime } from '../game/match/MatchRuntime';
import type { FrameContext } from '../game/engine/stages/types';

type RoleCount = { sniper: number; assault: number; standard: number };

/** Роль бота по индексу ростера (цикл турелей как в rosterSpawn.makeBot).
 * Сужение безопасно: elite закрыт gate'ом roleWave=1 (пинится тестом ниже). */
function roleAt(index: number): 'sniper' | 'assault' | 'standard' {
  const turret = BOT_TURRETS[index % BOT_TURRETS.length];
  return roleForBot(BOT_NORMAL.roleWave, index, turret) as 'sniper' | 'assault' | 'standard';
}

/** Корпус бота по индексу (прямой цикл каталога без блокировок). */
function hullAt(index: number): string {
  return HULL_IDS[index % HULL_IDS.length];
}

function countRoles(from: number, to: number): RoleCount {
  const out: RoleCount = { sniper: 0, assault: 0, standard: 0 };
  for (let i = from; i <= to; i++) out[roleAt(i)]++;
  return out;
}

function countDuty(from: number, to: number): number {
  let n = 0;
  for (let i = from; i <= to; i++) if (isObjectiveDuty(i)) n++;
  return n;
}

describe('D1: objective duty по режимам (AI_Bots.md ~50%)', () => {
  it('roleWave=1 — элита не спавнится (GDD: match-элита отключена)', () => {
    expect(BOT_NORMAL.roleWave).toBe(1);
    for (let i = 0; i < 12; i++) {
      const turret = TURRET_IDS[i % TURRET_IDS.length];
      expect(roleForBot(BOT_NORMAL.roleWave, i, turret)).not.toBe('elite');
    }
  });

  it('DM: 7 ботов — {снайпер 3, штурм 3, стандарт 1}, duty 4/7', () => {
    const cfg = configForMode('deathmatch');
    expect(cfg.dmBotCount).toBe(7);
    expect(countRoles(0, cfg.dmBotCount - 1)).toEqual({ sniper: 3, assault: 3, standard: 1 });
    // duty-флаг ставится всем режимам, но в DM он инертен (см. тест BotAiStage ниже).
    expect(countDuty(0, cfg.dmBotCount - 1)).toBe(4);
  });

  it('TDM/CP: duty-доля каждой команды в band 40–60% (GDD)', () => {
    for (const mode of ['team_deathmatch', 'capture_point'] as const) {
      const cfg = configForMode(mode);
      expect(cfg.teamSize).toBe(5);
      const allyCount = cfg.teamSize - 1; // индексы 0..3 — Alpha
      const alpha = countDuty(0, allyCount - 1);
      const bravo = countDuty(allyCount, 2 * allyCount); // индексы 4..8 — Bravo
      // Золотая таблица: Alpha 2/4 = 50%, Bravo 3/5 = 60% (край band'а, внутри).
      expect(alpha).toBe(2);
      expect(bravo).toBe(3);
      expect(alpha / allyCount).toBeGreaterThanOrEqual(0.4);
      expect(alpha / allyCount).toBeLessThanOrEqual(0.6);
      expect(bravo / cfg.teamSize).toBeGreaterThanOrEqual(0.4);
      expect(bravo / cfg.teamSize).toBeLessThanOrEqual(0.6);
    }
  });

  it('TDM/CP: каждая команда имеет все 3 роли (золотая таблица составов)', () => {
    for (const mode of ['team_deathmatch', 'capture_point'] as const) {
      const cfg = configForMode(mode);
      const allyCount = cfg.teamSize - 1;
      // Alpha (0..3): снайпер×2, штурм×1, стандарт×1.
      expect(countRoles(0, allyCount - 1)).toEqual({ sniper: 2, assault: 1, standard: 1 });
      // Bravo (4..8): снайпер×2, штурм×2, стандарт×1.
      expect(countRoles(allyCount, 2 * allyCount)).toEqual({ sniper: 2, assault: 2, standard: 1 });
    }
  });

  it('корпуса и башни циклически распределяются по каталогу 5×5', () => {
    expect(HULL_IDS).toEqual(['hunter', 'viking', 'mammoth', 'speedy', 'titan']);
    expect(BOT_TURRETS).toEqual(['railgun', 'flamethrower', 'cannon', 'gauss', 'isida']);
    for (let i = 0; i < 15; i++) {
      expect(hullAt(i)).toBe(HULL_IDS[i % 5]);
    }
    expect(roleAt(0)).toBe('sniper'); // railgun
    expect(roleAt(1)).toBe('assault'); // flamethrower
    expect(roleAt(2)).toBe('standard'); // cannon
    expect(roleAt(3)).toBe('sniper'); // gauss
    expect(roleAt(4)).toBe('assault'); // isida
  });

  it('флагман titan доступен ботам в ростерах', () => {
    expect(hullAt(4)).toBe('titan');
  });
});

// ===== D1 (behaviour): objectiveDuty двигает бота ТОЛЬКО в CP =====
function makeVisual(): TankVisual {
  const group = new THREE.Group();
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 1, 2);
  group.add(muzzle);
  const ring = new THREE.Mesh();
  return {
    group, hull: new THREE.Group(), turret: new THREE.Group(),
    barrelGroup: new THREE.Group(), muzzle, ring,
    bodyMats: [], bodyBaseColors: [],
    trackTex: null as unknown as THREE.CanvasTexture,
  };
}

const PARAMS = {
  maxHealth: 100, speed: 15, reverseSpeed: 9, turnSpeed: 2.9,
  turretSpeed: 9, damage: 32, shotCooldown: 0.336,
  weaponType: 'cannon' as const, range: 75,
};

function makeTank(teamId: 'alpha' | null, isPlayer = false): TankEntity {
  const t = new TankEntity(isPlayer ? 'ВЫ' : 'BOT', isPlayer, PARAMS, makeVisual());
  t.teamId = teamId;
  return t;
}

function makeCtx(player: TankEntity, tanks: TankEntity[]): FrameContext {
  return {
    dt: 0.016,
    emit: vi.fn(),
    player,
    tanks,
    deathT: { value: -1 },
    prevReloading: { value: false },
  };
}

function makeStageRoster(bot: TankEntity) {
  const roster = new BotRoster();
  const ai = new AIController(bot, BOT_NORMAL.sightRange, TURRETS.cannon.range, BOT_NORMAL.aimError);
  roster.bots.push({ tank: bot, ai, objectiveDuty: true });
  const spy = vi.spyOn(ai, 'update').mockImplementation(() => {});
  return { roster, spy };
}

function makeStage(
  roster: BotRoster,
  mode: 'deathmatch' | 'capture_point',
  zones: CaptureZoneState[],
): BotAiStage {
  const arena = { colliders: [], half: 150 } as unknown as Arena;
  const match = { mode, getCaptureZones: () => zones } as unknown as MatchRuntime;
  return new BotAiStage(roster, arena, match);
}

describe('D1: BotAiStage — duty-флаг двигает только CP', () => {
  it('DM: objectiveDuty=true не даёт moveHint (флаг инертен)', () => {
    const bot = makeTank(null);
    const player = makeTank(null, true);
    const { roster, spy } = makeStageRoster(bot);
    const stage = makeStage(roster, 'deathmatch', []);
    stage.update(makeCtx(player, [player, bot]));
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][1].moveHint).toBeNull();
  });

  it('CP: duty-бот получает moveHint = центр выбранной зоны', () => {
    const bot = makeTank('alpha');
    const player = makeTank('alpha', true); // союзник → фокуса-врага нет
    player.position.set(-100, 0, 0);
    const { roster, spy } = makeStageRoster(bot);
    const zones: CaptureZoneState[] = [{
      id: 'A', x: 40, z: 0, radius: 20,
      owner: null, progress: 0, actor: null, contested: false,
    }];
    const stage = makeStage(roster, 'capture_point', zones);
    stage.update(makeCtx(player, [player, bot]));
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][1].moveHint).toEqual({ x: 40, z: 0 });
  });
});
