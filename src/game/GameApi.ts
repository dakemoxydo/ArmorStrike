// ===== Узкий API игры для UI-слоя (без GameSimulation / engine) =====
import type { HullId, TurretId } from '../core/catalog';
import type { QualityLevel } from './graphicsQuality';
import type {
  GameEvent,
  GameMode,
  HudSnapshot,
  MinimapDynamic,
  MinimapStatic,
} from './types';

/**
 * Контракт, на который опираются React-компоненты и хуки.
 * Concrete `Game` реализует этот интерфейс; UI не импортирует класс и не видит `sim`.
 */
export interface GameApi {
  readonly currentHull: HullId;
  readonly currentTurret: TurretId;

  addListener(fn: (e: GameEvent) => void): void;
  removeListener(fn: (e: GameEvent) => void): void;
  setHudCallback(fn: ((hud: HudSnapshot) => void) | null): void;

  setMode(mode: GameMode): void;
  startRound(): void;
  togglePause(): void;

  toggleMute(): boolean;
  getQuality(): QualityLevel;
  cycleQuality(): QualityLevel;

  setGarageSelection(hullId: HullId, turretId: TurretId): void;

  getHud(): HudSnapshot;
  getMinimapStatic(): MinimapStatic[];
  fillMinimapDynamics(out: MinimapDynamic[]): MinimapDynamic[];

  dispose(): void;
}
