// ===== Per-map Capture Point anchors (A/B/C) =====
import type { MapId } from '../maps/mapCatalog';
import type { CapturePointId } from './captureLogic';
import { CAPTURE, createZone, type CaptureZoneState } from './captureLogic';

interface CaptureAnchor {
  id: CapturePointId;
  x: number;
  z: number;
}

/**
 * Design anchors (arena half ≈ 150). Keep away from team bases at z±120.
 * factory: west / center / east · village: plaza + flank meadows · city: plaza + N/S avenue.
 *
 * Every anchor must sit in a ~20 m clearing (CAPTURE.radius) with soft cover
 * only — `villageMap.test.ts` / `factoryMap.test.ts` pin this.
 */
const CAPTURE_ANCHORS: Record<MapId, readonly CaptureAnchor[]> = {
  factory: [
    { id: 'A', x: -88, z: 8 },
    { id: 'B', x: 0, z: 0 },
    { id: 'C', x: 92, z: -6 },
  ],
  village: [
    { id: 'A', x: 0, z: 4 },
    { id: 'B', x: -100, z: 20 },
    { id: 'C', x: 100, z: -20 },
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
