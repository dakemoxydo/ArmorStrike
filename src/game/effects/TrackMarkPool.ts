// ===== Пул следов гусениц: InstancedMesh для отпечатков траков на грунте =====
// 1 Draw Call на всю арену для всех 10 танков. Кольцевой буфер (500 элементов),
// плавная альфа-затухание со временем, zero allocations в кадре.
import * as THREE from 'three';
import type { ParticleSystem } from './ParticleSystem';
import { trackMarkTexture } from '../textures';

const tmpMatrix = new THREE.Matrix4();
const tmpPos = new THREE.Vector3();
const tmpQuat = new THREE.Quaternion();
const tmpScale = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

interface TrackMark {
  active: boolean;
  life: number;
  maxLife: number;
  intensity: number;
}

export class TrackMarkPool implements ParticleSystem {
  private mesh: THREE.InstancedMesh;
  private mat: THREE.MeshBasicMaterial;
  private marks: TrackMark[] = [];
  private readonly cap = 500;
  private cursor = 0;
  private alphaAttr: THREE.InstancedBufferAttribute;
  private alphas: Float32Array;

  constructor(private scene: THREE.Scene) {
    const geo = new THREE.PlaneGeometry(1, 1);
    // Ориентация параллельно грунту (нормаль вверх по +Y)
    geo.rotateX(-Math.PI / 2);

    this.alphas = new Float32Array(this.cap).fill(0);
    this.alphaAttr = new THREE.InstancedBufferAttribute(this.alphas, 1);
    this.alphaAttr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('instanceAlpha', this.alphaAttr);

    const map = trackMarkTexture();
    this.mat = new THREE.MeshBasicMaterial({
      map,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    });

    this.mat.onBeforeCompile = (shader) => {
      shader.vertexShader = `
        attribute float instanceAlpha;
        varying float vInstanceAlpha;
        ${shader.vertexShader}
      `.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         vInstanceAlpha = instanceAlpha;`,
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
      this.marks.push({ active: false, life: 0, maxLife: 11, intensity: 0 });
      tmpMatrix.makeScale(0, 0, 0);
      this.mesh.setMatrixAt(i, tmpMatrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    scene.add(this.mesh);
  }

  /**
   * Размещение отпечатка гусеницы на земле.
   * @param p Точка контакта трака с поверхностью (X, Z)
   * @param yaw Курс танка/трака в радианах
   * @param width Ширина ленты гусеницы (м)
   * @param length Длина сегмента отпечатка (м)
   * @param intensity Базовая непрозрачность (0.5..1.0)
   */
  spawn(p: THREE.Vector3, yaw: number, width = 0.68, length = 0.85, intensity = 0.7): void {
    const idx = this.cursor;
    this.cursor = (this.cursor + 1) % this.cap;

    const m = this.marks[idx];
    m.active = true;
    m.life = 1.0;
    m.maxLife = 11.0; // ~11 секунд до полного исчезновения следа
    m.intensity = intensity;

    // Y чуть выше 0 (0.025 м), чтобы не мерцать с полом арены (Z-fighting)
    tmpPos.set(p.x, 0.025, p.z);
    tmpQuat.setFromAxisAngle(UP, yaw);
    tmpScale.set(width, 1, length);
    tmpMatrix.compose(tmpPos, tmpQuat, tmpScale);

    this.mesh.setMatrixAt(idx, tmpMatrix);
    this.mesh.instanceMatrix.needsUpdate = true;

    this.alphas[idx] = intensity;
    this.alphaAttr.needsUpdate = true;
  }

  update(dt: number): void {
    let matrixNeedsUpdate = false;
    let alphaNeedsUpdate = false;

    for (let i = 0; i < this.cap; i++) {
      const m = this.marks[i];
      if (!m.active) continue;

      m.life -= dt / m.maxLife;
      if (m.life <= 0) {
        m.active = false;
        tmpMatrix.makeScale(0, 0, 0);
        this.mesh.setMatrixAt(i, tmpMatrix);
        this.alphas[i] = 0;
        matrixNeedsUpdate = true;
        alphaNeedsUpdate = true;
        continue;
      }

      // Плавное угасание в последние 35% времени жизни
      const fade = m.life < 0.35 ? m.life / 0.35 : 1.0;
      const targetAlpha = m.intensity * fade;
      if (Math.abs(this.alphas[i] - targetAlpha) > 0.01) {
        this.alphas[i] = targetAlpha;
        alphaNeedsUpdate = true;
      }
    }

    if (matrixNeedsUpdate) this.mesh.instanceMatrix.needsUpdate = true;
    if (alphaNeedsUpdate) this.alphaAttr.needsUpdate = true;
  }

  clear(): void {
    for (let i = 0; i < this.cap; i++) {
      this.marks[i].active = false;
      this.marks[i].life = 0;
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
