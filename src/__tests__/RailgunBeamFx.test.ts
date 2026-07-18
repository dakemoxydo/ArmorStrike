import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { RailgunBeamFx } from '../game/weapons/RailgunBeamFx';
import { WEAPON_TUNING } from '../core/catalog';

describe('RailgunBeamFx', () => {
  it('show places multi-layer beam and lights; update fades; dispose removes from scene', () => {
    const scene = new THREE.Scene();
    const fx = new RailgunBeamFx(scene);

    // Idle: 3 beam meshes only (lights attached on show, detached on fade)
    expect(scene.children.length).toBe(3);

    const muzzle = new THREE.Vector3(0, 1, 0);
    const dir = new THREE.Vector3(0, 0, 1);
    fx.show(muzzle, dir, 40);

    // 3 meshes + 2 lights while active
    expect(scene.children.length).toBe(5);

    const beams = scene.children.filter((c) => c instanceof THREE.Mesh) as THREE.Mesh[];
    expect(beams).toHaveLength(3);
    for (const beam of beams) {
      expect(beam.visible).toBe(true);
      expect(beam.scale.z).toBe(40);
    }

    const body = beams.find((b) => (b.material as THREE.MeshBasicMaterial).color.getHex() === 0x8fffe8)!;
    const bodyMat = body.material as THREE.MeshBasicMaterial;
    expect(bodyMat.opacity).toBe(1);

    const lights = scene.children.filter((c) => c instanceof THREE.PointLight) as THREE.PointLight[];
    expect(lights).toHaveLength(2);
    const impact = lights[1];
    expect(impact.position.z).toBeCloseTo(40, 5);
    expect(impact.intensity).toBeGreaterThan(0);

    const half = WEAPON_TUNING.railgun.beamDuration / 2;
    fx.update(half);
    expect(bodyMat.opacity).toBeCloseTo(0.5, 5);

    fx.update(half + 0.001);
    for (const beam of beams) {
      expect(beam.visible).toBe(false);
    }
    expect(bodyMat.opacity).toBe(0);
    // Lights detached after fade
    expect(scene.children.filter((c) => c instanceof THREE.PointLight)).toHaveLength(0);

    fx.dispose();
    expect(scene.children.length).toBe(0);
  });

  it('setImpactPosition moves impact light', () => {
    const scene = new THREE.Scene();
    const fx = new RailgunBeamFx(scene);
    // setImpactPosition attaches lights if needed
    const p = new THREE.Vector3(10, 2, -5);
    fx.setImpactPosition(p);

    const lights = scene.children.filter((c) => c instanceof THREE.PointLight) as THREE.PointLight[];
    expect(lights.length).toBeGreaterThanOrEqual(1);
    const impact = lights[lights.length - 1];
    expect(impact.position.x).toBe(10);
    expect(impact.position.y).toBe(2);
    expect(impact.position.z).toBe(-5);

    fx.dispose();
  });

  it('radial punch settles scale toward 1 on first frames', () => {
    const scene = new THREE.Scene();
    const fx = new RailgunBeamFx(scene);
    fx.show(new THREE.Vector3(), new THREE.Vector3(0, 0, 1), 20);

    const body = scene.children.filter((c) => c instanceof THREE.Mesh)[1] as THREE.Mesh;
    expect(body.scale.x).toBeGreaterThan(1.5);

    fx.update(0.06);
    expect(body.scale.x).toBeCloseTo(1, 1);

    fx.dispose();
  });
});
