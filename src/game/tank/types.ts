// ===== Типы визуала и параметров танка (без сущности / без buildMesh) =====
// Вынесены, чтобы разорвать цикл Tank.ts ↔ tank/buildMesh.ts.
import type * as THREE from 'three';
import type { WeaponType } from '../../core/catalog';

export interface TankVisual {
  group: THREE.Group;
  hull: THREE.Group;
  turret: THREE.Group;
  barrelGroup: THREE.Group;
  muzzle: THREE.Object3D;
  ring: THREE.Mesh;
  bodyMats: THREE.MeshStandardMaterial[];
  trackTex: THREE.CanvasTexture;
  railGlowMat?: THREE.MeshStandardMaterial;
}

export interface TankParams {
  maxHealth: number;
  speed: number;
  reverseSpeed: number;
  turnSpeed: number;
  turretSpeed: number;
  damage: number;
  shotCooldown: number;
  weaponType?: WeaponType;
  range?: number;
}

/** Представленческое/визуальное состояние танка (только FX), не входит в
 *  симуляционный контракт TankLike. Читается/пишется системами анимации и FX. */
export interface TankFxState {
  hitFlash: number;
  barrelKick: number;
  smokeAcc: number;
  dustAcc: number;
  timeSinceHit: number;
}
