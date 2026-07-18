import * as THREE from 'three';
import type { ParticleSystem } from './ParticleSystem';
import { scorchTexture } from '../textures';

interface ScorchMark {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  t: number;
  active: boolean;
}

export class ScorchSystem implements ParticleSystem {
  private readonly pool: ScorchMark[] = [];
  private scene: THREE.Scene;
  private readonly cap = 10;
  private readonly map: THREE.Texture;
  private cursor = 0;

  constructor(scene: THREE.Scene, geo: THREE.CircleGeometry) {
    this.scene = scene;
    this.map = scorchTexture();
    for (let i = 0; i < this.cap; i++) {
      const mat = new THREE.MeshBasicMaterial({
        map: this.map, transparent: true, opacity: 0, depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.visible = false;
      scene.add(mesh);
      this.pool.push({ mesh, mat, t: 0, active: false });
    }
  }

  addScorch(p: THREE.Vector3, size: number) {
    const sc = this.pool[this.cursor];
    this.cursor = (this.cursor + 1) % this.cap;
    sc.active = true;
    sc.t = 0;
    sc.mesh.position.set(p.x, 0.06 + this.cursor * 0.001, p.z);
    sc.mesh.scale.setScalar(size);
    sc.mat.opacity = 0.9;
    sc.mesh.visible = true;
  }

  update(dt: number) {
    for (const sc of this.pool) {
      if (!sc.active) continue;
      sc.t += dt;
      if (sc.t > 6) {
        sc.mat.opacity = Math.max(0, 0.9 - (sc.t - 6) * 0.15);
        if (sc.mat.opacity <= 0) {
          sc.active = false;
          sc.mesh.visible = false;
        }
      }
    }
  }

  dispose() {
    for (const sc of this.pool) {
      this.scene.remove(sc.mesh);
      sc.mat.dispose();
      sc.active = false;
    }
    this.pool.length = 0;
  }
}
