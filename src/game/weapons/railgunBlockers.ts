// ===== M9: pure shot-blocker pick for railgun (collider parity with projectiles) =====
import { segmentHitT, type Collider } from '../engine/physics';

export interface ShotBlockerHit {
  dist: number;
  id: number;
}

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
  const endX = originX + dirX * range;
  const endZ = originZ + dirZ * range;
  let bestT = Infinity;
  let bestId = -1;
  for (const c of colliders) {
    if (!c.active || !c.blocksShots) continue;
    if (originY > c.height + 0.3) continue;
    const t = segmentHitT(originX, originZ, endX, endZ, c);
    if (t >= 0 && t < bestT) {
      bestT = t;
      bestId = c.id;
    }
  }
  if (bestId < 0 || !Number.isFinite(bestT)) return null;
  return { dist: bestT * range, id: bestId };
}
