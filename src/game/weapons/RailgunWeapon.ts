// ===== RAILGUN (Рельсотрон) =====
// Hitscan-оружие мгновенного действия с FSM (IDLE -> CHARGING -> FIRING -> COOLDOWN -> IDLE)
import * as THREE from 'three';
import { RAILGUN_CONFIG } from '../constants';
import type { TankEntity } from '../Tank';
import type { Arena } from '../Arena';
import type { Effects } from '../effects';
import type { AudioFX } from '../audio';

export type RailgunState = 'IDLE' | 'CHARGING' | 'FIRING' | 'COOLDOWN';

export interface DamageSystem {
  applyDamage: (target: TankEntity, dmg: number, source: TankEntity, weaponType: string) => void;
  applyKnockback: (target: TankEntity, dir: THREE.Vector3, force: number) => void;
  damageBlock: (blockId: number, dmg: number, hitPos: THREE.Vector3) => void;
}

const tmpMuzzle = new THREE.Vector3();
const tmpDir = new THREE.Vector3();
const tmpMid = new THREE.Vector3();

export class RailgunWeapon {
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

  constructor(
    private owner: TankEntity,
    private scene: THREE.Scene,
    private effects: Effects,
    private audio: AudioFX,
    private damageSystem: DamageSystem,
  ) {
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
    this.scene.add(this.beamMesh);

    // Точечные вспышки
    this.muzzleLight = new THREE.PointLight(0x2ee6c0, 0, 18);
    this.impactLight = new THREE.PointLight(0xfff0a0, 0, 15);
    this.scene.add(this.muzzleLight);
    this.scene.add(this.impactLight);
  }

  /** Нажатие кнопки огня */
  triggerFire() {
    if (this.state === 'IDLE' && this.owner.alive) {
      this.state = 'CHARGING';
      this.chargeTimer = 0;
      this.audio.chargeRailgun();
    }
  }

  get reloadProgress(): number {
    if (this.state === 'COOLDOWN') {
      return 1 - this.reloadTimer / RAILGUN_CONFIG.reloadTime;
    }
    if (this.state === 'CHARGING') {
      return this.chargeTimer / RAILGUN_CONFIG.chargeTime;
    }
    return 1;
  }

  get isCharging(): boolean {
    return this.state === 'CHARGING';
  }

  get isCooldown(): boolean {
    return this.state === 'COOLDOWN';
  }

