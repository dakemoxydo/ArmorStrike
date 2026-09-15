// ===== Поиск точки укрытия для ИИ (низкое HP) =====
// Порог HP ухода в укрытие — ПО РОЛИ: coverHpFracForRole в aiRoles.ts
// (elite 0.5 / sniper 0.4 / assault+standard 0.35).
import type { Collider } from './engine/physics';
import { losClear, pointInCollider } from './engine/physics';

/** Клиренс точки стояния танка до граней чужих коллайдеров (D5). */
const COVER_CLEARANCE = 1.4;

/**
 * Точка за препятствием относительно угрозы: бот прячется «сзади» блока
 * (с дальней от угрозы стороны), предпочитая позиции, рвущие LOS.
 *
 * Поиск класс-нейтрален: default maxDist 42 / standOff 3.4 для всех ролей.
 * Класс-уместность возникает сама — бот дерётся на preferred range своего
 * оружия (flamer ~8 → ближние укрытия; railgun-снайпер ~46 → дальние),
 * а scoring сам-относительный (80 − distSelf − travel·0.35 + losBlocked·45).
 *
 * D5: кандидат отбрасывается, если попал ВНУТРЬ другого solid-коллайдера
 * (в плотных кластерах stand-off точка залезала в соседний блок — бот
 * детерминированно толкал стену и livelock’ил), и зажимается в границы
 * арены при переданном arenaHalf.
 */
export function findCoverPoint(
  selfX: number,
  selfZ: number,
  threatX: number,
  threatZ: number,
  colliders: readonly Collider[],
  opts: { maxDist?: number; standOff?: number; arenaHalf?: number } = {},
): { x: number; z: number } | null {
  const maxDist = opts.maxDist ?? 42;
  const standOff = opts.standOff ?? 3.4;
  const bound = opts.arenaHalf !== undefined ? opts.arenaHalf - 3 : Infinity;

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
    let px = cx + dx * extent;
    let pz = cz + dz * extent;

    // D5: clamp к playable-площади (рамка стен арены).
    px = Math.min(Math.max(px, -bound), bound);
    pz = Math.min(Math.max(pz, -bound), bound);

    // D5: точка не должна попадать в solid (resolveCircle игнорирует
    // height — любой активный не-ramp блок толкнёт бота). Проверяем и
    // собственный блок: после clamp'а к границе точка может залезть в него.
    let blocked = false;
    for (const o of colliders) {
      if (!o.active || o.kind === 'ramp') continue;
      if (pointInCollider(px, pz, o, COVER_CLEARANCE)) {
        blocked = true;
        break;
      }
    }
    if (blocked) continue;

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
