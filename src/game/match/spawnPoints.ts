// ===== Spawn tables for FFA and team modes =====
import { SPAWN_POINTS as FFA_POINTS, MIN_BOT_SPAWN_DIST } from '../botSpawn';

export { MIN_BOT_SPAWN_DIST };

/** FFA / DM — shared edge points. */
export const FFA_SPAWN_POINTS = FFA_POINTS;

/** Alpha base (south / negative Z) — player side. */
export const ALPHA_SPAWN_POINTS: [number, number][] = [
  [0, -120],
  [-40, -110],
  [40, -110],
  [-70, -90],
  [70, -90],
  [-20, -95],
  [20, -95],
];

/** Bravo base (north / positive Z). */
export const BRAVO_SPAWN_POINTS: [number, number][] = [
  [0, 120],
  [-40, 110],
  [40, 110],
  [-70, 90],
  [70, 90],
  [-20, 95],
  [20, 95],
];

export function pickPointIndex(
  points: readonly [number, number][],
  used: ReadonlySet<number>,
  avoidX: number,
  avoidZ: number,
  minDist: number,
  rng: () => number = Math.random,
): number {
  const scored = points.map(([x, z], i) => ({
    i,
    d: Math.hypot(x - avoidX, z - avoidZ),
  }));

  const farUnused = scored.filter((s) => !used.has(s.i) && s.d >= minDist);
  if (farUnused.length > 0) {
    return farUnused[Math.floor(rng() * farUnused.length) % farUnused.length].i;
  }

  const unused = scored.filter((s) => !used.has(s.i)).sort((a, b) => b.d - a.d);
  if (unused.length > 0) return unused[0].i;

  return scored.slice().sort((a, b) => b.d - a.d)[0]?.i ?? 0;
}

/** Respawn: furthest from nearest threat among pool. */
export function pickRespawnPoint(
  points: readonly [number, number][],
  threats: readonly { x: number; z: number }[],
  rng: () => number = Math.random,
): [number, number] {
  if (points.length === 0) return [0, 0];
  if (threats.length === 0) {
    const i = Math.floor(rng() * points.length) % points.length;
    return points[i];
  }

  let best = points[0];
  let bestMin = -1;
  // Shuffle-ish pick among top candidates for variety
  const ranked = points
    .map(([x, z]) => {
      let minD = Infinity;
      for (const t of threats) {
        const d = Math.hypot(x - t.x, z - t.z);
        if (d < minD) minD = d;
      }
      return { x, z, minD };
    })
    .sort((a, b) => b.minD - a.minD);

  const top = ranked.slice(0, Math.min(3, ranked.length));
  const pick = top[Math.floor(rng() * top.length) % top.length];
  best = [pick.x, pick.z];
  bestMin = pick.minD;
  void bestMin;
  return best;
}
