import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { cloneWithOwnMaterials } from '../game/tank/AssetManager';
import { disposeObject3D } from '../game/resources/disposeObject3D';
import { markShared, isShared } from '../game/resources/sharedResources';

/** Мастер: два меша на одном материале и одной геометрии (типично для GLB). */
function makeMaster() {
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const mat = new THREE.MeshStandardMaterial({ color: 0x274a58 });
  const root = new THREE.Group();
  root.add(new THREE.Mesh(geo, mat), new THREE.Mesh(geo, mat));
  return { root, geo, mat };
}

describe('cloneWithOwnMaterials', () => {
  it('gives every instance its own materials (per-tank FX must not leak)', () => {
    const { root, mat } = makeMaster();
    const a = cloneWithOwnMaterials(root);
    const b = cloneWithOwnMaterials(root);

    const matOf = (g: THREE.Object3D, i: number) =>
      (g.children[i] as THREE.Mesh).material as THREE.MeshStandardMaterial;

    expect(matOf(a, 0)).not.toBe(mat);
    expect(matOf(a, 0)).not.toBe(matOf(b, 0));

    // Hit-flash на экземпляре A не трогает ни мастера, ни экземпляр B.
    matOf(a, 0).emissive.setScalar(0.9);
    expect(matOf(b, 0).emissive.getHex()).toBe(0);
    expect(mat.emissive.getHex()).toBe(0);
  });

  it('reuses one clone per shared master material within an instance', () => {
    const { root } = makeMaster();
    const a = cloneWithOwnMaterials(root);
    const m0 = (a.children[0] as THREE.Mesh).material;
    const m1 = (a.children[1] as THREE.Mesh).material;
    expect(m0).toBe(m1);
  });

  it('keeps geometry shared with the master', () => {
    const { root, geo } = makeMaster();
    const a = cloneWithOwnMaterials(root);
    expect((a.children[0] as THREE.Mesh).geometry).toBe(geo);
  });
});

describe('disposeObject3D + shared registry', () => {
  it('never disposes shared geometry/textures, but frees instance materials', () => {
    const { root, geo } = makeMaster();
    const tex = new THREE.Texture();
    markShared(geo);
    markShared(tex);

    const instance = cloneWithOwnMaterials(root);
    const instMat = (instance.children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial;
    instMat.map = tex;

    let geoDisposed = false;
    let texDisposed = false;
    let matDisposed = false;
    geo.addEventListener('dispose', () => { geoDisposed = true; });
    tex.addEventListener('dispose', () => { texDisposed = true; });
    instMat.addEventListener('dispose', () => { matDisposed = true; });

    disposeObject3D(instance);

    expect(isShared(geo)).toBe(true);
    expect(geoDisposed).toBe(false);
    expect(texDisposed).toBe(false);
    expect(matDisposed).toBe(true);
  });
});
