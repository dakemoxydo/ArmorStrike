import * as THREE from 'three';
import type { ParticleSystem } from './ParticleSystem';
import { clamp } from '../engine/physics';

interface RingAnim { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; t: number; dur: number; maxR: number }

export class RingSystem implements ParticleSystem {
  private rings: RingAnim[] = [];
  private scene: THREE.Scene;
  private geo: THREE.RingGeometry;

  constructor(scene: THREE.Scene, geo: THREE.RingGeometry) {
    this.scene = scene;
    this.geo = geo;
  }

  spawn(p: THREE.Vector3, color: number, maxR: number) {
    const mat = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.85,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(this.geo, mat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(p.x, 0.12, p.z);
    this.scene.add(ring);
    this.rings.push({ mesh: ring, mat, t: 0, dur: 0.55, maxR });
  }

  update(dt: number) {
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.t += dt;
      const k = clamp(r.t / r.dur, 0, 1);
      const e = 1 - Math.pow(1 - k, 3);
      r.mesh.scale.setScalar(0.4 + e * r.maxR);
      r.mat.opacity = 0.85 * (1 - k);
      if (k >= 1) {
        this.scene.remove(r.mesh);
        r.mat.dispose();
        this.rings.splice(i, 1);
      }
    }
  }

  dispose() {
    for (const r of this.rings) {
      this.scene.remove(r.mesh);
      r.mat.dispose();
    }
    this.rings.length = 0;
  }
}
