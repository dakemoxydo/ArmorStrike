// ===== RAILGUN (Рельсотрон) =====
// Hitscan-оружие мгновенного действия с FSM (IDLE -> CHARGING -> FIRING -> COOLDOWN -> IDLE)
import * as THREE from 'three';
import { WEAPON_TUNING } from '../../core/catalog';
import type { Arena } from '../Arena';
import type { TankEntity } from '../Tank';
import type { Weapon, WeaponContext, WeaponDeps } from './types';
import { buildAmmoState } from './types';
import { applyHit } from '../engine/applyHit';

export type RailgunState = 'IDLE' | 'CHARGING' | 'FIRING' | 'COOLDOWN';

const tmpMuzzle = new THREE.Vector3();
const tmpDir = new THREE.Vector3();
const tmpMid = new THREE.Vector3();

export class RailgunWeapon implements Weapon {
  readonly owner: TankEntity;
  state: RailgunState = 'IDLE';

  // Таймеры управления
  chargeTimer = 0;
  reloadTimer = 0;
  beamFadeTimer = 0;

  // Визуальные объекты (переиспользуемые)
  private beamMesh: THREE.Mesh;
  private beamMat: THREE.MeshBasicMaterial;
  private muzzleLight: THREE.PointLight;
  private impactLight: THREE.PointLight;
  private raycaster = new THREE.Raycaster();

  private deps: WeaponDeps;
  private prevFire = false;
  private _tankMap = new Map<THREE.Object3D, TankEntity>();

  constructor(owner: TankEntity, deps: WeaponDeps) {
    this.owner = owner;
    this.deps = deps;

    // Геометрия и материал луча (переиспользуемые, создаются один раз)
    const beamGeo = new THREE.CylinderGeometry(0.18, 0.18, 1, 12);
    beamGeo.rotateX(Math.PI / 2); // ось Z вдоль луча

    this.beamMat = new THREE.MeshBasicMaterial({
      color: 0x8fffe8,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.beamMesh = new THREE.Mesh(beamGeo, this.beamMat);
    this.beamMesh.frustumCulled = false;
    this.beamMesh.visible = false;
    this.deps.scene.add(this.beamMesh);

    // Точечные вспышки
    this.muzzleLight = new THREE.PointLight(0x2ee6c0, 0, 18);
    this.impactLight = new THREE.PointLight(0xfff0a0, 0, 15);
    this.deps.scene.add(this.muzzleLight);
    this.deps.scene.add(this.impactLight);
  }

  /** Установить состояние спуска. Стреляет по фронту нажатия (край). */
  setFire(active: boolean) {
    if (active && !this.prevFire && this.state === 'IDLE' && this.owner.alive) {
      this.state = 'CHARGING';
      this.chargeTimer = 0;
      this.deps.audio.chargeRailgun();
    }
    this.prevFire = active;
  }

  get reloadProgress(): number {
    if (this.state === 'COOLDOWN') {
      return 1 - this.reloadTimer / WEAPON_TUNING.railgun.reloadTime;
    }
    if (this.state === 'CHARGING') {
      return this.chargeTimer / WEAPON_TUNING.railgun.chargeTime;
    }
    return 1;
  }

  get isCharging(): boolean {
    return this.state === 'CHARGING';
  }

  get isCooldown(): boolean {
    return this.state === 'COOLDOWN';
  }

  update(dt: number, ctx: WeaponContext) {
    const visual = this.owner.visual;

    switch (this.state) {
      case 'IDLE': {
        // Базовое тусклое свечение в дуле
        if (visual.railGlowMat) {
          visual.railGlowMat.emissiveIntensity = WEAPON_TUNING.railgun.emissiveIdle;
        }
        break;
      }

      case 'CHARGING': {
        this.chargeTimer += dt;
        const progress = Math.min(1, this.chargeTimer / WEAPON_TUNING.railgun.chargeTime);

        // Нарастание свечения рельсотрона через useFrame dt
        if (visual.railGlowMat) {
          visual.railGlowMat.emissiveIntensity = THREE.MathUtils.lerp(
            WEAPON_TUNING.railgun.emissiveIdle,
            WEAPON_TUNING.railgun.emissiveCharged,
            progress * progress, // экспоненциальный прирост свечения
          );
        }

        // Лёгкая вибрация ствола перед выстрелом
        const jitter = Math.pow(progress, 2.5) * 0.08;
        visual.barrelGroup.position.x = (Math.random() - 0.5) * jitter;
        visual.barrelGroup.position.y = 0.5 + (Math.random() - 0.5) * jitter;

        // По завершении времени заряда — автоматический переход в FIRING
        if (this.chargeTimer >= WEAPON_TUNING.railgun.chargeTime) {
          visual.barrelGroup.position.set(0, 0.5, 0.55);
          this.executeFiring(ctx.tanks, ctx.arena);
          this.state = 'COOLDOWN';
          this.reloadTimer = WEAPON_TUNING.railgun.reloadTime;
        }
        break;
      }

      case 'FIRING': {
        // Кадр выстрела обработан при переходе
        this.state = 'COOLDOWN';
        this.reloadTimer = WEAPON_TUNING.railgun.reloadTime;
        break;
      }

      case 'COOLDOWN': {
        this.reloadTimer -= dt;

        // Восстановление свечения до IDLE
        if (visual.railGlowMat) {
          visual.railGlowMat.emissiveIntensity = THREE.MathUtils.damp(
            visual.railGlowMat.emissiveIntensity,
            WEAPON_TUNING.railgun.emissiveIdle,
            6,
            dt,
          );
        }

        if (this.reloadTimer <= 0) {
          this.state = 'IDLE';
          this.reloadTimer = 0;
        }
        break;
      }
    }

    // Затухание визуального луча от 1 -> 0 через useFrame delta
    if (this.beamFadeTimer > 0) {
      this.beamFadeTimer -= dt;
      const opacity = Math.max(0, this.beamFadeTimer / WEAPON_TUNING.railgun.beamDuration);
      this.beamMat.opacity = opacity;
      this.muzzleLight.intensity = opacity * 60;
      this.impactLight.intensity = opacity * 40;

      if (this.beamFadeTimer <= 0) {
        this.beamMesh.visible = false;
        this.muzzleLight.intensity = 0;
        this.impactLight.intensity = 0;
      }
    }
  }

  /** Выполнение Hitscan-выстрела с помощью Raycast */
  private executeFiring(tanks: TankEntity[], arena: Arena) {
    this.owner.muzzleWorld(tmpMuzzle);
    this.owner.aimDir(tmpDir);

    // Звук и импульс отката
    this.deps.audio.shoot('railgun');
    this.deps.effects.muzzle(tmpMuzzle, 0x8fffe8);
    this.owner.onFired(WEAPON_TUNING.railgun.knockback);

    const hits = this.castHitscan(tanks, arena);
    const maxHitDist = this.resolveHits(hits);
    this.renderBeam(maxHitDist);
  }

  /** Raycast: собирает меши танков/арены и возвращает отсортированные пересечения. */
  private castHitscan(tanks: TankEntity[], arena: Arena): THREE.Intersection[] {
    this.raycaster.set(tmpMuzzle, tmpDir);
    this.raycaster.far = WEAPON_TUNING.railgun.range;

    const targetObjects: THREE.Object3D[] = [];
    const tankMap = new Map<THREE.Object3D, TankEntity>();

    for (const t of tanks) {
      if (t !== this.owner && t.alive) {
        t.visual.group.traverse((o) => {
          targetObjects.push(o);
          tankMap.set(o, t);
        });
      }
    }

    arena.group.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        targetObjects.push(o);
      }
    });

