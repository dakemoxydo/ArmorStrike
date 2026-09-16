// ===== Пул дорожной пыли: InstancedMesh для шлейфов из-под гусениц =====
// 1 Draw Call на всю арену. 120 частиц, billboarding на уровне вершинного шейдера,
// экспоненциальное расширение облака, затухание альфы и трение о воздух.
import * as THREE from 'three';
import type { ParticleSystem } from './ParticleSystem';
import { smokeTexture } from '../textures';
import { clamp } from '../engine/physics';

const tmpMatrix = new THREE.Matrix4();
const tmpScale = new THREE.Vector3();

interface DustParticle {
  active: boolean;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  scale: number;
  maxScale: number;
  life: number;
  maxLife: number;
  baseAlpha: number;
}

export class DriveDustPool implements ParticleSystem {
  private mesh: THREE.InstancedMesh;
  private mat: THREE.MeshBasicMaterial;
  private particles: DustParticle[] = [];
  private readonly cap = 120;
  private cursor = 0;
  private alphaAttr: THREE.InstancedBufferAttribute;
  private alphas: Float32Array;

  constructor(private scene: THREE.Scene) {
    const geo = new THREE.PlaneGeometry(1, 1);

    this.alphas = new Float32Array(this.cap).fill(0);
    this.alphaAttr = new THREE.InstancedBufferAttribute(this.alphas, 1);
    this.alphaAttr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('instanceAlpha', this.alphaAttr);

    const map = smokeTexture();
    this.mat = new THREE.MeshBasicMaterial({
      map,
      transparent: true,
      depthWrite: false,
      color: 0x928575, // Тёплый землисто-песчаный оттенок дорожной пыли
      toneMapped: false,
    });

    this.mat.onBeforeCompile = (shader) => {
      shader.vertexShader = `
        attribute float instanceAlpha;
        varying float vInstanceAlpha;
        ${shader.vertexShader}
      `
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
           vInstanceAlpha = instanceAlpha;`,
        )
        .replace(
          '#include <project_vertex>',
          `#ifdef USE_INSTANCING
             vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );
             float instScale = length( vec3( instanceMatrix[0][0], instanceMatrix[0][1], instanceMatrix[0][2] ) );
             mvPosition.xy += position.xy * instScale;
             gl_Position = projectionMatrix * mvPosition;
           #else
             vec4 mvPosition = modelViewMatrix * vec4( transformed, 1.0 );
             gl_Position = projectionMatrix * mvPosition;
           #endif`,
        );

      shader.fragmentShader = `
        varying float vInstanceAlpha;
        ${shader.fragmentShader}
      `.replace(
        '#include <dithering_fragment>',
        `#include <dithering_fragment>
         gl_FragColor.a *= vInstanceAlpha;`,
      );
    };

    this.mesh = new THREE.InstancedMesh(geo, this.mat, this.cap);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;

    for (let i = 0; i < this.cap; i++) {
      this.particles.push({
        active: false,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        scale: 0.5,
        maxScale: 1.6,
        life: 0,
        maxLife: 0.9,
        baseAlpha: 0.45,
      });
      tmpMatrix.makeScale(0, 0, 0);
      this.mesh.setMatrixAt(i, tmpMatrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    scene.add(this.mesh);
  }

  /**
   * Спавн клубка дорожной пыли.
   * @param p Начальная позиция (обычно за катком/гусеницей у грунта)
   * @param vel Начальная скорость частицы (выброс назад + подъем)
   * @param scale Начальный радиус клубка (м)
   * @param maxScale Финальный радиус перед рассеиванием (м)
   * @param life Время жизни (с)
   * @param alpha Начальная непрозрачность (0.2..0.6)
   */
  spawn(
    p: THREE.Vector3,
    vel: THREE.Vector3,
    scale = 0.5,
    maxScale = 1.7,
    life = 0.85,
    alpha = 0.42,
  ): void {
    const idx = this.cursor;
    this.cursor = (this.cursor + 1) % this.cap;

    const pt = this.particles[idx];
    pt.active = true;
    pt.pos.copy(p);
    pt.vel.copy(vel);
    pt.scale = scale;
    pt.maxScale = maxScale;
    pt.life = 1.0;
    pt.maxLife = life;
    pt.baseAlpha = alpha;

    tmpMatrix.makeTranslation(p.x, p.y, p.z);
    tmpScale.set(scale, scale, scale);
    tmpMatrix.scale(tmpScale);

    this.mesh.setMatrixAt(idx, tmpMatrix);
    this.mesh.instanceMatrix.needsUpdate = true;

    this.alphas[idx] = alpha;
    this.alphaAttr.needsUpdate = true;
  }

  update(dt: number): void {
    let matrixNeedsUpdate = false;
    let alphaNeedsUpdate = false;

    for (let i = 0; i < this.cap; i++) {
      const pt = this.particles[i];
      if (!pt.active) continue;

      pt.life -= dt / pt.maxLife;
      if (pt.life <= 0) {
        pt.active = false;
        tmpMatrix.makeScale(0, 0, 0);
        this.mesh.setMatrixAt(i, tmpMatrix);
        this.alphas[i] = 0;
        matrixNeedsUpdate = true;
        alphaNeedsUpdate = true;
        continue;
      }

      // Сопротивление воздуха гасит горизонтальный разлёт пыли
      const drag = Math.exp(-2.2 * dt);
      pt.vel.x *= drag;
      pt.vel.z *= drag;
      // Вертикальный подъём постепенно замедляется
      pt.vel.y = Math.max(0.08, pt.vel.y - 1.2 * dt);
      pt.pos.addScaledVector(pt.vel, dt);

      // Облако расширяется по мере подъёма
      const progress = 1 - pt.life;
      const currentScale = pt.scale + (pt.maxScale - pt.scale) * progress;

      // Затухание альфы в последней половине жизни
      const fade = clamp(pt.life / 0.45, 0, 1);
      const curAlpha = pt.baseAlpha * fade;

      tmpMatrix.makeTranslation(pt.pos.x, pt.pos.y, pt.pos.z);
      tmpScale.set(currentScale, currentScale, currentScale);
      tmpMatrix.scale(tmpScale);

      this.mesh.setMatrixAt(i, tmpMatrix);
      this.alphas[i] = curAlpha;

      matrixNeedsUpdate = true;
      alphaNeedsUpdate = true;
    }

    if (matrixNeedsUpdate) this.mesh.instanceMatrix.needsUpdate = true;
    if (alphaNeedsUpdate) this.alphaAttr.needsUpdate = true;
  }

  clear(): void {
    for (let i = 0; i < this.cap; i++) {
      this.particles[i].active = false;
      this.particles[i].life = 0;
      this.alphas[i] = 0;
      tmpMatrix.makeScale(0, 0, 0);
      this.mesh.setMatrixAt(i, tmpMatrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    this.alphaAttr.needsUpdate = true;
  }

  dispose(): void {
    this.clear();
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mesh.dispose();
    this.mat.dispose();
  }
}
