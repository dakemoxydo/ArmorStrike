// ===== Узкий API игры для UI-слоя (без GameSimulation / engine) =====
import type { HullId, TurretId } from '../core/catalog';
import type { QualityLevel } from './graphicsQuality';
import type { MapId } from './maps/mapCatalog';
import type {
  CaptureHudPoint,
  GameEvent,
  GameMode,
  GarageViewportInset,
  HudSnapshot,
  MatchModeId,
  MinimapDynamic,
  MinimapStatic,
} from './types';

import type { QuestProgress } from './economy/questCatalog';

/**
 * Контракт, на который опираются React-компоненты и хуки.
 * Concrete `Game` реализует этот интерфейс; UI не импортирует класс и не видит `sim`.
 */
export interface GameApi {
  readonly currentHull: HullId;
  readonly currentTurret: TurretId;
  readonly currentMapId: MapId;
  readonly currentMatchMode: MatchModeId;
  readonly unlockedHulls: readonly HullId[];
  readonly unlockedTurrets: readonly TurretId[];
  readonly starterPackClaimed: boolean;
  readonly credits: number;
  readonly quests: readonly QuestProgress[];
  readonly username: string;
  readonly isGuest: boolean;
  readonly userId: string | null;
  readonly syncStatus: 'idle' | 'saving' | 'synced' | 'error';

  setAuthUser(user: { id: string; username: string } | null): void;
  loadCloudProfile(userId: string): Promise<boolean>;

  claimStarterPack(hullId: HullId, turretId: TurretId): Promise<void>;
  claimQuest(questId: string): number;
  purchaseCrate(type: 'hull' | 'turret', chosenId?: HullId | TurretId): boolean;
  purchaseDirectUnlock(id: HullId | TurretId): boolean;

  addListener(fn: (e: GameEvent) => void): void;
  removeListener(fn: (e: GameEvent) => void): void;
  setHudCallback(fn: ((hud: HudSnapshot) => void) | null): void;

  setMode(mode: GameMode): void;
  setMatchMode(mode: MatchModeId): void;
  /** Start a match on the given map (rebuilds arena if map changed). Serialized; latest call wins. */
  startRound(mapId?: MapId, matchMode?: MatchModeId): Promise<void>;
  togglePause(): void;

  toggleMute(): boolean;
  getQuality(): QualityLevel;
  cycleQuality(): QualityLevel;

  /**
   * Select the garage loadout. Resolves after the 3D preview is rebuilt and
   * the selection is committed (saved + `garageChanged` emitted); rejects if
   * the rebuild fails — the committed state then stays at the previous pick,
   * so UI can revert its optimistic selection.
   */
  setGarageSelection(hullId: HullId, turretId: TurretId): Promise<void>;

  /**
   * Report the garage UI footprint (CSS px occupied at each viewport edge) so
   * the preview camera can frame the tank inside the remaining free area.
   * Pass null when the garage UI is not mounted. Cheap to call — the rig
   * ignores repeats.
   */
  setGarageViewportInset(inset: GarageViewportInset | null): void;

  getHud(): HudSnapshot;
  getMinimapStatic(): MinimapStatic[];
  fillMinimapDynamics(out: MinimapDynamic[]): MinimapDynamic[];
  /** CP zone markers for minimap (empty outside capture_point). */
  getCaptureMinimap(): CaptureHudPoint[];

  dispose(): void;
}
