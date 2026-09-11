/**
 * Contract for the procedural hull kit.
 *
 * Hulls are authored from hundreds of primitives, but the whole point of the
 * design is that the scene receives **one mesh per material slot** and that the
 * merged geometry is process-shared (per-tank cost is materials only, because
 * FX tint `bodyMats` per tank). Those two invariants are invisible in a
 * screenshot and easy to break by accident, so they are pinned here.
 */
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { buildHull, hullGeometry } from '../game/tank/hull';
import { HULL_SLOTS } from '../game/tank/hullKit';
import { isShared } from '../game/resources/sharedResources';
import { HULL_IDS } from '../core/catalog';
import type { HullId } from '../core/catalog';
import type { TankBuildContext } from '../game/tank/context';

function hullBox(id: HullId): THREE.Box3 {
  const box = new THREE.Box3();
  const set = hullGeometry(id);
  for (const slot of HULL_SLOTS) {
    const geo = set[slot];
    if (!geo) continue;
    box.union(new THREE.Box3().setFromBufferAttribute(
      geo.attributes.position as THREE.BufferAttribute,
    ));
  }
  return box;
}

function stubContext(): TankBuildContext {
  return {
    style: { body: '#000', dark: '#000', light: '#000', glow: 0xffffff, accent: 0, antenna: false },
    bodyMats: [],
    bodyMat: new THREE.MeshStandardMaterial(),
    turretMat: new THREE.MeshStandardMaterial(),
    metalMat: new THREE.MeshStandardMaterial(),
    darkMat: new THREE.MeshStandardMaterial(),
    lampMat: new THREE.MeshBasicMaterial(),
    trackTex: null as unknown as THREE.CanvasTexture,
    trackMat: new THREE.MeshStandardMaterial(),
    group: new THREE.Group(),
    hull: new THREE.Group(),
    turret: new THREE.Group(),
    barrelGroup: new THREE.Group(),
    muzzle: new THREE.Object3D(),
    railGlowMat: undefined,
  };
}

describe('procedural hull geometry', () => {
  it('merges each hull into at most one geometry per material slot', () => {
    for (const id of HULL_IDS) {
      const used = Object.keys(hullGeometry(id));
      expect(used.length).toBeGreaterThan(0);
      expect(used.length).toBeLessThanOrEqual(HULL_SLOTS.length);
      for (const slot of used) expect(HULL_SLOTS).toContain(slot);
    }
  });

  it('marks merged geometry shared so a single tank cannot free it', () => {
    for (const id of HULL_IDS) {
      const set = hullGeometry(id);
      for (const slot of HULL_SLOTS) {
        const geo = set[slot];
        if (geo) expect(isShared(geo), `${id}/${slot} must be markShared`).toBe(true);
      }
    }
  });

  it('memoizes geometry per hull id', () => {
    expect(hullGeometry('viking')).toBe(hullGeometry('viking'));
    expect(hullGeometry('hunter')).not.toBe(hullGeometry('mammoth'));
  });

  it('adds one mesh per populated slot — no per-part meshes', () => {
    for (const id of HULL_IDS) {
      const ctx = stubContext();
      buildHull(ctx, id);
      const meshes = ctx.hull.children;
      expect(meshes.length).toBeLessThanOrEqual(HULL_SLOTS.length);
      expect(meshes.length).toBeGreaterThanOrEqual(3);
      for (const child of meshes) expect(child).toBeInstanceOf(THREE.Mesh);
      // Every slot mesh must reuse the shared geometry, not a copy.
      const set = hullGeometry(id);
      const owned = new Set(Object.values(set));
      for (const child of meshes) {
        expect(owned.has((child as THREE.Mesh).geometry)).toBe(true);
      }
    }
  });

  it('keeps the hulls distinct: speedy lowest, titan the largest silhouette', () => {
    const hunter = hullBox('hunter').getSize(new THREE.Vector3());
    const viking = hullBox('viking').getSize(new THREE.Vector3());
    const mammoth = hullBox('mammoth').getSize(new THREE.Vector3());
    const speedy = hullBox('speedy').getSize(new THREE.Vector3());
    const titan = hullBox('titan').getSize(new THREE.Vector3());

    // Height ladder: the light interceptor is the flattest chassis, the
    // super-heavy flagship the tallest — one silhouette per role.
    expect(speedy.y).toBeLessThan(viking.y);
    expect(viking.y).toBeLessThan(hunter.y);
    expect(hunter.y).toBeLessThan(mammoth.y);
    expect(mammoth.y).toBeLessThan(titan.y);
    // Width: the light hull is the narrowest, the flagship the widest.
    expect(speedy.x).toBeLessThan(hunter.x);
    expect(mammoth.x).toBeGreaterThan(hunter.x);
    expect(mammoth.x).toBeGreaterThan(viking.x);
    expect(titan.x).toBeGreaterThan(mammoth.x);
    // Length: the flagship's running gear is the longest in the catalog.
    expect(titan.z).toBeGreaterThan(mammoth.z);
    expect(mammoth.z).toBeGreaterThan(speedy.z);
  });

  it('keeps every hull above the ground plane', () => {
    // The tank is planted at Y=0 and nothing sinks into the terrain: the
    // track band's outer surface is the lowest point, and details such as
    // sprocket teeth must stay inside that radius.
    for (const id of HULL_IDS) {
      const min = hullBox(id).min;
      expect(min.y, `${id} sinks below ground`).toBeGreaterThanOrEqual(-0.001);
      // Sanity on the rest of the volume: the hull must be a real box, not a sliver.
      const size = hullBox(id).getSize(new THREE.Vector3());
      expect(size.x).toBeGreaterThan(2.5);
      expect(size.y).toBeGreaterThan(1.2);
      expect(size.z).toBeGreaterThan(3.5);
    }
  });

  it('keeps every hull inside a sane detail budget', () => {    for (const id of HULL_IDS) {
      const set = hullGeometry(id);
      let verts = 0;
      for (const slot of HULL_SLOTS) verts += set[slot]?.attributes.position.count ?? 0;
      // Detailed but bounded: a runaway loop would blow past this immediately.
      expect(verts, `${id} vertex budget`).toBeGreaterThan(1000);
      expect(verts, `${id} vertex budget`).toBeLessThan(20000);
    }
  });

  it('merges geometry with a single consistent attribute set per slot', () => {
    for (const id of HULL_IDS) {
      const set = hullGeometry(id);
      for (const slot of HULL_SLOTS) {
        const geo = set[slot];
        if (!geo) continue;
        expect(Object.keys(geo.attributes).sort()).toEqual(['normal', 'position', 'uv']);
        expect(geo.attributes.position.count).toBe(geo.attributes.normal.count);
        expect(geo.attributes.position.count).toBe(geo.attributes.uv.count);
      }
    }
  });
});
