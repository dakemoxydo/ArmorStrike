// ===== Прицел на реальной линии выстрела: куда остановится снаряд =====
// Выстрел всегда летит горизонтально от дула по aimDir (см. Tank.aimDir,
// CannonWeapon/RailgunWeapon). HUD-прицел крепится на точку, где этот луч
// реально прекращает полёт: блокирующий коллайдер, чужой танк (тот же тест
// радиуса, что у полёта снаряда) или дальность оружия. Чистая логика
// (без Three.js / без сущностей), как targetHighlight.ts.
import type { Collider } from './engine/physics';
import { nearestShotBlockerDist } from './weapons/railgunBlockers';
import { PROJECTILE } from './constants';

/** Минимальный профиль танка для трассы прицела (совпадает с TankEntity структурно). */
export interface ReticleTank {
  id: number;
  alive: boolean;
  position: { x: number; z: number };
  radius: number;
}

/**
 * Параметр входа луча (origin + dir·t, dir — единичный) в круг на плоскости XZ.
 * Возвращает t ∈ [0, maxT] или -1, если пересечения нет в пределах maxT.
 */
function rayCircleEntry(
  ox: number, oz: number, dirX: number, dirZ: number, maxT: number,
  cx: number, cz: number, r: number,
): number {
  const mx = cx - ox;
  const mz = cz - oz;
  const r2 = r * r;
  const proj = mx * dirX + mz * dirZ;
  if (proj < 0) {
    // Центр позади дула: попасть может только если дуло уже внутри круга.
    return mx * mx + mz * mz <= r2 ? 0 : -1;
  }
  // Квадрат перпендикулярного расстояния от центра до прямой луча.
  const d2 = mx * mx + mz * mz - proj * proj;
  if (d2 > r2) return -1;
  const t = proj - Math.sqrt(r2 - d2);
  if (t > maxT) return -1;
  return t < 0 ? 0 : t;
}

/**
 * Дистанция от дула до точки реальной остановки выстрела вдоль горизонтальной
 * линии прицела: min(дальность оружия, блокирующий коллайдер, вход в круг
 * чужого танка). Стены — те же blocksShots-коллайдеры и прощение по высоте,
 * что у рельсы (nearestShotBlockerDist); танки — радиус + радиус снаряда,
 * как в полёте Projectile.
 */
export function reticleImpactDistance(
  muzzleX: number,
  muzzleZ: number,
  muzzleY: number,
  dirX: number,
  dirZ: number,
  range: number,
  colliders: readonly Collider[],
  tanks: readonly ReticleTank[],
  selfId: number,
): number {
  let d = range;
  const wall = nearestShotBlockerDist(
    muzzleX, muzzleZ, dirX, dirZ, d, colliders as Collider[], muzzleY,
  );
  if (wall && wall.dist < d) d = wall.dist;
  const pad = PROJECTILE.radius;
  for (const t of tanks) {
    if (!t.alive || t.id === selfId) continue;
    const entry = rayCircleEntry(
      muzzleX, muzzleZ, dirX, dirZ, d, t.position.x, t.position.z, t.radius + pad,
    );
    if (entry >= 0 && entry < d) d = entry;
  }
  return d;
}
