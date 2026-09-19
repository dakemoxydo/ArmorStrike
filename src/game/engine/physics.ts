// ===== Базовая 2D-физика на плоскости XZ: AABB-коллайдеры, круги, сегменты =====
import * as THREE from 'three';

let nextColliderId = 1;

export type ColliderKind = 'wall' | 'block' | 'ramp';

/**
 * Единый высотный epsilon выстрела: коллайдер игнорируется лучом/снарядом,
 * только когда точка выстрела явно выше его верха (`y > height + EPS`).
 * Канон для `Projectile` (снаряд пролетает над низким парапетом) и
 * `railgunBlockers.nearestShotBlockerDist` (луч скользит над кромкой) —
 * раньше жили врозь как `PROJECTILE.radius` (0.18) и `0.3`, давая разный
 * вердикт «перелёт/блок» на одной и той же стене.
 */
export const SHOT_HEIGHT_EPS = 0.3;

export interface Collider {
  id: number;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  height: number;        // верх препятствия (для блокировки снарядов/обзора)
  blocksShots: boolean;
  blocksSight: boolean;
  destructible: boolean;
  active: boolean;
  kind: ColliderKind;
}

interface ColliderOpts {
  blocksShots?: boolean;
  blocksSight?: boolean;
  destructible?: boolean;
}

export function colliderFromCenter(
  cx: number, cz: number, w: number, d: number,
  height: number, kind: ColliderKind, opts: ColliderOpts = {},
): Collider {
  return {
    id: nextColliderId++,
    minX: cx - w / 2, maxX: cx + w / 2,
    minZ: cz - d / 2, maxZ: cz + d / 2,
    height,
    blocksShots: opts.blocksShots ?? true,
    blocksSight: opts.blocksSight ?? true,
    destructible: opts.destructible ?? false,
    active: true,
    kind,
  };
}

export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
export const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/**
 * I7: AABB-обёртка повёрнутого прямоугольника w×d вокруг yaw. Коллайдеры
 * всегда axis-aligned, а меш поворачивается (`rotation.y = yaw`); без этой
 * обёртки повёрнутый объект либо имеет невидимую стену снаружи меша, либо
 * простреливается насквозь. Возвращает размеры (w, d) охватывающего AABB
 * (опциональный внешний `pad`, как у машин — +0.3 на запас).
 */
export function aabbForYaw(
  w: number, d: number, yaw: number, pad = 0,
): { w: number; d: number } {
  const c = Math.abs(Math.cos(yaw));
  const s = Math.abs(Math.sin(yaw));
  return { w: w * c + d * s + pad, d: w * s + d * c + pad };
}

/** Плавное затухание значения к цели (обёртка THREE.MathUtils.damp). */
export const dampTo = (current: number, target: number, lambda: number, dt: number): number =>
  THREE.MathUtils.damp(current, target, lambda, dt);

/** Точка позади сущности (по оси yaw + PI) на заданном смещении и высоте. */
export function rearPoint(out: THREE.Vector3, x: number, z: number, yaw: number, offset: number, height: number): THREE.Vector3 {
  const back = yaw + Math.PI;
  return out.set(x + Math.sin(back) * offset, height, z + Math.cos(back) * offset);
}

/** Reused result — read x/z/hit immediately; do not store across calls. */
const _circleOut = { x: 0, z: 0, hit: false };

/** Выталкивание круга из набора AABB. Возвращает скорректированную позицию. */
export function resolveCircle(
  x: number, z: number, r: number,
  colliders: Collider[],
): { x: number; z: number; hit: boolean } {
  let hit = false;
  for (let iter = 0; iter < 2; iter++) {
    for (const c of colliders) {
      if (!c.active) continue;
      const cx = clamp(x, c.minX, c.maxX);
      const cz = clamp(z, c.minZ, c.maxZ);
      const dx = x - cx;
      const dz = z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      hit = true;
      if (d2 > 1e-8) {
        const d = Math.sqrt(d2);
        const push = (r - d) / d;
        x += dx * push;
        z += dz * push;
      } else {
        // центр внутри — вытолкнуть по оси наименьшего проникновения
        const pl = x - c.minX, pr = c.maxX - x;
        const pt = z - c.minZ, pb = c.maxZ - z;
        const m = Math.min(pl, pr, pt, pb);
        if (m === pl) x = c.minX - r;
        else if (m === pr) x = c.maxX + r;
        else if (m === pt) z = c.minZ - r;
        else z = c.maxZ + r;
      }
    }
  }
  _circleOut.x = x;
  _circleOut.z = z;
  _circleOut.hit = hit;
  return _circleOut;
}

