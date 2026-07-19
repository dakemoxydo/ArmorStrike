// ===== Контекст построения арены: общие ресурсы и хелперы, доступные билдерам =====
import type * as THREE from 'three';
import type { Collider } from '../engine/physics';
import type { BlockInfo } from './types';
import type { AnimNodeFn } from '../ArenaEffects';

export interface ArenaBuildContext {
  group: THREE.Group;
  half: number;
  colliders: Collider[];
  blocks: Map<number, BlockInfo>;
  beaconMats: THREE.MeshBasicMaterial[];
  smokeEmitters: THREE.Vector3[];
  furnaceGlowMats: THREE.MeshStandardMaterial[];
  moltenMats: THREE.MeshBasicMaterial[];
  /** Generic-анимации арены (ветряк, флаги, трава): callback(dt, elapsed). */
  animNodes: AnimNodeFn[];
  box(w: number, h: number, d: number, mat: THREE.Material, cy?: number): THREE.Mesh;
  addColliderBlock(
    x: number, z: number, w: number, d: number, h: number,
    destructible: boolean, buildMesh: () => THREE.Object3D,
    hp?: number, kind?: 'block' | 'wall', blocksSight?: boolean,
  ): Collider;
  setObelisk(core: THREE.Mesh | null, ring: THREE.Mesh | null): void;
  setCraneTrolley(trolley: THREE.Group | null): void;
  setDome(dome: THREE.Mesh | null): void;
  setDust(dust: THREE.Points | null): void;
}
