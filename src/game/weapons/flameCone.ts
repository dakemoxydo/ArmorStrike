// ===== Чистая геометрия конуса огнемёта на плоскости XZ (M7) =====

/**
 * Returns true if target on XZ is inside the forward cone from muzzle.
 * Uses planar angle (not full 3D) so elevated muzzle does not reject point-blank targets.
 */
export function inFlameConeXZ(
  muzzleX: number,
  muzzleZ: number,
  dirX: number,
  dirZ: number,
  targetX: number,
  targetZ: number,
  range: number,
  halfConeRad: number,
): boolean {
  const dx = targetX - muzzleX;
  const dz = targetZ - muzzleZ;
  const dist = Math.hypot(dx, dz);
  if (dist > range) return false;
  if (dist < 1e-6) return true;
  const dLen = Math.hypot(dirX, dirZ) || 1;
  const nx = dx / dist;
  const nz = dz / dist;
  const dot = (dirX / dLen) * nx + (dirZ / dLen) * nz;
  const angle = Math.acos(Math.min(1, Math.max(-1, dot)));
  return angle <= halfConeRad;
}
