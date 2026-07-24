// ===== Общие типы игрового слоя (без зависимости от Game) =====
import type { HullId, TurretId } from '../core/catalog';
import type { MatchModeId, TeamId, MatchEndReason } from './match/matchTypes';

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
  botsAlive: number;
  alive: boolean;
  timeSec: number;
  muted: boolean;
  hullId: HullId;
  turretId: TurretId;
  weaponName: string;
  weaponLabel: string;
  weaponColor: string;
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

export type GameEvent =
  | { type: 'playerHit'; dir: number }
  | { type: 'enemyHit'; killed: boolean }
  | { type: 'kill'; victim: string; byPlayer: boolean }
  | { type: 'shotFired' }
  | { type: 'killStreak'; count: number; label: string }
  | {
      type: 'gameOver';
      score: number;
      kills: number;
      deaths: number;
      playerWon: boolean;
      winnerName: string | null;
      winnerTeam: TeamId;
      reason: MatchEndReason;
      mode: MatchModeId;
      matchTimeSec: number;
      teamKills: { alpha: number; bravo: number };
      teamScore: { alpha: number; bravo: number };
    }
  | { type: 'pauseChanged'; value: boolean }
  | { type: 'modeChanged'; mode: GameMode }
  | { type: 'garageChanged' };

export interface MinimapStatic { id: number; x: number; z: number; w: number; d: number; kind: string; alive: boolean }
/** Relation of blip to local player for team coloring (FFA: others = enemy). */
export type MinimapRelation = 'self' | 'ally' | 'enemy';
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
  turret: string;
  weapon: string;
  weaponName: string;
  hpFrac: number;
  isPlayer: boolean;
  alive: boolean;
  kills: number;
  deaths: number;
  teamId: TeamId;
}
