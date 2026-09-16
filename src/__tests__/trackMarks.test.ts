import { describe, expect, it, beforeAll, vi } from 'vitest';
import * as THREE from 'three';
import { TrackMarkPool } from '../game/effects/TrackMarkPool';

function stubCanvas() {
  const ctx = {
    createRadialGradient: () => ({ addColorStop: () => {} }),
    createLinearGradient: () => ({ addColorStop: () => {} }),
    fillStyle: '' as string | CanvasGradient,
    fillRect: () => {},
    clearRect: () => {},
    beginPath: () => {},
    arc: () => {},
    fill: () => {},
    moveTo: () => {},
    lineTo: () => {},
    stroke: () => {},
  };
  const realCreate = typeof document !== 'undefined' ? document.createElement.bind(document) : undefined;
  vi.stubGlobal('document', {
    ...(typeof document !== 'undefined' ? document : {}),
    createElement: (tag: string, options?: ElementCreationOptions) => {
      if (tag === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: () => ctx,
        } as unknown as HTMLCanvasElement;
      }
      return realCreate ? realCreate(tag, options) : {};
    },
  });
}

describe('TrackMarkPool - InstancedMesh Track Marks', () => {
  beforeAll(() => {
    stubCanvas();
  });
  it('initializes with a single InstancedMesh of 500 capacity in scene', () => {
    const scene = new THREE.Scene();
    const pool = new TrackMarkPool(scene);

    expect(scene.children.length).toBe(1);
    const mesh = scene.children[0] as THREE.InstancedMesh;
    expect(mesh.isInstancedMesh).toBe(true);
    expect(mesh.count).toBe(500);
    expect(mesh.frustumCulled).toBe(false);

    pool.dispose();
  });

  it('spawns track mark with correct position, rotation, and alpha', () => {
    const scene = new THREE.Scene();
    const pool = new TrackMarkPool(scene);
    const mesh = scene.children[0] as THREE.InstancedMesh;

    const pos = new THREE.Vector3(10, 0, 20);
    const yaw = Math.PI / 4;
    pool.spawn(pos, yaw, 0.7, 0.9, 0.8);

    const mat = new THREE.Matrix4();
    mesh.getMatrixAt(0, mat);

    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    mat.decompose(position, quaternion, scale);

    expect(position.x).toBeCloseTo(10, 3);
    expect(position.y).toBeCloseTo(0.025, 3); // Slightly above ground
    expect(position.z).toBeCloseTo(20, 3);
    expect(scale.x).toBeCloseTo(0.7, 3);
    expect(scale.z).toBeCloseTo(0.9, 3);

    // Alpha attribute initialized
    const alphaAttr = mesh.geometry.getAttribute('instanceAlpha') as THREE.InstancedBufferAttribute;
    expect(alphaAttr.getX(0)).toBeCloseTo(0.8, 3);

    pool.dispose();
  });

  it('wraps around ring buffer when capacity is exceeded', () => {
    const scene = new THREE.Scene();
    const pool = new TrackMarkPool(scene);
    const pos = new THREE.Vector3();

    // Spawn 502 marks -> should wrap around to index 2
    for (let i = 0; i < 502; i++) {
      pos.set(i, 0, i);
      pool.spawn(pos, 0, 0.68, 0.85, 0.7);
    }

    const mesh = scene.children[0] as THREE.InstancedMesh;
    const mat = new THREE.Matrix4();
    mesh.getMatrixAt(1, mat);

    const position = new THREE.Vector3();
    mat.decompose(position, new THREE.Quaternion(), new THREE.Vector3());
    expect(position.x).toBeCloseTo(501, 3);

    pool.dispose();
  });

  it('fades out alpha in final 35% of lifetime and deactivates at end', () => {
    const scene = new THREE.Scene();
    const pool = new TrackMarkPool(scene);
    const mesh = scene.children[0] as THREE.InstancedMesh;
    const alphaAttr = mesh.geometry.getAttribute('instanceAlpha') as THREE.InstancedBufferAttribute;

    pool.spawn(new THREE.Vector3(0, 0, 0), 0, 0.68, 0.85, 0.8);

    // Initial life is 1.0 (11 seconds). Advance by 8 seconds (~72% elapsed, 28% remaining < 35%)
    pool.update(8.0);
    expect(alphaAttr.getX(0)).toBeLessThan(0.8);
    expect(alphaAttr.getX(0)).toBeGreaterThan(0);

    // Advance past max life
    pool.update(4.0);
    expect(alphaAttr.getX(0)).toBe(0);

    // Matrix scaled to 0 on deactivation
    const mat = new THREE.Matrix4();
    mesh.getMatrixAt(0, mat);
    expect(mat.elements[0]).toBe(0);
    expect(mat.elements[5]).toBe(0);
    expect(mat.elements[10]).toBe(0);

    pool.dispose();
  });

  it('clears all active marks on clear()', () => {
    const scene = new THREE.Scene();
    const pool = new TrackMarkPool(scene);
    const mesh = scene.children[0] as THREE.InstancedMesh;
    const alphaAttr = mesh.geometry.getAttribute('instanceAlpha') as THREE.InstancedBufferAttribute;

    pool.spawn(new THREE.Vector3(5, 0, 5), 0, 0.7, 0.9, 0.8);
    expect(alphaAttr.getX(0)).toBeCloseTo(0.8, 3);

    pool.clear();
    expect(alphaAttr.getX(0)).toBe(0);

    const mat = new THREE.Matrix4();
    mesh.getMatrixAt(0, mat);
    expect(mat.elements[0]).toBe(0);
    expect(mat.elements[5]).toBe(0);
    expect(mat.elements[10]).toBe(0);

    pool.dispose();
  });
});
