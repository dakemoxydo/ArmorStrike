import * as THREE from 'three';
import type { ParticleSystem } from './ParticleSystem';
import { clamp } from '../engine/physics';

interface CoreAnim { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; t: number; dur: number; maxS: number }

export class CoreSystem implements ParticleSystem {
  private cores: CoreAnim[] = [];
  private scene: THREE.Scene;
  private geo: THREE.SphereGeometry;

  constructor(scene: THREE.Scene, geo: THREE.SphereGeometry) {
    this.scene = scene;
    this.geo = geo;
  }

  spawn(p: THREE.Vector3, maxS: number) {
    const mat = new THREE.MeshBasicMaterial({
      color: 0xfff2cc, transparent: true, opacity: 1,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const core = new THREE.Mesh(this.geo, mat);
    core.position.copy(p);
    this.scene.add(core);
    this.cores.push({ mesh: core, mat, t: 0, dur: 0.32, maxS });
  }

  update(dt: number) {
    for (let i = this.cores.length - 1; i >= 0; i--) {
      const c = this.cores[i];
      c.t += dt;
      const k = clamp(c.t / c.dur, 0, 1);
      c.mesh.scale.setScalar(0.2 + k * c.maxS);
      c.mat.opacity = 1 - k;
      if (k >= 1) {
        this.scene.remove(c.mesh);
        c.mat.dispose();
        this.cores.splice(i, 1);
      }
    }
  }

  dispose() {
    for (const c of this.cores) {
      this.scene.remove(c.mesh);
      c.mat.dispose();
    }
    this.cores.length = 0;
  }
}
