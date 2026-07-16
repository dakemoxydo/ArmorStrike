// ===== Пул частиц пламени огнемёта (визуальный FX) =====
// Выделен из FlamethrowerWeapon: владеет InstancedMesh, PointLight и жизненным
// циклом частиц. Чисто визуально — уроном не занимается.
import * as THREE from 'three';
import { WEAPON_TUNING } from '../../core/catalog';

interface FlameParticle {
  active: boolean;
  life: number;
  maxLife: number;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  scale: number;
  maxScale: number;
}

const tmpMatrix = new THREE.Matrix4();
const tmpScaleVec = new THREE.Vector3();
const tmpColor = new THREE.Color();
const localDir = new THREE.Vector3();

export class FlameParticlePool {
  private instancedMesh: THREE.InstancedMesh;
  private particleMat: THREE.MeshBasicMaterial;
  private particles: FlameParticle[] = [];
  private muzzleLight: THREE.PointLight;
  private spawnAcc = 0;

  constructor(private scene: THREE.Scene, count: number) {
    const particleGeo = new THREE.IcosahedronGeometry(0.35, 1);
    const particleMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.instancedMesh = new THREE.InstancedMesh(particleGeo, particleMat, count);
    this.particleMat = particleMat;
    this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    // ВАЖНО: Отключаем Frustum Culling для динамического InstancedMesh!
    // Без этого Three.js отсекает меш по начальному BoundingSphere (у 0,0,0),
    // из-за чего пламя исчезало при повороте камеры от центра мира.
    this.instancedMesh.frustumCulled = false;

    // Цвет каждого инстанса
    const colors = new Float32Array(count * 3);
    this.instancedMesh.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
    this.instancedMesh.instanceColor.setUsage(THREE.DynamicDrawUsage);

    this.scene.add(this.instancedMesh);

    // Инициализация пула частиц
    for (let i = 0; i < count; i++) {
      this.particles.push({
        active: false,
        life: 0,
        maxLife: 0.8,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        scale: 0.1,
        maxScale: 2.2,
      });
      // Прячем неактивные инстансы
      tmpMatrix.makeScale(0, 0, 0);
      this.instancedMesh.setMatrixAt(i, tmpMatrix);
    }
    this.instancedMesh.instanceMatrix.needsUpdate = true;

    // Одиночный мерцающий источник света на срезе ствола
    this.muzzleLight = new THREE.PointLight(0xff6600, 0, 22);
    this.scene.add(this.muzzleLight);
  }

  /** Спавн/обновление частиц + мерцание дульного света. */
  update(
    dt: number,
    muzzleQuat: THREE.Quaternion,
    firing: boolean,
    muzzle: THREE.Vector3,
  ) {
    // --- Спавн новых частиц из пула пока кнопка зажата ---
    if (firing) {
      this.spawnAcc += dt * WEAPON_TUNING.flamethrower.spawnRate;
      const toSpawn = Math.floor(this.spawnAcc);
      if (toSpawn > 0) {
        this.spawnAcc -= toSpawn;
        for (let k = 0; k < toSpawn; k++) {
          this.spawnParticle(muzzleQuat, muzzle);
        }
      }

      // Мерцание дульного PointLight
      this.muzzleLight.position.copy(muzzle);
      this.muzzleLight.intensity = 25 + Math.random() * 20;
    } else {
      this.muzzleLight.intensity = Math.max(0, this.muzzleLight.intensity - dt * 100);
    }

    // --- Обновление жизненного цикла и матриц InstancedMesh ---
    let anyActive = false;
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.active) continue;

      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        tmpMatrix.makeScale(0, 0, 0);
        this.instancedMesh.setMatrixAt(i, tmpMatrix);
        continue;
      }

      anyActive = true;
      const progress = p.life / p.maxLife;

      // Движение частицы с плавной амортизацией скорости
      p.pos.addScaledVector(p.vel, dt * (1 - progress * 0.45));

      // Изменение размера: быстрый рост, затем плавное увядание
      const scaleK = progress < 0.22 ? progress / 0.22 : 1 - (progress - 0.22) / 0.78;
      const currentScale = p.maxScale * Math.max(0.05, scaleK);

      // Градиент цвета пламени по времени жизни
      if (progress < 0.2) {
        tmpColor.setHSL(0.14, 1.0, 0.88); // ярко-бело-жёлтый
      } else if (progress < 0.5) {
        tmpColor.setHSL(0.08, 1.0, 0.55); // сочно-оранжевый
      } else if (progress < 0.78) {
        tmpColor.setHSL(0.02, 0.95, 0.42); // тёмно-красный
      } else {
        tmpColor.setHSL(0.0, 0.1, 0.18); // серый дым
      }

      // Запись трансформы частицы
      tmpScaleVec.set(currentScale, currentScale, currentScale);
      tmpMatrix.compose(p.pos, muzzleQuat, tmpScaleVec);

      this.instancedMesh.setMatrixAt(i, tmpMatrix);
      this.instancedMesh.setColorAt(i, tmpColor);
    }

    if (anyActive || firing) {
      this.instancedMesh.instanceMatrix.needsUpdate = true;
      if (this.instancedMesh.instanceColor) {
        this.instancedMesh.instanceColor.needsUpdate = true;
      }
    }
  }

  /** Спавн одной частицы пламени из пула с правильным конусом разброса */
  private spawnParticle(muzzleQuat: THREE.Quaternion, muzzle: THREE.Vector3) {
    let p = this.particles.find((x) => !x.active);
    if (!p) {
      p = this.particles[0]; // переиспользование
    }

    p.active = true;
    p.life = 0;
    p.maxLife = 0.55 + Math.random() * 0.35;
    p.pos.copy(muzzle);

    // Разброс вектора скорости в ЛОКАЛЬНОЙ системе координат ствола
    const halfCone = WEAPON_TUNING.flamethrower.coneAngle * 0.5;
    const tanHalf = Math.tan(halfCone);
    const spreadX = (Math.random() - 0.5) * 2 * tanHalf;
    const spreadY = (Math.random() - 0.5) * tanHalf;

    localDir.set(spreadX, spreadY, 1.0).normalize();
    // Поворачиваем локальный вектор разброса мировой ориентацией дула
    localDir.applyQuaternion(muzzleQuat);

    const speed = 26 + Math.random() * 8;
    p.vel.copy(localDir).multiplyScalar(speed);
    p.maxScale = 1.5 + Math.random() * 1.3;
  }

  dispose() {
    this.scene.remove(this.instancedMesh);
    this.scene.remove(this.muzzleLight);
    this.instancedMesh.geometry.dispose();
    this.instancedMesh.dispose();
    this.particleMat.dispose();
  }
}
