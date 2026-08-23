// ===== Pure CP zone-view cache for BotAiStage =====
// Извлечено из BotAiStage.zonesAsView, чтобы кэш-семантику можно было
// тестировать без арены/ростера.
import type { ObjectiveZoneView } from '../../match/aiObjective';
import type { CaptureZoneState } from '../../match/captureLogic';

/**
 * Sync cached zone views with the live capture zones.
 *
 * Rebuilds when the zone SET changes — map switch / match reset produces new
 * anchors — otherwise refreshes mutable owner/contested in place (no per-frame
 * allocation). Anchor scalars are compared because CaptureController hands out
 * a fresh array of fresh objects every tick, so reference identity never works.
 */
export function syncZoneViews(
  cache: ObjectiveZoneView[] | null,
  zones: readonly CaptureZoneState[],
): ObjectiveZoneView[] {
  if (
    !cache || cache.length !== zones.length ||
    cache.some((v, i) => {
      const s = zones[i];
      return v.id !== s.id || v.x !== s.x || v.z !== s.z || v.radius !== s.radius;
    })
  ) {
    return zones.map((z) => ({
      id: z.id, x: z.x, z: z.z, radius: z.radius,
      owner: z.owner, contested: z.contested,
    }));
  }
  for (let i = 0; i < cache.length; i++) {
    const src = zones[i];
    const v = cache[i];
    v.owner = src.owner;
    v.contested = src.contested;
  }
  return cache;
}
