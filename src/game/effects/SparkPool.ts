import * as THREE from 'three';
import { glowTexture } from '../textures';
import { clamp } from '../engine/physics';

const SPARK_COUNT = 800;

export class SparkPool {
  points: THREE.Points;
  private pos: Float32Array;
  private col: Float32Array;
  private baseCol: Float32Array;
  private vel: Float32Array;
  private life: Float32Array;
  private maxLife: Float32Array;
  private grav: Float32Array;
  private cursor = 0;
  /** Skip GPU buffer upload when no sparks are live. */
  private anyActive = false;

  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    const geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(SPARK_COUNT * 3).fill(-999);
    this.col = new Float32Array(SPARK_COUNT * 3);
    this.baseCol = new Float32Array(SPARK_COUNT * 3);
    this.vel = new Float32Array(SPARK_COUNT * 3);
    this.life = new Float32Array(SPARK_COUNT);
    this.maxLife = new Float32Array(SPARK_COUNT);
    this.grav = new Float32Array(SPARK_COUNT);
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.4,
      map: glowTexture(),
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }

  burst(
    p: THREE.Vector3, color: THREE.Color, n: number,
    opts: { speed?: number; up?: number; spread?: number; life?: number; gravity?: number; drag?: number } = {},
  ) {
    const speed = opts.speed ?? 9;
    const up = opts.up ?? 4;
    const life = opts.life ?? 0.7;
    const gravity = opts.gravity ?? 12;
    for (let i = 0; i < n; i++) {
      const idx = this.cursor;
      this.cursor = (this.cursor + 1) % SPARK_COUNT;
      this.pos[idx * 3] = p.x;
      this.pos[idx * 3 + 1] = p.y;
      this.pos[idx * 3 + 2] = p.z;
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.3 + Math.random() * 0.9);
      this.vel[idx * 3] = Math.cos(a) * s;
      this.vel[idx * 3 + 1] = (Math.random() - 0.2) * up;
      this.vel[idx * 3 + 2] = Math.sin(a) * s;
      this.life[idx] = this.maxLife[idx] = life * (0.5 + Math.random() * 0.8);
      this.grav[idx] = gravity;
      this.baseCol[idx * 3] = color.r;
      this.baseCol[idx * 3 + 1] = color.g;
      this.baseCol[idx * 3 + 2] = color.b;
      this.anyActive = true;
    }
  }

  jet(p: THREE.Vector3, dir: THREE.Vector3, color: THREE.Color, n: number, speed: number) {
    for (let i = 0; i < n; i++) {
      const idx = this.cursor;
      this.cursor = (this.cursor + 1) % SPARK_COUNT;
      this.pos[idx * 3] = p.x;
      this.pos[idx * 3 + 1] = p.y;
      this.pos[idx * 3 + 2] = p.z;
      const spread = 0.4;
      const s = speed * (0.7 + Math.random() * 0.6);
      this.vel[idx * 3] = dir.x * s + (Math.random() - 0.5) * speed * spread;
      this.vel[idx * 3 + 1] = Math.random() * 1.4;
      this.vel[idx * 3 + 2] = dir.z * s + (Math.random() - 0.5) * speed * spread;
      this.life[idx] = this.maxLife[idx] = 0.3 * (0.6 + Math.random() * 0.6);
      this.grav[idx] = -3;
      this.baseCol[idx * 3] = color.r;
      this.baseCol[idx * 3 + 1] = color.g;
      this.baseCol[idx * 3 + 2] = color.b;
      this.anyActive = true;
    }
  }

  update(dt: number) {
    if (!this.anyActive) return;
    let alive = false;
    for (let i = 0; i < SPARK_COUNT; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        this.pos[i * 3 + 1] = -999;
        this.col[i * 3] = this.col[i * 3 + 1] = this.col[i * 3 + 2] = 0;
        continue;
      }
      alive = true;
      this.vel[i * 3 + 1] -= this.grav[i] * dt;
      const drag = Math.exp(-2.2 * dt);
      this.vel[i * 3] *= drag;
      this.vel[i * 3 + 1] *= drag;
      this.vel[i * 3 + 2] *= drag;
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      if (this.pos[i * 3 + 1] < 0.05) {
        this.pos[i * 3 + 1] = 0.05;
        this.vel[i * 3 + 1] *= -0.4;
      }
      const f = clamp(this.life[i] / this.maxLife[i], 0, 1);
      this.col[i * 3] = this.baseCol[i * 3] * f;
      this.col[i * 3 + 1] = this.baseCol[i * 3 + 1] * f;
      this.col[i * 3 + 2] = this.baseCol[i * 3 + 2] * f;
    }
    this.anyActive = alive;
    (this.points.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    (this.points.geometry.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true;
  }

  dispose() {
    this.scene.remove(this.points);
    this.points.geometry.dispose();
    (this.points.material as THREE.Material).dispose();
  }
}
