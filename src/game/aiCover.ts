// ===== Поиск точки укрытия для ИИ (низкое HP) =====
import type { Collider } from './engine/physics';
import { losClear } from './engine/physics';

export const AI_LOW_HP_FRAC = 0.35;

/**
 * Точка за препятствием относительно угрозы: бот прячется «сзади» блока
 * (с дальней от игрока стороны), предпочитая позиции, рвущие LOS.
 */
export function findCoverPoint(
  selfX: number,
  selfZ: number,
  threatX: number,
  threatZ: number,
  colliders: readonly Collider[],
  opts: { maxDist?: number; standOff?: number } = {},
): { x: number; z: number } | null {
  const maxDist = opts.maxDist ?? 42;
  const standOff = opts.standOff ?? 3.4;

  let best: { x: number; z: number; score: number } | null = null;

  for (const c of colliders) {
    if (!c.active || !c.blocksSight || c.kind === 'ramp') continue;

    const cx = (c.minX + c.maxX) / 2;
    const cz = (c.minZ + c.maxZ) / 2;
    const distSelf = Math.hypot(cx - selfX, cz - selfZ);
    if (distSelf > maxDist || distSelf < 2) continue;

    let dx = cx - threatX;
    let dz = cz - threatZ;
    const len = Math.hypot(dx, dz) || 1;
    dx /= len;
    dz /= len;

    const halfW = (c.maxX - c.minX) / 2;
    const halfD = (c.maxZ - c.minZ) / 2;
    const extent = Math.abs(dx) * halfW + Math.abs(dz) * halfD + standOff;
    const px = cx + dx * extent;
    const pz = cz + dz * extent;

    const losBlocked = !losClear(threatX, threatZ, px, pz, colliders as Collider[]);
    const travel = Math.hypot(px - selfX, pz - selfZ);

    // Closer cover + broken LOS wins; slight penalty for long runs.
    let score = 80 - distSelf - travel * 0.35;
    if (losBlocked) score += 45;

    if (!best || score > best.score) {
      best = { x: px, z: pz, score };
    }
  }

  return best ? { x: best.x, z: best.z } : null;
}
