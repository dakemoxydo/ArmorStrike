import * as THREE from 'three';
import { ARENA } from './constants';
import type { Collider } from './engine/physics';
import { colliderFromCenter } from './engine/physics';
import { ArenaEffects } from './ArenaEffects';
import { buildArena } from './ArenaBuilder';
import { disposeObject3D } from './resources/disposeObject3D';
import type { BlockInfo } from './arena/types';

export type { BlockInfo } from './arena/types';

export class Arena {
  group = new THREE.Group();
  colliders: Collider[] = [];
  blocks = new Map<number, BlockInfo>();
  half = ARENA.size / 2;

  private effects: ArenaEffects;

  constructor(scene: THREE.Scene) {
    this.effects = new ArenaEffects(this.group);
    buildArena(this, this.effects);
    scene.add(this.group);
  }

  addColliderBlock(
    x: number, z: number, w: number, d: number, h: number,
    destructible: boolean,
    buildMesh: () => THREE.Object3D,
    hp = 100,
    kind: 'block' | 'wall' = 'block',
    blocksSight = true,
  ) {
    const meshWrap = new THREE.Group();
    meshWrap.position.set(x, 0, z);
    meshWrap.add(buildMesh());
    meshWrap.traverse((o) => {
      if (o instanceof THREE.Mesh) o.userData.colliderId = undefined;
    });
    this.group.add(meshWrap);
    const col = colliderFromCenter(x, z, w, d, h, kind, { destructible, blocksSight });
    if (destructible) {
      meshWrap.traverse((o) => {
        if (o instanceof THREE.Mesh) o.userData.colliderId = col.id;
      });
    }
    this.colliders.push(col);
    if (destructible) {
      const mats: THREE.MeshStandardMaterial[] = [];
      meshWrap.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          const ms = Array.isArray(o.material) ? o.material : [o.material];
          for (const m of ms) if (m instanceof THREE.MeshStandardMaterial) mats.push(m);
        }
      });
      this.blocks.set(col.id, {
        id: col.id, group: meshWrap, collider: col,
        hp, maxHp: hp, mats, flash: 0, size: Math.max(w, d),
      });
    }
    return col;
  }

  box(w: number, h: number, d: number, mat: THREE.Material, cy?: number): THREE.Mesh {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.y = cy ?? h / 2;
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }

  damageBlock(id: number, dmg: number): 'destroyed' | 'hit' | null {
    const b = this.blocks.get(id);
    if (!b) return null;
    b.hp -= dmg;
    b.flash = 1;
    if (b.hp <= 0) {
      b.collider.active = false;
      this.group.remove(b.group);
      disposeObject3D(b.group);
      this.blocks.delete(id);
      return 'destroyed';
    }
    return 'hit';
  }

  update(dt: number, elapsed: number) {
    this.effects.update(dt, elapsed);

    for (const b of this.blocks.values()) {
      if (b.flash > 0) {
        b.flash = Math.max(0, b.flash - dt * 5);
        for (const m of b.mats) m.emissive.setScalar(b.flash * 0.9);
        if (b.hp < b.maxHp * 0.4) {
          b.group.rotation.z = Math.sin(elapsed * 30) * 0.004 * b.flash;
        }
      }
    }
  }
}
