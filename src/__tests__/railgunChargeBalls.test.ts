// ===== M21: RailgunChargeBalls — mesh-жизненный цикл контактных шаров =====
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { RailgunChargeBalls } from '../game/weapons/railgunChargeBalls';
import type { WeaponOwner } from '../game/weapons/types';

function fakeOwner(): WeaponOwner {
  return {
    muzzleWorld: (out: THREE.Vector3) => out.set(0, 2, 5),
    aimDir: (out: THREE.Vector3) => out.set(0, 0, 1),
  } as unknown as WeaponOwner;
}

describe('RailgunChargeBalls', () => {
  it('hidden until beginCharge, then both balls are visible', () => {
    const scene = new THREE.Scene();
    const balls = new RailgunChargeBalls(scene);
    const owner = fakeOwner();

    const meshes = () => scene.children.filter((c) => c instanceof THREE.Mesh) as THREE.Mesh[];
    expect(meshes()).toHaveLength(2);
    for (const m of meshes()) expect(m.visible).toBe(false);

    balls.beginCharge();
    balls.setProgress(0.5);
    balls.update(0.016, owner);
    for (const m of meshes()) expect(m.visible).toBe(true);
    // Positioned at the muzzle.
    for (const m of meshes()) expect(m.position.z).toBeCloseTo(5, 3);

    balls.dispose();
    expect(meshes()).toHaveLength(0);
  });

  it('confirmFire starts a release that self-clears after releaseDuration', () => {
    const scene = new THREE.Scene();
    const balls = new RailgunChargeBalls(scene);
    const owner = fakeOwner();

    balls.beginCharge();
    balls.setProgress(1);
    balls.confirmFire();
    // Still visible the frame of fire (the pop plays out).
    balls.update(0.016, owner);
    const meshes = () => scene.children.filter((c) => c instanceof THREE.Mesh) as THREE.Mesh[];
    expect(meshes().some((m) => m.visible)).toBe(true);

    // Run past the release window → fully hidden.
    for (let i = 0; i < 30; i++) balls.update(0.05, owner);
    for (const m of meshes()) expect(m.visible).toBe(false);

    balls.dispose();
  });

  it('hide cuts to invisible immediately (death/dispose)', () => {
    const scene = new THREE.Scene();
    const balls = new RailgunChargeBalls(scene);
    const owner = fakeOwner();
    balls.beginCharge();
    balls.setProgress(0.8);
    balls.update(0.016, owner);

    balls.hide();
    const meshes = () => scene.children.filter((c) => c instanceof THREE.Mesh) as THREE.Mesh[];
    for (const m of meshes()) expect(m.visible).toBe(false);
    // A later update while off must not resurrect them.
    balls.update(0.016, owner);
    for (const m of meshes()) expect(m.visible).toBe(false);

    balls.dispose();
  });

  it('electric ball leads white air ball in renderOrder (glow on top)', () => {
    const scene = new THREE.Scene();
    const balls = new RailgunChargeBalls(scene);
    const meshes = () => scene.children.filter((c) => c instanceof THREE.Mesh) as THREE.Mesh[];
    const electric = meshes().find((m) => (m.material as THREE.MeshBasicMaterial).blending === THREE.AdditiveBlending)!;
    const air = meshes().find((m) => (m.material as THREE.MeshBasicMaterial).blending === THREE.NormalBlending)!;
    expect(electric.renderOrder).toBeGreaterThan(air.renderOrder);
    balls.dispose();
  });

  it('shared sphere geometry is ref-counted across instances', () => {
    const scene = new THREE.Scene();
    const a = new RailgunChargeBalls(scene);
    const b = new RailgunChargeBalls(scene);
    // Two instances → 4 meshes (each owns its own material/visibility).
    expect(scene.children.filter((c) => c instanceof THREE.Mesh)).toHaveLength(4);
    a.dispose();
    b.dispose();
    expect(scene.children.filter((c) => c instanceof THREE.Mesh)).toHaveLength(0);
  });
});
