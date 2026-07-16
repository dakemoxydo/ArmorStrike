// ===== FIREBIRD (Огнемёт) =====
// Оружие ближнего боя с геометрическим Overlap-check и InstancedMesh системой пламени
import * as THREE from 'three';
import { WEAPON_TUNING } from '../../core/catalog';
import type { TankEntity } from '../Tank';
import type { Weapon, WeaponContext, WeaponDeps } from './types';

interface FlameParticle {
  active: boolean;
  life: number;
  maxLife: number;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  scale: number;
  maxScale: number;
}

const tmpMuzzle = new THREE.Vector3();
const tmpMuzzleQuat = new THREE.Quaternion();
const tmpDir = new THREE.Vector3();
const tmpTargetVec = new THREE.Vector3();
const tmpMatrix = new THREE.Matrix4();
const tmpScaleVec = new THREE.Vector3();
const tmpColor = new THREE.Color();
const localDir = new THREE.Vector3();

export class FlamethrowerWeapon implements Weapon {
  readonly owner: TankEntity;
  energy = WEAPON_TUNING.flamethrower.energyMax;
  isFiring = false;

  private tickTimer = 0;
  private spawnAcc = 0;

  // InstancedMesh пул частиц пламени
  private instancedMesh: THREE.InstancedMesh;
  private particleMat: THREE.MeshBasicMaterial;
  private particles: FlameParticle[] = [];
  private muzzleLight: THREE.PointLight;

  private deps: WeaponDeps;

  constructor(owner: TankEntity, deps: WeaponDeps) {
    this.owner = owner;
    this.deps = deps;
    const count = WEAPON_TUNING.flamethrower.particleCount;

    // Геометрия частицы пламени
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

    this.deps.scene.add(this.instancedMesh);

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
    this.deps.scene.add(this.muzzleLight);
  }

  setFire(active: boolean) {
    if (active && !this.isFiring && this.energy > 5 && this.owner.alive) {
      this.isFiring = true;
      this.deps.audio.startFlameLoop();
    } else if (!active && this.isFiring) {
      this.isFiring = false;
      this.deps.audio.stopFlameLoop();
    }
  }

  get energyRatio(): number {
    return this.energy / WEAPON_TUNING.flamethrower.energyMax;
  }

  update(dt: number, ctx: WeaponContext) {
    // Точная позиция, кватернион и направление ствола в мировых координатах
    this.owner.muzzleWorld(tmpMuzzle);
    this.owner.visual.muzzle.getWorldQuaternion(tmpMuzzleQuat);
    tmpDir.set(0, 0, 1).applyQuaternion(tmpMuzzleQuat).normalize();

    // Расход / Восстановление энергии
    if (this.isFiring && this.owner.alive) {
      this.energy -= WEAPON_TUNING.flamethrower.consumptionRate * dt;
      if (this.energy <= 0) {
        this.energy = 0;
        this.isFiring = false;
        this.deps.audio.stopFlameLoop();
      }
    } else {
      this.energy = Math.min(
        WEAPON_TUNING.flamethrower.energyMax,
        this.energy + WEAPON_TUNING.flamethrower.rechargeRate * dt,
      );
    }

    // --- Overlap-check урона с throttling по tickRate ---
    if (this.isFiring) {
      this.tickTimer += dt;
      if (this.tickTimer >= WEAPON_TUNING.flamethrower.tickRate) {
        this.tickTimer -= WEAPON_TUNING.flamethrower.tickRate;
        this.processOverlapDamage(ctx.tanks);
      }

      // Мерцание дульного PointLight
      this.muzzleLight.position.copy(tmpMuzzle);
      this.muzzleLight.intensity = 25 + Math.random() * 20;
    } else {
      this.muzzleLight.intensity = Math.max(0, this.muzzleLight.intensity - dt * 100);
      this.tickTimer = 0;
    }

    // --- Спавн новых частиц из пула пока кнопка зажата ---
    if (this.isFiring) {
      this.spawnAcc += dt * WEAPON_TUNING.flamethrower.spawnRate;
      const toSpawn = Math.floor(this.spawnAcc);
      if (toSpawn > 0) {
        this.spawnAcc -= toSpawn;
        for (let k = 0; k < toSpawn; k++) {
          this.spawnParticle();
        }
      }
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
      tmpMatrix.compose(p.pos, tmpMuzzleQuat, tmpScaleVec);

      this.instancedMesh.setMatrixAt(i, tmpMatrix);
      this.instancedMesh.setColorAt(i, tmpColor);
    }

    if (anyActive || this.isFiring) {
      this.instancedMesh.instanceMatrix.needsUpdate = true;
      if (this.instancedMesh.instanceColor) {
        this.instancedMesh.instanceColor.needsUpdate = true;
      }
    }
  }

  /** Спавн одной частицы пламени из пула с правильным конусом разброса */
  private spawnParticle() {
    let p = this.particles.find((x) => !x.active);
    if (!p) {
      p = this.particles[0]; // переиспользование
    }

    p.active = true;
    p.life = 0;
    p.maxLife = 0.55 + Math.random() * 0.35;
    p.pos.copy(tmpMuzzle);

    // Разброс вектора скорости в ЛОКАЛЬНОЙ системе координат ствола
    const halfCone = WEAPON_TUNING.flamethrower.coneAngle * 0.5;
    const tanHalf = Math.tan(halfCone);
    const spreadX = (Math.random() - 0.5) * 2 * tanHalf;
    const spreadY = (Math.random() - 0.5) * tanHalf;

    localDir.set(spreadX, spreadY, 1.0).normalize();
    // Поворачиваем локальный вектор разброса мировой ориентацией дула
    localDir.applyQuaternion(tmpMuzzleQuat);

    const speed = 26 + Math.random() * 8;
    p.vel.copy(localDir).multiplyScalar(speed);
    p.maxScale = 1.5 + Math.random() * 1.3;
  }

  /** Геометрический Overlap-check поражения целей в конусе пламени */
  private processOverlapDamage(tanks: TankEntity[]) {
    const halfCone = WEAPON_TUNING.flamethrower.coneAngle * 0.5;

    for (const t of tanks) {
      if (t === this.owner || !t.alive) continue;

      tmpTargetVec.subVectors(t.position, tmpMuzzle);
      const dist = tmpTargetVec.length();

      if (dist <= WEAPON_TUNING.flamethrower.range) {
        tmpTargetVec.normalize();
        const angle = tmpDir.angleTo(tmpTargetVec);

        if (angle <= halfCone) {
          // Цель внутри конуса поражения!
          const dmg = WEAPON_TUNING.flamethrower.damagePerTick;
          this.deps.damageSystem.applyDamage(t, dmg, this.owner);
          this.deps.damageSystem.applyKnockback(t, tmpTargetVec, WEAPON_TUNING.flamethrower.knockback);

          // Дым и искры на обгорающем танке
          this.deps.effects.spawnSmoke(t.position, 1, 1.0, false);
        }
      }
    }
  }

  getAmmoState() {
    return {
      ammo: Math.round(this.energy),
      magazine: Math.round(WEAPON_TUNING.flamethrower.energyMax),
      reloading: this.energy < 10,
      reloadProgress: this.energyRatio,
      isCharging: false,
    };
  }

  dispose() {
    this.deps.audio.stopFlameLoop();
    this.deps.scene.remove(this.instancedMesh);
    this.deps.scene.remove(this.muzzleLight);
    this.instancedMesh.geometry.dispose();
    this.instancedMesh.dispose();
    this.particleMat.dispose();
  }
}
