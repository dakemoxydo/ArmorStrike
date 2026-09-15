// ===== NanoBeamFx — позиционание дуг (E4-регрессия) =====
// Общая с рельсой beam-геометрия центрирована (z∈[−0.5,0.5]), поэтому mesh
// обязан стоять в середине отрезка from→to (как RailgunBeamFx.layoutBeam, пин
// :307 в RailgunBeamFx.test.ts). До фикса дуга копировала в позицию `from` —
// хвост уезжал за танк, яркая голова останавливалась на середине дистанции.
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { NanoBeamFx } from '../game/weapons/NanoBeamFx';

function arcMeshes(scene: THREE.Scene): THREE.Mesh[] {
  return scene.children.filter((c) => c instanceof THREE.Mesh) as THREE.Mesh[];
}

describe('NanoBeamFx', () => {
  it('E4: каждая дуга центрирована на середине from→to и масштабируется длиной', () => {
    const scene = new THREE.Scene();
    const fx = new NanoBeamFx(scene);
    const meshes = arcMeshes(scene);
    expect(meshes).toHaveLength(2); // два рожка-эмитёра

    const fromA = new THREE.Vector3(0, 1, 2);
    const fromB = new THREE.Vector3(0.5, 1, 2);
    const to = new THREE.Vector3(0, 1, 42);
    fx.step(1 / 60, fromA, fromB, to, 1, 0xff2d6b);

    const froms = [fromA, fromB];
    meshes.forEach((m, i) => {
      const from = froms[i];
      expect(m.visible).toBe(true);
      const mid = from.clone().add(to).multiplyScalar(0.5);
      expect(m.position.x).toBeCloseTo(mid.x, 5);
      expect(m.position.y).toBeCloseTo(mid.y, 5);
      expect(m.position.z).toBeCloseTo(mid.z, 5);
      // Голова дуги (центр + половина длины по направлению к цели) — в цели.
      const head = mid.clone().add(to.clone().sub(from).normalize().multiplyScalar(m.scale.z / 2));
      expect(head.distanceTo(to)).toBeLessThan(0.001);
      expect(m.scale.z).toBeCloseTo(from.distanceTo(to), 5);
    });
    fx.dispose();
  });

  it('kill() мгновенно скрывает обе дуги (смерть владельца)', () => {
    const scene = new THREE.Scene();
    const fx = new NanoBeamFx(scene);
    const from = new THREE.Vector3();
    fx.step(1 / 60, from, from, new THREE.Vector3(0, 0, 30), 1, 0xff2d6b);
    expect(arcMeshes(scene).every((m) => m.visible)).toBe(true);
    fx.kill();
    expect(arcMeshes(scene).every((m) => !m.visible)).toBe(true);
    fx.dispose();
  });
});
