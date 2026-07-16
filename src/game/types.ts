// ===== Общие типы игрового слоя (без зависимости от Game) =====
import type { HullId, TurretId } from '../core/catalog';

export type GameMode = 'menu' | 'garage' | 'playing' | 'over';

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
  wave: number;
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
}

export type GameEvent =
  | { type: 'playerHit'; dir: number }
  | { type: 'enemyHit'; killed: boolean }
  | { type: 'kill'; victim: string; byPlayer: boolean }
  | { type: 'wave'; n: number }
  | { type: 'shotFired' }
  | { type: 'gameOver'; score: number; kills: number; wave: number }
  | { type: 'pauseChanged'; value: boolean }
  | { type: 'garageChanged' };

export interface MinimapStatic { id: number; x: number; z: number; w: number; d: number; kind: string; alive: boolean }
export interface MinimapDynamic { x: number; z: number; yaw: number; turret: number; isPlayer: boolean }
export interface ScoreRow { name: string; hull: string; turret: string; weapon: string; weaponName: string; hpFrac: number; isPlayer: boolean; alive: boolean }
