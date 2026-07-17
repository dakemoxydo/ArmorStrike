import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { RailgunBeamFx } from '../game/weapons/RailgunBeamFx';
import { WEAPON_TUNING } from '../core/catalog';

describe('RailgunBeamFx', () => {
  it('show places beam and lights; update fades; dispose removes from scene', () => {
    const scene = new THREE.Scene();
    const fx = new RailgunBeamFx(scene);

    // Construction adds beam + 2 lights
    expect(scene.children.length).toBe(3);

    const muzzle = new THREE.Vector3(0, 1, 0);
    const dir = new THREE.Vector3(0, 0, 1);
    fx.show(muzzle, dir, 40);

    const beam = scene.children.find((c) => c instanceof THREE.Mesh) as THREE.Mesh;
    expect(beam.visible).toBe(true);
    expect(beam.scale.z).toBe(40);

    const mat = beam.material as THREE.MeshBasicMaterial;
    expect(mat.opacity).toBe(1);

    // Half of beamDuration → opacity ~0.5
    const half = WEAPON_TUNING.railgun.beamDuration / 2;
    fx.update(half);
    expect(mat.opacity).toBeCloseTo(0.5, 5);

    // Full remaining fade
    fx.update(half + 0.001);
    expect(beam.visible).toBe(false);
    expect(mat.opacity).toBe(0);

    fx.dispose();
    expect(scene.children.length).toBe(0);
  });

  it('setImpactPosition moves impact light', () => {
    const scene = new THREE.Scene();
    const fx = new RailgunBeamFx(scene);
    const p = new THREE.Vector3(10, 2, -5);
    fx.setImpactPosition(p);

    const lights = scene.children.filter((c) => c instanceof THREE.PointLight) as THREE.PointLight[];
    // impact light is the second PointLight (muzzle then impact)
    expect(lights[1].position.x).toBe(10);
    expect(lights[1].position.y).toBe(2);
    expect(lights[1].position.z).toBe(-5);

    fx.dispose();
  });
});
