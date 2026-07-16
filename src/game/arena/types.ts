// ===== Типы арены (без класса Arena) — разрывает цикл Arena ↔ builders =====
import type * as THREE from 'three';
import type { Collider } from '../engine/physics';

export interface BlockInfo {
  id: number;
  group: THREE.Group;
  collider: Collider;
  hp: number;
  maxHp: number;
  mats: THREE.MeshStandardMaterial[];
  flash: number;
  size: number;
}
