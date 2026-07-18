import * as THREE from 'three';
import { ARENA } from './constants';
import type { Collider } from './engine/physics';
import { colliderFromCenter } from './engine/physics';
import { ArenaEffects } from './ArenaEffects';
import { buildArena } from './ArenaBuilder';
import { disposeObject3D } from './resources/disposeObject3D';
import type { BlockInfo } from './arena/types';
import type { MapId } from './maps/mapCatalog';
import { DEFAULT_MAP_ID } from './maps/mapCatalog';
import { invalidateSolidColliderCache } from './engine/solidColliderCache';

import { smokeTexture } from './textures';

export type { BlockInfo } from './arena/types';

export class Arena {
  group = new THREE.Group();
  colliders: Collider[] = [];
  blocks = new Map<number, BlockInfo>();
  half = ARENA.size / 2;
  mapId: MapId = DEFAULT_MAP_ID;

  private effects: ArenaEffects;

  constructor(scene: THREE.Scene, mapId: MapId = DEFAULT_MAP_ID) {
    this.effects = new ArenaEffects(this.group);
    this.mapId = mapId;
    buildArena(this, this.effects, mapId);
    scene.add(this.group);
  }

  /**
   * Tear down current geometry/colliders and rebuild for `mapId`.
   * Safe to call between matches; keeps the same group in the scene graph.
   */
  rebuild(mapId: MapId) {
    this.effects.resetForRebuild();

    // Deduped dispose: walls/props often share materials and maps.
    disposeArenaSubtree(this.group);
    while (this.group.children.length > 0) {
      this.group.remove(this.group.children[0]);
    }

    this.colliders.length = 0;
    this.blocks.clear();
    invalidateSolidColliderCache();

    this.mapId = mapId;
    buildArena(this, this.effects, mapId);
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
    this.group.add(meshWrap);
    const col = colliderFromCenter(x, z, w, d, h, kind, { destructible, blocksSight });
    this.colliders.push(col);
    if (destructible) {
      const mats: THREE.MeshStandardMaterial[] = [];
      meshWrap.traverse((o) => {
        if (!(o instanceof THREE.Mesh)) return;
        o.userData.colliderId = col.id;
        const ms = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of ms) if (m instanceof THREE.MeshStandardMaterial) mats.push(m);
      });
      this.blocks.set(col.id, {
        id: col.id, group: meshWrap, collider: col,
        hp, maxHp: hp, mats, flash: 0, size: Math.max(w, d),
      });
    } else {
      meshWrap.traverse((o) => {
        if (o instanceof THREE.Mesh) o.userData.colliderId = undefined;
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

/** Dispose geometries/materials/textures once each (shared refs are common in arena shell). */
function disposeArenaSubtree(root: THREE.Object3D) {
  const geos = new Set<THREE.BufferGeometry>();
  const mats = new Set<THREE.Material>();
  const maps = new Set<THREE.Texture>();

  root.traverse((o) => {
    if (o instanceof THREE.Mesh || o instanceof THREE.InstancedMesh || o instanceof THREE.Points) {
      if (o.geometry) geos.add(o.geometry);
      const list = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of list) {
        if (!m) continue;
        mats.add(m);
        const anyMat = m as unknown as { map?: THREE.Texture | null };
        if (anyMat.map) maps.add(anyMat.map);
      }
    } else if (o instanceof THREE.Sprite) {
      mats.add(o.material);
      if (o.material.map) maps.add(o.material.map);
    }
  });

  const sharedSmoke = smokeTexture();
  for (const g of geos) g.dispose();
  for (const m of mats) m.dispose();
  for (const t of maps) {
    // Combat + arena smoke share one GPU texture — never dispose it here.
    if (t === sharedSmoke) continue;
    t.dispose();
  }
}
