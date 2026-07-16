import * as THREE from 'three';
import type { ParticleSystem } from './ParticleSystem';
import { smokeTexture } from '../textures';
import { clamp } from '../engine/physics';

interface SmokePuff { s: THREE.Sprite; life: number; maxLife: number; grow: number; dark: boolean }

export class SmokeSystem implements ParticleSystem {
  private smoke: SmokePuff[] = [];
  private cap = 42;
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  spawn(p: THREE.Vector3, n: number, size = 1.2, dark = false) {
    for (let i = 0; i < n; i++) {
      const mat = new THREE.SpriteMaterial({
        map: smokeTexture(), transparent: true, depthWrite: false,
        color: dark ? 0x2a2a2e : 0x565d68, opacity: 0.55,
      });
      const s = new THREE.Sprite(mat);
      s.position.set(
        p.x + (Math.random() - 0.5) * 1.2,
        p.y + Math.random() * 0.8,
        p.z + (Math.random() - 0.5) * 1.2,
      );
      s.scale.setScalar(size);
      (mat as THREE.SpriteMaterial).rotation = Math.random() * Math.PI * 2;
      this.scene.add(s);
      this.smoke.push({ s, life: 1, maxLife: 0.9 + Math.random() * 1.1, grow: 1.8 + Math.random() * 2, dark });
    }
    while (this.smoke.length > this.cap) {
      const old = this.smoke.shift()!;
      this.scene.remove(old.s);
      old.s.material.dispose();
    }
  }

  update(_dt: number) {
    for (let i = this.smoke.length - 1; i >= 0; i--) {
      const p = this.smoke[i];
      p.life -= _dt / p.maxLife;
      if (p.life <= 0) {
        this.scene.remove(p.s);
        p.s.material.dispose();
        this.smoke.splice(i, 1);
        continue;
      }
      const m = p.s.material as THREE.SpriteMaterial;
      m.opacity = 0.5 * clamp(p.life, 0, 1);
      m.rotation += _dt * 0.6;
      p.s.position.y += _dt * 1.6;
      p.s.scale.setScalar(p.s.scale.x + p.grow * _dt);
    }
  }

  dispose() {
    for (const p of this.smoke) {
      this.scene.remove(p.s);
      p.s.material.dispose();
    }
    this.smoke.length = 0;
  }
}
