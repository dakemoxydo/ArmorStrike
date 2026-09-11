/**
 * Contract for the procedural turret kit.
 *
 * Mirrors `hullGeometry.test.ts`. Turrets are authored from dozens of
 * primitives and fused into one geometry per material slot, so the scene
 * receives one mesh per slot per part (turret shell + barrel) and the merged
 * geometry is process-shared. Those invariants are pinned here.
 *
 * The gun lives in its own group (`barrelGroup`), animated by recoil and
 * charge FX, so its geometry is merged separately from the shell.
 */
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { buildTurret, turretGeometry } from '../game/tank/turret';
import { TURRET_SLOTS } from '../game/tank/turretKit';
import { isShared } from '../game/resources/sharedResources';
import { TURRET_IDS } from '../core/catalog';
import type { TurretId } from '../core/catalog';
import type { TankBuildContext } from '../game/tank/context';

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

describe('procedural turret geometry', () => {
  it('merges each turret into at most one geometry per material slot per part', () => {
    for (const id of TURRET_IDS) {
      const { shell, barrel } = turretGeometry(id as TurretId);
      for (const part of [shell, barrel]) {
        const used = Object.keys(part);
        expect(used.length).toBeGreaterThan(0);
        expect(used.length).toBeLessThanOrEqual(TURRET_SLOTS.length);
        for (const slot of used) expect(TURRET_SLOTS).toContain(slot);
      }
    }
  });

  it('marks merged geometry shared so a single tank cannot free it', () => {
    for (const id of TURRET_IDS) {
      const set = turretGeometry(id as TurretId);
      for (const part of [set.shell, set.barrel]) {
        for (const slot of TURRET_SLOTS) {
          const geo = part[slot];
          if (geo) expect(isShared(geo), `${id}/${slot} must be markShared`).toBe(true);
        }
      }
    }
  });

  it('memoizes geometry per turret id', () => {
    expect(turretGeometry('cannon')).toBe(turretGeometry('cannon'));
    expect(turretGeometry('railgun')).not.toBe(turretGeometry('flamethrower'));
  });

  it('adds at most one mesh per populated slot per part — no per-part meshes', () => {
    for (const id of TURRET_IDS) {
      const ctx = stubContext();
      buildTurret(ctx, id as TurretId);
      const turret = ctx.turret;
      const shellSet = turretGeometry(id as TurretId).shell;
      const shellOwned = new Set(Object.values(shellSet));
      // shell meshes are direct children of `ctx.turret`
      for (const child of turret.children) {
        if (child === ctx.barrelGroup || child === ctx.muzzle) continue;
        expect(child).toBeInstanceOf(THREE.Mesh);
        expect(shellOwned.has((child as THREE.Mesh).geometry)).toBe(true);
      }
      // barrel meshes are children of `ctx.barrelGroup`
      const barrel = ctx.barrelGroup;
      const barrelSet = turretGeometry(id as TurretId).barrel;
      const barrelOwned = new Set(Object.values(barrelSet));
      let barrelMeshes = 0;
      for (const child of barrel.children) {
        if (child === ctx.muzzle) continue;
        expect(child).toBeInstanceOf(THREE.Mesh);
        expect(barrelOwned.has((child as THREE.Mesh).geometry)).toBe(true);
        barrelMeshes++;
      }
      expect(barrelMeshes).toBeGreaterThanOrEqual(2);
    }
  });

  it('creates railGlowMat only when the rail slot is actually populated', () => {
    // Railguns have glowing rails; cannons and flamethrowers do not.
    const ctxR = stubContext();
    buildTurret(ctxR, 'railgun');
    expect(ctxR.railGlowMat).toBeDefined();
    const ctxC = stubContext();
    buildTurret(ctxC, 'cannon');
    expect(ctxC.railGlowMat).toBeUndefined();
    const ctxF = stubContext();
    buildTurret(ctxF, 'flamethrower');
    expect(ctxF.railGlowMat).toBeUndefined();
  });

  it('seats barrelGroup at BARREL_REST_Z so the recoil animation is a no-op at rest', () => {
    for (const id of TURRET_IDS) {
      const ctx = stubContext();
      buildTurret(ctx, id as TurretId);
      expect(ctx.barrelGroup.position.z).toBeCloseTo(0.55, 5);
    }
  });

  it('keeps the gun inside a sane detail budget', () => {
    for (const id of TURRET_IDS) {
      const set = turretGeometry(id as TurretId);
      let verts = 0;
      for (const part of [set.shell, set.barrel]) {
        for (const slot of TURRET_SLOTS) verts += part[slot]?.attributes.position.count ?? 0;
      }
      expect(verts, `${id} vertex budget`).toBeGreaterThan(600);
      expect(verts, `${id} vertex budget`).toBeLessThan(20000);
    }
  });

  it('merges geometry with a single consistent attribute set per slot', () => {
    for (const id of TURRET_IDS) {
      const set = turretGeometry(id as TurretId);
      for (const part of [set.shell, set.barrel]) {
        for (const slot of TURRET_SLOTS) {
          const geo = part[slot];
          if (!geo) continue;
          expect(Object.keys(geo.attributes).sort()).toEqual(['normal', 'position', 'uv']);
          expect(geo.attributes.position.count).toBe(geo.attributes.normal.count);
          expect(geo.attributes.position.count).toBe(geo.attributes.uv.count);
        }
      }
    }
  });

  it('produces three visibly different silhouettes', () => {
    // Approximate each turret by the bounding box of its (shell + barrel).
    // Different silhouettes mean the parts don't accidentally collapse to the
    // same box.
    const boxes: Record<string, THREE.Vector3> = {};
    for (const id of TURRET_IDS) {
      const set = turretGeometry(id as TurretId);
      const box = new THREE.Box3();
      for (const part of [set.shell, set.barrel]) {
        for (const slot of TURRET_SLOTS) {
          const geo = part[slot];
          if (!geo) continue;
          box.union(new THREE.Box3().setFromBufferAttribute(
            geo.attributes.position as THREE.BufferAttribute,
          ));
        }
      }
      boxes[id] = box.getSize(new THREE.Vector3());
    }
    // Railgun is the longest along the gun axis.
    expect(boxes.railgun.z).toBeGreaterThan(boxes.cannon.z);
    expect(boxes.railgun.z).toBeGreaterThan(boxes.flamethrower.z);
    // Flamethrower is the shortest and tallest (dome).
    expect(boxes.flamethrower.z).toBeLessThan(boxes.cannon.z);
    expect(boxes.flamethrower.y).toBeGreaterThan(boxes.railgun.y);
  });
});
