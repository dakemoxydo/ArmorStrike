import * as THREE from 'three';
import type { ParticleSystem } from './ParticleSystem';
import { clamp } from '../engine/physics';

interface CoreAnim {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  t: number;
  dur: number;
  maxS: number;
  active: boolean;
}

const POOL = 8;

export class CoreSystem implements ParticleSystem {
  private readonly pool: CoreAnim[] = [];
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene, geo: THREE.SphereGeometry) {
    this.scene = scene;
    for (let i = 0; i < POOL; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xfff2cc, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      scene.add(mesh);
      this.pool.push({ mesh, mat, t: 0, dur: 0.32, maxS: 1, active: false });
    }
  }

  private acquire(): CoreAnim {
    const free = this.pool.find((c) => !c.active);
    if (free) return free;
    let oldest = this.pool[0];
    for (let i = 1; i < this.pool.length; i++) {
      if (this.pool[i].t > oldest.t) oldest = this.pool[i];
    }
    return oldest;
  }

  spawn(p: THREE.Vector3, maxS: number) {
    const c = this.acquire();
    c.active = true;
    c.t = 0;
    c.dur = 0.32;
    c.maxS = maxS;
    c.mesh.position.copy(p);
    c.mesh.scale.setScalar(0.2);
    c.mat.opacity = 1;
    c.mesh.visible = true;
  }

  update(dt: number) {
    for (const c of this.pool) {
      if (!c.active) continue;
      c.t += dt;
      const k = clamp(c.t / c.dur, 0, 1);
      c.mesh.scale.setScalar(0.2 + k * c.maxS);
      c.mat.opacity = 1 - k;
      if (k >= 1) {
        c.active = false;
        c.mesh.visible = false;
        c.mat.opacity = 0;
      }
    }
  }

  dispose() {
    for (const c of this.pool) {
      this.scene.remove(c.mesh);
      c.mat.dispose();
      c.active = false;
    }
    this.pool.length = 0;
  }
}
