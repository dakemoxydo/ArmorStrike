// ===== Множитель скорости перезарядки владельца (wave buff) =====
import type { WeaponOwner } from './types';

/** 1 = normal; >1 faster reloads / charge / energy recovery. */
export function ownerReloadMul(owner: WeaponOwner): number {
  const m = owner.reloadSpeedMul;
  return m && m > 0 ? m : 1;
}
