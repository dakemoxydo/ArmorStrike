// ===== Чистые AI-хелперы (без класса контроллера) =====
import type { WeaponType } from '../core/catalog';
import { clamp } from './engine/physics';

export function preferredRange(weapon: WeaponType, aggro: number): number {
  if (weapon === 'flamethrower') return 7;
  if (weapon === 'isida') return 11; // луч 17 м: середина дистанции, не в упор
  if (weapon === 'railgun') return 34 + aggro * 10;
  return 20 + aggro * 8;
}

export function aimTolerance(weapon: WeaponType): number {
  if (weapon === 'flamethrower') return 0.3;
  if (weapon === 'isida') return 0.13; // чуть уже конуса захвата (0.175), цель держим в луче
  if (weapon === 'railgun') return 0.1;
  return 0.14;
}

export function steeringFromAngle(diff: number): number {
  return clamp(diff * 2.4, -1, 1);
}
