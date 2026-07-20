// ===== Узкий API игры для UI-слоя (без GameSimulation / engine) =====
import type { HullId, TurretId } from '../core/catalog';
import type { QualityLevel } from './graphicsQuality';
import type { MapId } from './maps/mapCatalog';
import type {
  CaptureHudPoint,
  GameEvent,
  GameMode,
  HudSnapshot,
  MatchModeId,
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
  readonly currentMapId: MapId;
  readonly currentMatchMode: MatchModeId;

  addListener(fn: (e: GameEvent) => void): void;
  removeListener(fn: (e: GameEvent) => void): void;
  setHudCallback(fn: ((hud: HudSnapshot) => void) | null): void;

  setMode(mode: GameMode): void;
  setMatchMode(mode: MatchModeId): void;
  /** Start a match on the given map (rebuilds arena if map changed). */
  startRound(mapId?: MapId, matchMode?: MatchModeId): void;
  togglePause(): void;

  toggleMute(): boolean;
  getQuality(): QualityLevel;
  cycleQuality(): QualityLevel;

  setGarageSelection(hullId: HullId, turretId: TurretId): void;

  getHud(): HudSnapshot;
  getMinimapStatic(): MinimapStatic[];
  fillMinimapDynamics(out: MinimapDynamic[]): MinimapDynamic[];
  /** CP zone markers for minimap (empty outside capture_point). */
  getCaptureMinimap(): CaptureHudPoint[];

  dispose(): void;
}