export function pointInCollider(x: number, z: number, c: Collider, pad = 0): boolean {
  return x > c.minX - pad && x < c.maxX + pad && z > c.minZ - pad && z < c.maxZ + pad;
}

/** Пересечение сегмента с AABB (slab-метод в 2D). */
export function segmentHitsCollider(
  ax: number, az: number, bx: number, bz: number, c: Collider,
): boolean {
  const dx = bx - ax;
  const dz = bz - az;
  let tmin = 0;
  let tmax = 1;
  if (Math.abs(dx) < 1e-9) {
    if (ax < c.minX || ax > c.maxX) return false;
  } else {
    let t1 = (c.minX - ax) / dx;
    let t2 = (c.maxX - ax) / dx;
    if (t1 > t2) { const tt = t1; t1 = t2; t2 = tt; }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  if (Math.abs(dz) < 1e-9) {
    if (az < c.minZ || az > c.maxZ) return false;
  } else {
    let t1 = (c.minZ - az) / dz;
    let t2 = (c.maxZ - az) / dz;
    if (t1 > t2) { const tt = t1; t1 = t2; t2 = tt; }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  return tmax >= tmin;
}

/** Возвращает параметр t∈[0,1] первого пересечения сегмента с AABB (с отступом) или -1. */
export function segmentHitT(
  ax: number, az: number, bx: number, bz: number,
  c: Collider, inflate = 0,
): number {
  const minX = c.minX - inflate, maxX = c.maxX + inflate;
  const minZ = c.minZ - inflate, maxZ = c.maxZ + inflate;
  const dx = bx - ax, dz = bz - az;
  let tmin = 0, tmax = 1;
  if (Math.abs(dx) < 1e-9) {
    if (ax < minX || ax > maxX) return -1;
  } else {
    let t1 = (minX - ax) / dx, t2 = (maxX - ax) / dx;
    if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
    tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
    if (tmin > tmax) return -1;
  }
  if (Math.abs(dz) < 1e-9) {
    if (az < minZ || az > maxZ) return -1;
  } else {
    let t1 = (minZ - az) / dz, t2 = (maxZ - az) / dz;
    if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
    tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
    if (tmin > tmax) return -1;
  }
  return tmin < 0 ? 0 : tmin;
}

/** Прямая видимость между двумя точками (учитываются только коллайдеры blocksSight). */
export function losClear(
  ax: number, az: number, bx: number, bz: number, colliders: readonly Collider[],
): boolean {
  // Segment bounding box for broad-phase reject.
  const segMinX = ax < bx ? ax : bx;
  const segMaxX = ax > bx ? ax : bx;
  const segMinZ = az < bz ? az : bz;
  const segMaxZ = az > bz ? az : bz;
  for (const c of colliders) {
    if (!c.active || !c.blocksSight) continue;
    // Broad-phase: skip if segment AABB doesn't overlap collider AABB.
    if (segMaxX < c.minX || segMinX > c.maxX || segMaxZ < c.minZ || segMinZ > c.maxZ) continue;
    if (segmentHitsCollider(ax, az, bx, bz, c)) return false;
  }
  return true;
}

/** Пересечение сегмента с кругом. */
export function segmentHitsCircle(
  ax: number, az: number, bx: number, bz: number,
  cx: number, cz: number, r: number,
): boolean {
  const dx = bx - ax;
  const dz = bz - az;
  const len2 = dx * dx + dz * dz || 1e-9;
  let t = ((cx - ax) * dx + (cz - az) * dz) / len2;
  t = clamp(t, 0, 1);
  const px = ax + dx * t;
  const pz = az + dz * t;
  const ddx = cx - px;
  const ddz = cz - pz;
  return ddx * ddx + ddz * ddz <= r * r;
}

/**
 * Параметр t∈[0,1] ПЕРВОГО входа сегмента в круг или -1 (C5: выбор ближайшей
 * цели снаряда, а не «первой в ростере»). Начало внутри круга → t=0.
 */
export function segmentHitsCircleT(
  ax: number, az: number, bx: number, bz: number,
  cx: number, cz: number, r: number,
): number {
  const dx = bx - ax;
  const dz = bz - az;
  const fx = ax - cx;
  const fz = az - cz;
  const a = dx * dx + dz * dz;
  if (a < 1e-12) return fx * fx + fz * fz <= r * r ? 0 : -1;
  const rr = r * r;
  const c0 = fx * fx + fz * fz - rr;
  if (c0 <= 0) return 0;
  const b = 2 * (fx * dx + fz * dz);
  const disc = b * b - 4 * a * c0;
  if (disc < 0) return -1;
  const t = (-b - Math.sqrt(disc)) / (2 * a);
  return t >= 0 && t <= 1 ? t : -1;
}
