import * as THREE from 'three';
import type { TankStyle } from '../../core/types';

export interface TankBuildContext {
  style: TankStyle;
  bodyMats: THREE.MeshStandardMaterial[];
  bodyMat: THREE.MeshStandardMaterial;
  turretMat: THREE.MeshStandardMaterial;
  metalMat: THREE.MeshStandardMaterial;
  lampMat: THREE.MeshBasicMaterial;
  trackTex: THREE.CanvasTexture;
  trackMat: THREE.MeshStandardMaterial;
  group: THREE.Group;
  hull: THREE.Group;
  turret: THREE.Group;
  barrelGroup: THREE.Group;
  muzzle: THREE.Object3D;
  railGlowMat: THREE.MeshStandardMaterial | undefined;
}
