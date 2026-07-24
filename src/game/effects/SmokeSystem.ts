import * as THREE from 'three';
import type { ParticleSystem } from './ParticleSystem';
import { smokeTexture } from '../textures';
import { clamp } from '../engine/physics';

interface SmokePuff {
  s: THREE.Sprite;
  mat: THREE.SpriteMaterial;
  life: number;
  maxLife: number;
  grow: number;
  active: boolean;
}

/**
 * Fixed-size smoke sprite pool. Spawning reuses slots (hide/reactivate) instead of
 * new SpriteMaterial + smokeTexture() + dispose each puff.
 */
export class SmokeSystem implements ParticleSystem {
  private readonly pool: SmokePuff[] = [];
  private readonly cap = 42;
  private readonly scene: THREE.Scene;
  private readonly map: THREE.Texture;
  /** Round-robin cursor for O(1) slot acquisition (replaces Array.find). */
  private cursor = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.map = smokeTexture();
    for (let i = 0; i < this.cap; i++) {
      const mat = new THREE.SpriteMaterial({
        map: this.map,
        transparent: true,
        depthWrite: false,
        color: 0x565d68,
        opacity: 0,
      });
      const s = new THREE.Sprite(mat);
      s.visible = false;
      scene.add(s);
      this.pool.push({ s, mat, life: 0, maxLife: 1, grow: 0, active: false });
    }
  }

  private acquire(): SmokePuff {
    // Round-robin: try from cursor forward, wrap around.
    for (let i = 0; i < this.cap; i++) {
      const idx = (this.cursor + i) % this.cap;
      if (!this.pool[idx].active) {
        this.cursor = (idx + 1) % this.cap;
        return this.pool[idx];
      }
    }
    // All active — steal oldest (lowest remaining life).
    let oldest = this.pool[0];
    let oldestFrac = oldest.life;
    for (let i = 1; i < this.pool.length; i++) {
      const p = this.pool[i];
      if (p.life < oldestFrac) {
        oldest = p;
        oldestFrac = p.life;
      }
    }
    return oldest;
  }

  spawn(p: THREE.Vector3, n: number, size = 1.2, dark = false) {
    const color = dark ? 0x2a2a2e : 0x565d68;
    for (let i = 0; i < n; i++) {
      const slot = this.acquire();
      slot.active = true;
      slot.life = 1;
      slot.maxLife = 0.9 + Math.random() * 1.1;
      slot.grow = 1.8 + Math.random() * 2;
      slot.mat.color.setHex(color);
      slot.mat.opacity = 0.55;
      slot.mat.rotation = Math.random() * Math.PI * 2;
      slot.s.position.set(
        p.x + (Math.random() - 0.5) * 1.2,
        p.y + Math.random() * 0.8,
        p.z + (Math.random() - 0.5) * 1.2,
      );
      slot.s.scale.setScalar(size);
      slot.s.visible = true;
    }
  }

  update(_dt: number) {
    for (const p of this.pool) {
      if (!p.active) continue;
      p.life -= _dt / p.maxLife;
      if (p.life <= 0) {
        p.active = false;
        p.s.visible = false;
        p.mat.opacity = 0;
        continue;
      }
      p.mat.opacity = 0.5 * clamp(p.life, 0, 1);
      p.mat.rotation += _dt * 0.6;
      p.s.position.y += _dt * 1.6;
      p.s.scale.setScalar(p.s.scale.x + p.grow * _dt);
    }
  }

  dispose() {
    for (const p of this.pool) {
      this.scene.remove(p.s);
      p.mat.dispose();
      p.active = false;
    }
    this.pool.length = 0;
  }
}