  update(dt: number, tanks: TankEntity[], arena: Arena) {
    const visual = this.owner.visual;

    switch (this.state) {
      case 'IDLE': {
        // Базовое тусклое свечение в дуле
        if (visual.railGlowMat) {
          visual.railGlowMat.emissiveIntensity = RAILGUN_CONFIG.emissiveIdle;
        }
        break;
      }

      case 'CHARGING': {
        this.chargeTimer += dt;
        const progress = Math.min(1, this.chargeTimer / RAILGUN_CONFIG.chargeTime);

        // Нарастание свечения рельсотрона через useFrame dt
        if (visual.railGlowMat) {
          visual.railGlowMat.emissiveIntensity = THREE.MathUtils.lerp(
            RAILGUN_CONFIG.emissiveIdle,
            RAILGUN_CONFIG.emissiveCharged,
            progress * progress, // экспоненциальный прирост свечения
          );
        }

        // Лёгкая вибрация ствола перед выстрелом
        const jitter = Math.pow(progress, 2.5) * 0.08;
        visual.barrelGroup.position.x = (Math.random() - 0.5) * jitter;
        visual.barrelGroup.position.y = 0.5 + (Math.random() - 0.5) * jitter;

        // По завершении времени заряда — автоматический переход в FIRING
        if (this.chargeTimer >= RAILGUN_CONFIG.chargeTime) {
          visual.barrelGroup.position.set(0, 0.5, 0.55);
          this.executeFiring(tanks, arena);
          this.state = 'COOLDOWN';
          this.reloadTimer = RAILGUN_CONFIG.reloadTime;
        }
        break;
      }

      case 'FIRING': {
        // Кадр выстрела обработан при переходе
        this.state = 'COOLDOWN';
        this.reloadTimer = RAILGUN_CONFIG.reloadTime;
        break;
      }

      case 'COOLDOWN': {
        this.reloadTimer -= dt;

        // Восстановление свечения до IDLE
        if (visual.railGlowMat) {
          visual.railGlowMat.emissiveIntensity = THREE.MathUtils.damp(
            visual.railGlowMat.emissiveIntensity,
            RAILGUN_CONFIG.emissiveIdle,
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
      const opacity = Math.max(0, this.beamFadeTimer / RAILGUN_CONFIG.beamDuration);
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
    this.audio.shoot('railgun');
    this.effects.muzzle(tmpMuzzle, 0x8fffe8);
    this.owner.onFired(RAILGUN_CONFIG.knockback);

    // Настройка Raycaster
    this.raycaster.set(tmpMuzzle, tmpDir);
    this.raycaster.far = RAILGUN_CONFIG.range;

    // Сбор объектов для пересечения (танки + препятствия)
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

    // Блоки арены
    arena.group.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        targetObjects.push(o);
      }
    });

    // Получаем ВСЕ отсортированные по дистанции пересечения
    const hits = this.raycaster.intersectObjects(targetObjects, false);

    let maxHitDist = RAILGUN_CONFIG.range;
    let currentDamage = RAILGUN_CONFIG.damage;
    const hitTanksSet = new Set<number>();

    for (const hit of hits) {
      // Находим танк, которому принадлежит меш
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
          this.damageSystem.applyDamage(hitTank, dmg, this.owner, 'Railgun');
          this.damageSystem.applyKnockback(hitTank, tmpDir, RAILGUN_CONFIG.knockback * (currentDamage / RAILGUN_CONFIG.damage));

          // Debug-лог урона
          console.log(
            `[DAMAGE] Target ${hitTank.name} hit by ${this.owner.name} with Railgun! Damage: ${dmg}, HP remaining: ${hitTank.health}/${hitTank.maxHealth}`,
          );

          // Искры и вспышка на цели
          this.effects.impact(hit.point, 0x8fffe8);
          this.impactLight.position.copy(hit.point);

          // Уменьшаем урон для следующей пробитой цели
          currentDamage *= RAILGUN_CONFIG.penetrationFactor;
        }
      } else {
        // Пересечение со стеной или блоком
        const blockId = (hit.object as unknown as { colliderId?: number }).colliderId;
        if (blockId) {
          this.damageSystem.damageBlock(blockId, Math.round(currentDamage), hit.point);
        }
        this.effects.impact(hit.point, 0xffa040);
        maxHitDist = hit.distance;
        break; // Непробиваемые стены останавливают луч
      }
    }

    // Рендеринг визуального луча (растягиваем CylinderGeometry вдоль Z)
    const rayLength = maxHitDist;
    tmpMid.copy(tmpMuzzle).addScaledVector(tmpDir, rayLength * 0.5);

    this.beamMesh.position.copy(tmpMid);
    this.beamMesh.scale.set(1, 1, rayLength);
    this.beamMesh.lookAt(tmpMuzzle.clone().addScaledVector(tmpDir, rayLength + 1));
    this.beamMesh.visible = true;

    this.beamMat.opacity = 1.0;
    this.beamFadeTimer = RAILGUN_CONFIG.beamDuration;

    this.muzzleLight.position.copy(tmpMuzzle);
    this.muzzleLight.intensity = 80;
  }

  dispose() {
    this.scene.remove(this.beamMesh);
    this.scene.remove(this.muzzleLight);
    this.scene.remove(this.impactLight);
    this.beamMat.dispose();
    this.beamMesh.geometry.dispose();
  }
}
