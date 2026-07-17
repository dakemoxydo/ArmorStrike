// ===== RAILGUN (Рельсотрон) =====
// Hitscan-оружие мгновенного действия с FSM (IDLE -> CHARGING -> FIRING -> COOLDOWN -> IDLE)
// Визуальный луч вынесен в RailgunBeamFx.
import * as THREE from 'three';
import { WEAPON_TUNING } from '../../core/catalog';
import type { Arena } from '../Arena';
import type { CombatPeer, WeaponOwner } from './types';
import type { Weapon, WeaponContext, WeaponDeps } from './types';
import { buildAmmoState } from './types';
import { applyHit } from '../engine/applyHit';
import { BARREL_REST_Y, BARREL_REST_Z } from '../tuning';
import { fillMuzzleAndAim } from './muzzle';
import { RailgunBeamFx } from './RailgunBeamFx';

export type RailgunState = 'IDLE' | 'CHARGING' | 'FIRING' | 'COOLDOWN';

const tmpMuzzle = new THREE.Vector3();
const tmpDir = new THREE.Vector3();

export class RailgunWeapon implements Weapon {
  readonly owner: WeaponOwner;
  state: RailgunState = 'IDLE';

  // Таймеры управления
  chargeTimer = 0;
  reloadTimer = 0;

  private beamFx: RailgunBeamFx;
  private raycaster = new THREE.Raycaster();

  private deps: WeaponDeps;
  private prevFire = false;
  private _tankMap = new Map<THREE.Object3D, CombatPeer>();

  constructor(owner: WeaponOwner, deps: WeaponDeps) {
    this.owner = owner;
    this.deps = deps;
    this.beamFx = new RailgunBeamFx(deps.scene);
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
        visual.barrelGroup.position.y = BARREL_REST_Y + (Math.random() - 0.5) * jitter;

        // По завершении времени заряда — автоматический переход в FIRING
        if (this.chargeTimer >= WEAPON_TUNING.railgun.chargeTime) {
          visual.barrelGroup.position.set(0, BARREL_REST_Y, BARREL_REST_Z);
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

    this.beamFx.update(dt);
  }

  /** Выполнение Hitscan-выстрела с помощью Raycast */
  private executeFiring(tanks: CombatPeer[], arena: Arena) {
    fillMuzzleAndAim(this.owner, tmpMuzzle, tmpDir);

    // Звук и импульс отката
    this.deps.audio.shoot('railgun');
    this.deps.effects.muzzle(tmpMuzzle, 0x8fffe8);
    this.owner.onFired(WEAPON_TUNING.railgun.knockback);

    const hits = this.castHitscan(tanks, arena);
    const maxHitDist = this.resolveHits(hits);
    this.beamFx.show(tmpMuzzle, tmpDir, maxHitDist);
  }

  /** Raycast: собирает меши танков/арены и возвращает отсортированные пересечения. */
  private castHitscan(tanks: CombatPeer[], arena: Arena): THREE.Intersection[] {
    this.raycaster.set(tmpMuzzle, tmpDir);
    this.raycaster.far = WEAPON_TUNING.railgun.range;

    const targetObjects: THREE.Object3D[] = [];
    const tankMap = new Map<THREE.Object3D, CombatPeer>();

    for (const t of tanks) {
      // Compare by id: CombatPeer and WeaponOwner are distinct ports on same runtime entity
      if (t.id !== this.owner.id && t.alive) {
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
      let hitTank: CombatPeer | undefined;

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
              this.beamFx.setImpactPosition(p);
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
    this.beamFx.dispose();
  }
}
