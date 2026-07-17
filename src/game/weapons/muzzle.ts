// ===== Общий helper: точка дула + направление прицела =====
import type * as THREE from 'three';
import type { WeaponOwner } from './types';

/** Заполняет outMuzzle (world) и outDir (aim) для текущего владельца. */
export function fillMuzzleAndAim(
  owner: WeaponOwner,
  outMuzzle: THREE.Vector3,
  outDir: THREE.Vector3,
): void {
  owner.muzzleWorld(outMuzzle);
  owner.aimDir(outDir);
}
