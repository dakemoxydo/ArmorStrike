// ===== Per-map Capture Point anchors (A/B/C) =====
import type { MapId } from '../maps/mapCatalog';
import type { CapturePointId } from './captureLogic';
import { CAPTURE, createZone, type CaptureZoneState } from './captureLogic';

export interface CaptureAnchor {
  id: CapturePointId;
  x: number;
  z: number;
}

/**
 * Design anchors (arena half ≈ 150). Keep away from team bases at z±120.
 * factory: west / center / east · village: plaza + flanks · city: plaza + N/S avenue.
 */
export const CAPTURE_ANCHORS: Record<MapId, readonly CaptureAnchor[]> = {
  factory: [
    { id: 'A', x: -88, z: 8 },
    { id: 'B', x: 0, z: 0 },
    { id: 'C', x: 92, z: -6 },
  ],
  village: [
    { id: 'A', x: 0, z: 4 },
    { id: 'B', x: -85, z: 25 },
    { id: 'C', x: 88, z: -18 },
  ],
  city: [
    { id: 'A', x: 0, z: 0 },
    { id: 'B', x: 0, z: 78 },
    { id: 'C', x: 12, z: -86 },
  ],
};

export function zonesForMap(mapId: MapId, radius = CAPTURE.radius): CaptureZoneState[] {
  const anchors = CAPTURE_ANCHORS[mapId] ?? CAPTURE_ANCHORS.factory;
  return anchors.map((a) => createZone(a.id, a.x, a.z, radius));
}
