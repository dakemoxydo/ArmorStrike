import * as THREE from 'three';
import type { ParticleSystem } from './ParticleSystem';
import { scorchTexture } from '../textures';

interface ScorchMark { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; t: number }

export class ScorchSystem implements ParticleSystem {
  private scorch: ScorchMark[] = [];
  private scene: THREE.Scene;
  private geo: THREE.CircleGeometry;
  private cap = 10;

  constructor(scene: THREE.Scene, geo: THREE.CircleGeometry) {
    this.scene = scene;
    this.geo = geo;
  }

  addScorch(p: THREE.Vector3, size: number) {
    const mat = new THREE.MeshBasicMaterial({
      map: scorchTexture(), transparent: true, opacity: 0.9, depthWrite: false,
    });
    const m = new THREE.Mesh(this.geo, mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(p.x, 0.06 + this.scorch.length * 0.001, p.z);
    m.scale.setScalar(size);
    this.scene.add(m);
    this.scorch.push({ mesh: m, mat, t: 0 });
    if (this.scorch.length > this.cap) {
      const old = this.scorch.shift()!;
      this.scene.remove(old.mesh);
      old.mat.dispose();
    }
  }

  update(dt: number) {
    for (const sc of this.scorch) {
      sc.t += dt;
      if (sc.t > 6) sc.mat.opacity = Math.max(0, 0.9 - (sc.t - 6) * 0.15);
    }
  }

  dispose() {
    for (const sc of this.scorch) {
      this.scene.remove(sc.mesh);
      sc.mat.dispose();
    }
    this.scorch.length = 0;
  }
}
