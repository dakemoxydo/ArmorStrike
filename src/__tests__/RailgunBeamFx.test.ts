import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { RailgunBeamFx } from '../game/weapons/RailgunBeamFx';
import { LightRig, LIGHT_CHANNEL_CAPACITY } from '../game/effects/LightRig';
import { WEAPON_TUNING } from '../core/catalog';

/** Rig capacity of the whole scene — the light count must never change. */
const RIG_LIGHTS =
  LIGHT_CHANNEL_CAPACITY.flash + LIGHT_CHANNEL_CAPACITY.beam + LIGHT_CHANNEL_CAPACITY.flame;

function makeFx() {
  const scene = new THREE.Scene();
  const rig = new LightRig(scene);
  const fx = new RailgunBeamFx(scene, rig);
  const meshes = () => scene.children.filter((c) => c instanceof THREE.Mesh) as THREE.Mesh[];
  const lightCount = () => scene.children.filter((c) => c instanceof THREE.PointLight).length;
  return {
    scene,
    rig,
    fx,
    meshes,
    lightCount,
    muzzleLight: rig.light('beam', 0),
    impactLight: rig.light('beam', 1),
  };
}

describe('RailgunBeamFx', () => {
  it('show places multi-layer beam and lights; update fades; dispose removes meshes', () => {
    const { scene, fx, meshes, lightCount, muzzleLight, impactLight } = makeFx();

    // Idle: 3 beam meshes, hidden, no light output.
    expect(meshes()).toHaveLength(3);
    for (const m of meshes()) expect(m.visible).toBe(false);
    expect(muzzleLight.intensity).toBe(0);
    expect(impactLight.intensity).toBe(0);

    const muzzle = new THREE.Vector3(0, 1, 0);
    const dir = new THREE.Vector3(0, 0, 1);
    fx.show(muzzle, dir, 40);

    const beams = meshes();
    expect(beams).toHaveLength(3);
    for (const beam of beams) {
      expect(beam.visible).toBe(true);
      expect(beam.scale.z).toBe(40);
    }

    const body = beams.find((b) => (b.material as THREE.MeshBasicMaterial).color.getHex() === 0x8fffe8)!;
    const bodyMat = body.material as THREE.MeshBasicMaterial;
    expect(bodyMat.opacity).toBe(1);

    // Lights are rig slots: written on show, never attached/detached.
    expect(muzzleLight.intensity).toBeGreaterThan(0);
    expect(impactLight.intensity).toBeGreaterThan(0);
    expect(impactLight.position.z).toBeCloseTo(40, 5);
    // Colors are re-applied per show (slots are shared across instances).
    expect(muzzleLight.color.getHex()).toBe(0x2ee6c0);
    expect(impactLight.color.getHex()).toBe(0xfff0a0);

    const half = WEAPON_TUNING.railgun.beamDuration / 2;
    fx.update(half);
    expect(bodyMat.opacity).toBeCloseTo(0.5, 5);

    fx.update(half + 0.001);
    for (const beam of beams) {
      expect(beam.visible).toBe(false);
    }
    expect(bodyMat.opacity).toBe(0);
    // Faded: lights extinguished in place, scene light count unchanged.
    expect(muzzleLight.intensity).toBe(0);
    expect(impactLight.intensity).toBe(0);
    expect(lightCount()).toBe(RIG_LIGHTS);

    fx.dispose();
    expect(meshes()).toHaveLength(0);
    // Rig lights belong to the scene, not to the beam fx.
    expect(lightCount()).toBe(RIG_LIGHTS);
    expect(scene.children.length).toBe(RIG_LIGHTS);
  });

  it('setImpactPosition moves impact light', () => {
    const { fx, impactLight } = makeFx();
    const p = new THREE.Vector3(10, 2, -5);
    fx.setImpactPosition(p);

    expect(impactLight.position.x).toBe(10);
    expect(impactLight.position.y).toBe(2);
    expect(impactLight.position.z).toBe(-5);
    expect(impactLight.intensity).toBeGreaterThan(0);

    fx.dispose();
  });

  it('radial punch settles scale toward 1 on first frames', () => {
    const { fx, meshes } = makeFx();
    fx.show(new THREE.Vector3(), new THREE.Vector3(0, 0, 1), 20);

    const body = meshes()[1];
    expect(body.scale.x).toBeGreaterThan(1.5);

    fx.update(0.06);
    expect(body.scale.x).toBeCloseTo(1, 1);

    fx.dispose();
  });

  it('setLength shortens the beam mesh layers and moves impact light to the new end', () => {
    const { fx, meshes, impactLight } = makeFx();
    const muzzle = new THREE.Vector3(0, 1, 0);
    const dir = new THREE.Vector3(0, 0, 1);
    fx.show(muzzle, dir, 40);

    // M18 fix: previously only the light moved — meshes kept drawing through walls.
    fx.setLength(20);
    for (const b of meshes()) {
      expect(b.scale.z).toBe(20);
      // Midpoint should be at z = 10 (muzzle.z + 20/2).
      expect(b.position.z).toBeCloseTo(10, 5);
    }
    expect(impactLight.position.z).toBeCloseTo(20, 5);

    fx.dispose();
  });

  it('setLength is a no-op when no active beam', () => {
    const { scene, fx, lightCount } = makeFx();
    // No show() called — setLength must not throw or add children.
    expect(() => fx.setLength(10)).not.toThrow();
    expect(scene.children.length).toBe(RIG_LIGHTS + 3); // rig + idle meshes
    expect(lightCount()).toBe(RIG_LIGHTS);
    fx.dispose();
  });

  it('shared geometry is ref-counted: disposed only after last instance disposes', () => {
    const scene = new THREE.Scene();
    const rig = new LightRig(scene);
    const a = new RailgunBeamFx(scene, rig);
    const b = new RailgunBeamFx(scene, rig);
    a.dispose();
    // Second instance still alive → geometries NOT yet disposed.
    // Re-creating a third instance reuses the same shared geos (no duplicate construction).
    const c = new RailgunBeamFx(scene, rig);
    b.dispose();
    c.dispose();
    // After all instances gone, only the rig lights are left.
    expect(scene.children.filter((o) => o instanceof THREE.Mesh)).toHaveLength(0);
    expect(scene.children).toHaveLength(RIG_LIGHTS);
  });
});
