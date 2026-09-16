import { describe, expect, it, beforeAll, vi } from 'vitest';
import * as THREE from 'three';
import { DriveDustPool } from '../game/effects/DriveDustPool';

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

describe('DriveDustPool - InstancedMesh Driving Dust', () => {
  beforeAll(() => {
    stubCanvas();
  });
  it('initializes with a single InstancedMesh of 120 capacity in scene', () => {
    const scene = new THREE.Scene();
    const pool = new DriveDustPool(scene);

    expect(scene.children.length).toBe(1);
    const mesh = scene.children[0] as THREE.InstancedMesh;
    expect(mesh.isInstancedMesh).toBe(true);
    expect(mesh.count).toBe(120);
    expect(mesh.frustumCulled).toBe(false);

    pool.dispose();
  });

  it('spawns a dust particle with correct initial position, scale, and alpha', () => {
    const scene = new THREE.Scene();
    const pool = new DriveDustPool(scene);
    const mesh = scene.children[0] as THREE.InstancedMesh;

    const pos = new THREE.Vector3(12, 0.2, -8);
    const vel = new THREE.Vector3(0, 1.2, -2);
    pool.spawn(pos, vel, 0.4, 1.8, 0.9, 0.5);

    const mat = new THREE.Matrix4();
    mesh.getMatrixAt(0, mat);

    const position = new THREE.Vector3();
    const scale = new THREE.Vector3();
    mat.decompose(position, new THREE.Quaternion(), scale);

    expect(position.x).toBeCloseTo(12, 3);
    expect(position.y).toBeCloseTo(0.2, 3);
    expect(position.z).toBeCloseTo(-8, 3);
    expect(scale.x).toBeCloseTo(0.4, 3);

    const alphaAttr = mesh.geometry.getAttribute('instanceAlpha') as THREE.InstancedBufferAttribute;
    expect(alphaAttr.getX(0)).toBeCloseTo(0.5, 3);

    pool.dispose();
  });

  it('expands scale and moves with air drag over time', () => {
    const scene = new THREE.Scene();
    const pool = new DriveDustPool(scene);
    const mesh = scene.children[0] as THREE.InstancedMesh;

    const pos = new THREE.Vector3(0, 0.2, 0);
    const vel = new THREE.Vector3(4, 1.0, 0);
    pool.spawn(pos, vel, 0.4, 1.8, 1.0, 0.5);

    // Advance 0.4s (40% of lifetime)
    pool.update(0.4);

    const mat = new THREE.Matrix4();
    mesh.getMatrixAt(0, mat);
    const position = new THREE.Vector3();
    const scale = new THREE.Vector3();
    mat.decompose(position, new THREE.Quaternion(), scale);

    // Dust rose and moved along X
    expect(position.y).toBeGreaterThan(0.2);
    expect(position.x).toBeGreaterThan(0);

    // Scale expanded from 0.4 toward 1.8
    expect(scale.x).toBeGreaterThan(0.4);
    expect(scale.x).toBeLessThan(1.8);

    pool.dispose();
  });

  it('deactivates particle and resets scale to 0 on lifetime expiry', () => {
    const scene = new THREE.Scene();
    const pool = new DriveDustPool(scene);
    const mesh = scene.children[0] as THREE.InstancedMesh;
    const alphaAttr = mesh.geometry.getAttribute('instanceAlpha') as THREE.InstancedBufferAttribute;

    pool.spawn(new THREE.Vector3(0, 0.2, 0), new THREE.Vector3(0, 1, 0), 0.5, 1.5, 0.8, 0.4);

    // Advance past max life
    pool.update(1.0);

    expect(alphaAttr.getX(0)).toBe(0);

    const mat = new THREE.Matrix4();
    mesh.getMatrixAt(0, mat);
    expect(mat.elements[0]).toBe(0);
    expect(mat.elements[5]).toBe(0);
    expect(mat.elements[10]).toBe(0);

    pool.dispose();
  });

  it('clears all active particles on clear()', () => {
    const scene = new THREE.Scene();
    const pool = new DriveDustPool(scene);
    const mesh = scene.children[0] as THREE.InstancedMesh;

    pool.spawn(new THREE.Vector3(1, 0, 1), new THREE.Vector3(0, 1, 0));
    pool.clear();

    const alphaAttr = mesh.geometry.getAttribute('instanceAlpha') as THREE.InstancedBufferAttribute;
    expect(alphaAttr.getX(0)).toBe(0);

    const mat = new THREE.Matrix4();
    mesh.getMatrixAt(0, mat);
    expect(mat.elements[0]).toBe(0);
    expect(mat.elements[5]).toBe(0);
    expect(mat.elements[10]).toBe(0);

    pool.dispose();
  });
});
