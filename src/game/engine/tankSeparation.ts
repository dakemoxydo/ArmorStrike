// ===== Чистая межтанковая сепарация (M10) =====

export interface TankXZ {
  x: number;
  z: number;
}

/**
 * Separates two overlapping tank circles in-place.
 * Returns true if positions were modified.
 * Clamps separation so near-coincident tanks do not explode across the arena.
 */
export function separateTankPair(
  a: TankXZ,
  b: TankXZ,
  radiusA: number,
  radiusB: number,
  maxPush = 2.5,
): boolean {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const rr = radiusA + radiusB;
  const d2 = dx * dx + dz * dz;
  if (d2 >= rr * rr) return false;

  let d = Math.sqrt(d2);
  let nx: number;
  let nz: number;
  if (d < 1e-3) {
    // Near-coincident: pick a stable axis instead of 1/d explosion.
    nx = 1;
    nz = 0;
    d = 1e-3;
  } else {
    nx = dx / d;
    nz = dz / d;
  }

  let half = (rr - d) / 2;
  if (half > maxPush) half = maxPush;

  a.x -= nx * half;
  a.z -= nz * half;
  b.x += nx * half;
  b.z += nz * half;
  // TEMP DEBUG [BUGFIX-M10]
  if (half >= maxPush - 1e-6 || d < 1e-2) {
    console.debug('[BUGFIX-M10] clamped tank separation', { half, maxPush, d });
  }
  return true;
}
