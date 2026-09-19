// ===== Общие типы игрового слоя (без зависимости от Game) =====
import type { TurretId } from '../core/catalog';
import type { MatchModeId, TeamId, MatchEndReason } from './match/matchTypes';
import type { BeamMode } from './weapons/types';
import type { DamageFloatKind } from './damageFloats';
import type { MatchRewards } from './economy/matchRewards';

export type GameMode = 'menu' | 'garage' | 'playing' | 'over';
export type { MatchModeId, TeamId, MatchEndReason };

export interface HudSnapshot {
  mode: GameMode;
  paused: boolean;
  health: number;
  maxHealth: number;
  ammo: number;
  magazine: number;
  reloading: boolean;
  reloadProgress: number;
  isCharging?: boolean;
  boost: number;
  score: number;
  kills: number;
  deaths: number;
  /** Живые противники (союзники в TDM/CP не считаются) — радар, «ЦЕЛИ». */
  enemiesAlive: number;
  alive: boolean;
  /** Секунды до возрождения (0 когда игрок жив). */
  respawnInSec: number;
  timeSec: number;
  muted: boolean;
  turretId: TurretId;
  weaponName: string;
  /** Роль оружия («ЭНЕРГЕТИЧЕСКИЙ ЛУЧ») — не второе имя. */
  weaponLabel: string;
  weaponAccentClass: string;
  showScore: boolean;
  scoreboard: ScoreRow[];
  /** Active match mode (playing/over). */
  matchMode: MatchModeId;
  /** Win threshold for HUD (DM kills / TDM team kills / CP score). */
  winTarget: number;
  timeLimitSec: number;
  teamKillsAlpha: number;
  teamKillsBravo: number;
  /** CP domination score (also 0 outside CP). */
  teamScoreAlpha: number;
  teamScoreBravo: number;
  /** CP zone strip for HUD (empty outside capture_point). */
  capturePoints: CaptureHudPoint[];
  /**
   * Позиция прицела на РЕАЛЬНОЙ линии выстрела — экранные % вьюпорта
   * (ref-painted каждый кадр, см. GameLoop.updateCrosshair / useGameHud).
   */
  crossX: number;
  crossY: number;
  /** Захваченная цель для оружия с lock-on (Гаусс): экранные % и дистанция. */
  hasLockTarget?: boolean;
  lockTargetX?: number;
  lockTargetY?: number;
  lockTargetDist?: number;
  /**
   * Цель в секторе вертикальной автонаводки (AimHighlighter: конус + LOS,
   * с учётом holdSec) — driving the HUD crosshair `.is-locked` state.
   */
  isTargetLocked?: boolean;
  /** Входящий снайперский захват (вражеский Гаусс нацелен на игрока). */
  incomingLock?: boolean;
  /** Нано-луч «Изиды»: режим для HUD-статуса и тейнта полосы энергии. */
  beamMode?: BeamMode;
}

/** Lightweight CP zone for HUD / minimap. */
export interface CaptureHudPoint {
  id: 'A' | 'B' | 'C';
  x: number;
  z: number;
  owner: TeamId;
  progress: number;
  contested: boolean;
}

/**
 * Сколько CSS-пикселей каждого края вьюпорта занято UI гаража (safe zone).
 * Камера гаража центрирует предпросмотр танка в оставшемся свободном
 * прямоугольнике; источник истины — измерение DOM в `Garage.tsx`.
 */
export interface GarageViewportInset {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export type GameEvent =
  | { type: 'playerHit'; dir: number }
  | { type: 'enemyHit'; killed: boolean }
  | { type: 'kill'; victim: string; byPlayer: boolean }
  | { type: 'shotFired' }
  /**
   * Всплывающее число урона/лечения (п.1). `x`/`y` — проценты вьюпорта,
   * спроецированные GameLoop в том же кадре (мировая точка → камера).
   * HUD рисует их императивным DOM-пулом мимо React-состояния, поэтому канал
   * не участвует в гейте ререндеров (`ui/hudRenderGate.ts`).
   */
  | { type: 'damageFloat'; x: number; y: number; value: number; kind: DamageFloatKind }
  | { type: 'killStreak'; count: number; label: string }
  | {
      type: 'gameOver';
      score: number;
      kills: number;
      deaths: number;
      bestStreak: number;
      playerWon: boolean;
      winnerName: string | null;
      winnerTeam: TeamId;
      reason: MatchEndReason;
      mode: MatchModeId;
      matchTimeSec: number;
      teamKills: { alpha: number; bravo: number };
      teamScore: { alpha: number; bravo: number };
      rewards?: MatchRewards;
    }
  | { type: 'pauseChanged'; value: boolean }
  | { type: 'modeChanged'; mode: GameMode }
  | { type: 'garageChanged' }
  | { type: 'garagePeek'; value: boolean }
  | { type: 'hostDisconnected' };

export interface MinimapStatic { id: number; x: number; z: number; w: number; d: number; kind: string; alive: boolean }
/** Relation of blip to local player for team coloring (FFA: others = enemy). */
type MinimapRelation = 'self' | 'ally' | 'enemy';
export interface MinimapDynamic {
  x: number;
  z: number;
  yaw: number;
  turret: number;
  isPlayer: boolean;
  relation: MinimapRelation;
}
export interface ScoreRow {
  name: string;
  hull: string;
  weaponName: string;
  hpFrac: number;
  isPlayer: boolean;
  alive: boolean;
  kills: number;
  deaths: number;
  teamId: TeamId;
}
