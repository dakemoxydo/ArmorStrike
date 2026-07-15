// ===== Эффекты: искры, дым, вспышки, взрывы, тряска камеры =====
import * as THREE from 'three';
import { glowTexture, scorchTexture, smokeTexture } from './textures';
import { clamp } from './physics';

const SPARK_COUNT = 800;

class SparkPool {
  points: THREE.Points;
  private pos: Float32Array;
  private col: Float32Array;
  private baseCol: Float32Array;
  private vel: Float32Array;
  private life: Float32Array;
  private maxLife: Float32Array;
  private grav: Float32Array;
  private cursor = 0;

  constructor(scene: THREE.Scene) {
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
      this.grav[idx] = -3; // отрицательная гравитация — пламя приподнимается
      this.baseCol[idx * 3] = color.r;
      this.baseCol[idx * 3 + 1] = color.g;
      this.baseCol[idx * 3 + 2] = color.b;
    }
  }

  update(dt: number) {
    for (let i = 0; i < SPARK_COUNT; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        this.pos[i * 3 + 1] = -999;
        this.col[i * 3] = this.col[i * 3 + 1] = this.col[i * 3 + 2] = 0;
        continue;
      }
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
    (this.points.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    (this.points.geometry.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true;
  }
}

interface SmokePuff { s: THREE.Sprite; life: number; maxLife: number; grow: number; dark: boolean }
interface FlashLight { light: THREE.PointLight; t: number; dur: number; peak: number }
interface RingAnim { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; t: number; dur: number; maxR: number }
interface CoreAnim { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; t: number; dur: number; maxS: number }
interface ScorchMark { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; t: number }

export class Effects {
  trauma = 0;
  private sparks: SparkPool;
  private smoke: SmokePuff[] = [];
  private flashes: FlashLight[] = [];
  private rings: RingAnim[] = [];
  private cores: CoreAnim[] = [];
  private scorch: ScorchMark[] = [];
  private muzzleSprites: THREE.Sprite[] = [];

  // Амбиентная пыль (motes) — промышленная атмосфера вокруг игрока
  private ambient!: THREE.Points;
  private ambPos!: Float32Array;
  private ambVel!: Float32Array;
  private ambCenter = new THREE.Vector3();
  private readonly ambCount = 140;
  private readonly ambRange = 95;
  private sphereGeo = new THREE.SphereGeometry(1, 20, 14);
  private ringGeo = new THREE.RingGeometry(0.55, 1, 40);
  private circleGeo = new THREE.CircleGeometry(1, 28);
  private tmpCol = new THREE.Color();

  constructor(private scene: THREE.Scene) {
    this.sparks = new SparkPool(scene);
    const gtex = glowTexture();
    for (let i = 0; i < 6; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({
        map: gtex, transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending, opacity: 0,
      }));
      sp.visible = false;
      scene.add(sp);
      this.muzzleSprites.push(sp);
    }

    // Амбиентные пылинки, дрейфующие в объёме вокруг игрока
    this.ambPos = new Float32Array(this.ambCount * 3);
    this.ambVel = new Float32Array(this.ambCount * 3);
    for (let i = 0; i < this.ambCount; i++) {
      this.ambPos[i * 3] = (Math.random() * 2 - 1) * this.ambRange;
      this.ambPos[i * 3 + 1] = 1 + Math.random() * 26;
      this.ambPos[i * 3 + 2] = (Math.random() * 2 - 1) * this.ambRange;
      this.ambVel[i * 3] = (Math.random() - 0.5) * 0.5;
      this.ambVel[i * 3 + 1] = -0.1 - Math.random() * 0.25;
      this.ambVel[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
    }
    const ambGeo = new THREE.BufferGeometry();
    ambGeo.setAttribute('position', new THREE.BufferAttribute(this.ambPos, 3));
    const ambMat = new THREE.PointsMaterial({
      size: 0.55, map: gtex, color: 0xcdb09a,
      transparent: true, opacity: 0.22, depthWrite: false,
      blending: THREE.AdditiveBlending, sizeAttenuation: true,
    });
    this.ambient = new THREE.Points(ambGeo, ambMat);
    this.ambient.frustumCulled = false;
    scene.add(this.ambient);
  }

  /** Центр амбиентной пыли — обычно позиция игрока. */
  setAmbientCenter(x: number, z: number) {
    this.ambCenter.set(x, 0, z);
  }

  private getFlashLight(): FlashLight {
    const free = this.flashes.find((f) => f.t >= f.dur);
    if (free) return free;
    const light = new THREE.PointLight(0xffffff, 0, 26, 1.8);
    this.scene.add(light);
    const fl: FlashLight = { light, t: 1, dur: 1, peak: 0 };
    this.flashes.push(fl);
    return fl;
  }

  private flashLight(p: THREE.Vector3, color: number, intensity: number, dur: number) {
    const f = this.getFlashLight();
    f.light.position.copy(p);
    f.light.color.setHex(color);
    f.t = 0;
    f.dur = dur;
    f.peak = intensity;
    f.light.intensity = intensity;
  }

  muzzle(p: THREE.Vector3, color: number) {
    const sp = this.muzzleSprites.find((s) => !s.visible) ?? this.muzzleSprites[0];
    sp.position.copy(p);
    sp.material.color.setHex(color);
    sp.material.opacity = 0.95;
    sp.scale.setScalar(2.6 + Math.random() * 1.4);
    sp.visible = true;
    (sp.material as THREE.SpriteMaterial).rotation = Math.random() * Math.PI;
    this.flashLight(p, color, 60, 0.09);
    this.sparks.burst(p, new THREE.Color(color), 6, { speed: 12, up: 1, life: 0.22, gravity: 2 });
    this.addShake(0.16);
  }

  impact(p: THREE.Vector3, color: number) {
    this.sparks.burst(p, new THREE.Color(color), 16, { speed: 10, up: 5, life: 0.5 });
    this.flashLight(p, color, 18, 0.12);
  }

  explosion(p: THREE.Vector3, color: number, scale = 1) {
    // световое ядро
    const mat = new THREE.MeshBasicMaterial({
      color: 0xfff2cc, transparent: true, opacity: 1,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const core = new THREE.Mesh(this.sphereGeo, mat);
    core.position.copy(p);
    this.scene.add(core);
    this.cores.push({ mesh: core, mat, t: 0, dur: 0.32, maxS: 2.6 * scale });

    // ударная волна по земле
    const rmat = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.85,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(this.ringGeo, rmat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(p.x, 0.12, p.z);
    this.scene.add(ring);
    this.rings.push({ mesh: ring, mat: rmat, t: 0, dur: 0.55, maxR: 9 * scale });

    this.sparks.burst(p, new THREE.Color(color), Math.round(40 * scale), {
      speed: 15 * scale, up: 9, life: 0.9, gravity: 16,
    });
    this.spawnSmoke(p, 7, 1.6 * scale, true);
    this.flashLight(p, color, 160 * scale, 0.35);
    this.addScorch(p, 2.4 * scale);
    this.addShake(0.5 * scale);
  }

  spawnSmoke(p: THREE.Vector3, n: number, size = 1.2, dark = false) {
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
    while (this.smoke.length > 42) {
      const old = this.smoke.shift()!;
      this.scene.remove(old.s);
      old.s.material.dispose();
    }
  }

  trailPuff(p: THREE.Vector3, color: THREE.Color) {
    this.sparks.burst(p, color, 1, { speed: 0.3, up: 0.1, life: 0.16, gravity: 0 });
  }

  /** Реактивная струя нитро из кормы танка. dir — направление выхлопа (назад). */
  boostJet(p: THREE.Vector3, dir: THREE.Vector3, color: number) {
    this.sparks.jet(p, dir, this.tmpCol.setHex(color), 2, 13);
  }

  /** Дым из повреждённого танка (тёмный, у верхушки башни). */
  tankSmoke(p: THREE.Vector3) {
    this.spawnSmoke(p, 1, 1.0, true);
  }

  /** Пыль, поднимаемая гусеницами при движении. */
  tankDust(p: THREE.Vector3) {
    this.spawnSmoke(p, 1, 0.7, false);
  }

  debris(p: THREE.Vector3, color: number, n = 14) {
    this.sparks.burst(p, new THREE.Color(color), n, { speed: 13, up: 10, life: 1.1, gravity: 26 });
    this.spawnSmoke(p, 5, 1.4, true);
  }

  private addScorch(p: THREE.Vector3, size: number) {
    const mat = new THREE.MeshBasicMaterial({
      map: scorchTexture(), transparent: true, opacity: 0.9, depthWrite: false,
    });
    const m = new THREE.Mesh(this.circleGeo, mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(p.x, 0.06 + this.scorch.length * 0.001, p.z);
    m.scale.setScalar(size);
    this.scene.add(m);
    this.scorch.push({ mesh: m, mat, t: 0 });
    if (this.scorch.length > 10) {
      const old = this.scorch.shift()!;
      this.scene.remove(old.mesh);
      old.mat.dispose();
    }
  }

  addShake(amount: number) {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  getShake(out: THREE.Vector3, elapsed: number): number {
    const t2 = this.trauma * this.trauma;
    const f = 26;
    out.set(
      (Math.sin(elapsed * f * 1.3) + Math.sin(elapsed * f * 2.9) * 0.5) * t2 * 0.5,
      (Math.sin(elapsed * f * 1.7 + 4) + Math.sin(elapsed * f * 3.3) * 0.5) * t2 * 0.35,
      (Math.sin(elapsed * f * 1.1 + 8) + Math.sin(elapsed * f * 2.3) * 0.5) * t2 * 0.5,
    );
    return Math.sin(elapsed * f * 1.9 + 2) * t2 * 0.02; // крен камеры
  }

  update(dt: number) {
    this.trauma = Math.max(0, this.trauma - dt * 1.6);
    this.sparks.update(dt);

    // Амбиентная пыль: дрейф + обёртка вокруг центра
    if (this.ambient.visible) {
      const cx = this.ambCenter.x, cz = this.ambCenter.z, R = this.ambRange;
      for (let i = 0; i < this.ambCount; i++) {
        const ix = i * 3, iy = ix + 1, iz = ix + 2;
        this.ambPos[ix] += this.ambVel[ix] * dt;
        this.ambPos[iy] += this.ambVel[iy] * dt;
        this.ambPos[iz] += this.ambVel[iz] * dt;
        if (this.ambPos[iy] < 0.6) { this.ambPos[iy] = 27; }
        if (this.ambPos[ix] - cx > R) this.ambPos[ix] = cx - R;
        else if (this.ambPos[ix] - cx < -R) this.ambPos[ix] = cx + R;
        if (this.ambPos[iz] - cz > R) this.ambPos[iz] = cz - R;
        else if (this.ambPos[iz] - cz < -R) this.ambPos[iz] = cz + R;
      }
      (this.ambient.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    }

    for (let i = this.smoke.length - 1; i >= 0; i--) {
      const p = this.smoke[i];
      p.life -= dt / p.maxLife;
      if (p.life <= 0) {
        this.scene.remove(p.s);
        p.s.material.dispose();
        this.smoke.splice(i, 1);
        continue;
      }
      const m = p.s.material as THREE.SpriteMaterial;
      m.opacity = 0.5 * clamp(p.life, 0, 1);
      m.rotation += dt * 0.6;
      p.s.position.y += dt * 1.6;
      p.s.scale.setScalar(p.s.scale.x + p.grow * dt);
    }

    for (const f of this.flashes) {
      if (f.t >= f.dur) continue;
      f.t += dt;
      const k = clamp(1 - f.t / f.dur, 0, 1);
      f.light.intensity = f.peak * k * k;
      if (f.t >= f.dur) f.light.intensity = 0;
    }

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

    for (let i = this.muzzleSprites.length - 1; i >= 0; i--) {
      const sp = this.muzzleSprites[i];
      if (!sp.visible) continue;
      sp.material.opacity -= dt * 10;
      sp.scale.multiplyScalar(1 + dt * 6);
      if (sp.material.opacity <= 0) {
        sp.visible = false;
        sp.material.opacity = 0;
      }
    }

    for (const sc of this.scorch) {
      sc.t += dt;
      if (sc.t > 6) sc.mat.opacity = Math.max(0, 0.9 - (sc.t - 6) * 0.15);
    }
  }
}
