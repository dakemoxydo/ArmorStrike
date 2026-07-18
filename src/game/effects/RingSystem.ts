import * as THREE from 'three';
import type { ParticleSystem } from './ParticleSystem';
import { clamp } from '../engine/physics';

interface RingAnim {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  t: number;
  dur: number;
  maxR: number;
  active: boolean;
}

const POOL = 8;

export class RingSystem implements ParticleSystem {
  private readonly pool: RingAnim[] = [];
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene, geo: THREE.RingGeometry) {
    this.scene = scene;
    for (let i = 0; i < POOL; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffffff, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.visible = false;
      scene.add(mesh);
      this.pool.push({ mesh, mat, t: 0, dur: 0.55, maxR: 1, active: false });
    }
  }

  private acquire(): RingAnim {
    const free = this.pool.find((r) => !r.active);
    if (free) return free;
    let oldest = this.pool[0];
    for (let i = 1; i < this.pool.length; i++) {
      if (this.pool[i].t > oldest.t) oldest = this.pool[i];
    }
    return oldest;
  }

  spawn(p: THREE.Vector3, color: number, maxR: number) {
    const r = this.acquire();
    r.active = true;
    r.t = 0;
    r.dur = 0.55;
    r.maxR = maxR;
    r.mat.color.setHex(color);
    r.mat.opacity = 0.85;
    r.mesh.position.set(p.x, 0.12, p.z);
    r.mesh.scale.setScalar(0.4);
    r.mesh.visible = true;
  }

  update(dt: number) {
    for (const r of this.pool) {
      if (!r.active) continue;
      r.t += dt;
      const k = clamp(r.t / r.dur, 0, 1);
      const e = 1 - Math.pow(1 - k, 3);
      r.mesh.scale.setScalar(0.4 + e * r.maxR);
      r.mat.opacity = 0.85 * (1 - k);
      if (k >= 1) {
        r.active = false;
        r.mesh.visible = false;
        r.mat.opacity = 0;
      }
    }
  }

  dispose() {
    for (const r of this.pool) {
      this.scene.remove(r.mesh);
      r.mat.dispose();
      r.active = false;
    }
    this.pool.length = 0;
  }
}
