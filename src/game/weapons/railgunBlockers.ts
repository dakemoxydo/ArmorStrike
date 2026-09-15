// ===== M9: pure shot-blocker pick for railgun (collider parity with projectiles) =====
import { pointInCollider, segmentHitT, type Collider } from '../engine/physics';

export interface ShotBlockerHit {
  dist: number;
  id: number;
}

/**
 * Muzzle-height forgiveness: a collider is ignored only when the muzzle is
 * clearly above its top (beam is horizontal, so grazing the very edge of a
 * low wall should still count as blocked). Named constant — was bare `0.3`.
 */
export const SHOT_BLOCKER_HEIGHT_EPS = 0.3;

/**
 * Nearest active blocksShots collider along a 2D aim segment of length `range`.
 * Decorative meshes without colliders never appear here.
 */
export function nearestShotBlockerDist(
  originX: number,
  originZ: number,
  dirX: number,
  dirZ: number,
  range: number,
  colliders: Collider[],
  originY = 1.6,
): ShotBlockerHit | null {
  const safeRange = Number.isFinite(range) ? range : 10000;
  const endX = originX + dirX * safeRange;
  const endZ = originZ + dirZ * safeRange;
  let bestT = Infinity;
  let bestId = -1;
  for (const c of colliders) {
    if (!c.active || !c.blocksShots) continue;
    if (originY > c.height + SHOT_BLOCKER_HEIGHT_EPS) continue;
    // Дуло внутри footprint коллайдера (танк вжался в стену/угол): вход в slab
    // остался ЗА началом луча, а segmentHitT для такого случая всегда даёт 0 —
    // выстрел умирал на нулевой дистанции и пилил собственный блок. Не блокер.
    if (pointInCollider(originX, originZ, c)) continue;
    const t = segmentHitT(originX, originZ, endX, endZ, c);
    if (t >= 0 && t < bestT) {
      bestT = t;
      bestId = c.id;
    }
  }
  if (bestId < 0 || !Number.isFinite(bestT)) return null;
  return { dist: bestT * safeRange, id: bestId };
}