    // Кладём tankMap в замыкание для resolveHits
    this._tankMap = tankMap;
    return this.raycaster.intersectObjects(targetObjects, false);
  }

  /** Проход по попаданиям: пенетрация, урон, толчок, эффекты. Возвращает дистанцию луча. */
  private resolveHits(hits: THREE.Intersection[]): number {
    const tankMap = this._tankMap;
    let maxHitDist = WEAPON_TUNING.railgun.range;
    let currentDamage = WEAPON_TUNING.railgun.damage;
    const hitTanksSet = new Set<number>();

    for (const hit of hits) {
      let obj: THREE.Object3D | null = hit.object;
      let hitTank: TankEntity | undefined;

      while (obj && !hitTank) {
        hitTank = tankMap.get(obj);
        obj = obj.parent;
      }

      if (hitTank) {
        if (!hitTanksSet.has(hitTank.id)) {
          hitTanksSet.add(hitTank.id);

          const dmg = Math.round(currentDamage);
          const force = WEAPON_TUNING.railgun.knockback * (currentDamage / WEAPON_TUNING.railgun.damage);
          applyHit(
            this.deps.damageSystem, hitTank, dmg, this.owner, tmpDir, force,
            (p) => {
              this.deps.effects.impact(p, 0x8fffe8);
              this.impactLight.position.copy(p);
            },
            hit.point,
          );

          currentDamage *= WEAPON_TUNING.railgun.penetrationFactor;
        }
      } else {
        const blockId = hit.object.userData?.colliderId as number | undefined;
        if (blockId) {
          this.deps.damageSystem.damageBlock(blockId, Math.round(currentDamage), hit.point);
        }
        this.deps.effects.impact(hit.point, 0xffa040);
        maxHitDist = hit.distance;
        break;
      }
    }
    return maxHitDist;
  }

  /** Рендеринг визуального луча (растягиваем CylinderGeometry вдоль Z) + свет. */
  private renderBeam(rayLength: number) {
    tmpMid.copy(tmpMuzzle).addScaledVector(tmpDir, rayLength * 0.5);

    this.beamMesh.position.copy(tmpMid);
    this.beamMesh.scale.set(1, 1, rayLength);
    this.beamMesh.lookAt(tmpMuzzle.clone().addScaledVector(tmpDir, rayLength + 1));
    this.beamMesh.visible = true;

    this.beamMat.opacity = 1.0;
    this.beamFadeTimer = WEAPON_TUNING.railgun.beamDuration;

    this.muzzleLight.position.copy(tmpMuzzle);
    this.muzzleLight.intensity = 80;
  }

  updateReload(_dt: number): void {}

  requestReload(): void {}

  getAmmoState() {
    const reloading = this.isCharging || this.isCooldown;
    return buildAmmoState({
      ammo: reloading ? 0 : 1,
      magazine: 1,
      reloading,
      reloadProgress: this.reloadProgress,
      isCharging: this.isCharging,
    });
  }

  dispose() {
    this.deps.scene.remove(this.beamMesh);
    this.deps.scene.remove(this.muzzleLight);
    this.deps.scene.remove(this.impactLight);
    this.beamMat.dispose();
    this.beamMesh.geometry.dispose();
  }
}
