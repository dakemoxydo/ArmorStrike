// ===== Быстрая игра: случайный режим + случайная карта =====
import { MAP_IDS } from './maps/mapCatalog';
import type { MapId } from './maps/mapCatalog';
import { MATCH_MODE_IDS } from './match/matchConfig';
import type { MatchModeId } from './match/matchTypes';

export interface QuickMatchPick {
  mode: MatchModeId;
  mapId: MapId;
}

/**
 * Uniform random pick for the menu "БЫСТРАЯ ИГРА" shortcut.
 * `rand` is injectable for deterministic tests; defaults to Math.random.
 */
export function pickQuickMatch(rand: () => number = Math.random): QuickMatchPick {
  const mode = MATCH_MODE_IDS[Math.floor(rand() * MATCH_MODE_IDS.length)];
  const mapId = MAP_IDS[Math.floor(rand() * MAP_IDS.length)];
  return { mode, mapId };
}
