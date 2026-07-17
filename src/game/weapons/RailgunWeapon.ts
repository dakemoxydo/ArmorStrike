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
import { railgunShouldStartCharge } from './railgunFireLogic';
import { nearestShotBlockerDist } from './railgunBlockers';
import { resolveWeaponDamage } from './weaponDamage';

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

  /**
   * Спуск: заряд стартует в IDLE при удержании/нажатии (level-trigger).
   * C3 root: rising-edge only + AI holds wantsFire every frame → after first shot
   * prevFire stays true through COOLDOWN, so no second charge ever started.
   */
  setFire(active: boolean) {
    if (railgunShouldStartCharge(active, this.state, this.owner.alive)) {
      this.state = 'CHARGING';
      this.chargeTimer = 0;
      this.deps.audio.chargeRailgun();
      // TEMP DEBUG [BUGFIX-C3]
      console.debug('[BUGFIX-C3] railgun charge start', {
        ownerId: this.owner.id, wasEdge: !this.prevFire, prevFire: this.prevFire,
      });
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
    const maxHitDist = this.resolveHits(hits, arena);
    this.beamFx.show(tmpMuzzle, tmpDir, maxHitDist);
  }

  /**
   * M9: tank meshes via raycast; walls/blocks via collider slab (blocksShots),
   * same parity as projectiles — decorative arena meshes never stop the beam.
   * Non-destructible solids clear mesh colliderId, so mesh-only filtering was wrong.
   */
  private castHitscan(tanks: CombatPeer[], _arena: Arena): THREE.Intersection[] {
    this.raycaster.set(tmpMuzzle, tmpDir);
    this.raycaster.far = this.owner.params.range ?? WEAPON_TUNING.railgun.range;

    const targetObjects: THREE.Object3D[] = [];
    const tankMap = new Map<THREE.Object3D, CombatPeer>();

    for (const t of tanks) {
      if (t.id !== this.owner.id && t.alive) {
        t.visual.group.traverse((o) => {
          targetObjects.push(o);
          tankMap.set(o, t);
        });
      }
    }

    this._tankMap = tankMap;
    return this.raycaster.intersectObjects(targetObjects, false);
  }

  /** Nearest shot-blocking collider along aim ray; builds world hit point for FX/damage. */
  private nearestShotBlocker(
    arena: Arena,
    range: number,
  ): { dist: number; id: number; point: THREE.Vector3 } | null {
    const hit = nearestShotBlockerDist(
      tmpMuzzle.x, tmpMuzzle.z, tmpDir.x, tmpDir.z, range, arena.colliders, tmpMuzzle.y,
    );
    if (!hit) return null;
    const col = arena.colliders.find((c) => c.id === hit.id);
    const point = tmpMuzzle.clone().addScaledVector(tmpDir, hit.dist);
    point.y = col ? Math.min(col.height * 0.5, 2) : 1.6;
    return { dist: hit.dist, id: hit.id, point };
  }

  /** Проход по попаданиям: пенетрация, урон, толчок, эффекты. Возвращает дистанцию луча. */
  private resolveHits(hits: THREE.Intersection[], arena: Arena): number {
    const tankMap = this._tankMap;
    const range = this.owner.params.range ?? WEAPON_TUNING.railgun.range;
    let maxHitDist = range;
    // M6: use owner.params.damage (wave damageScale) as base, not hardcoded tuning.
    const baseDamage = resolveWeaponDamage(this.owner.params.damage, WEAPON_TUNING.railgun.damage);
    let currentDamage = baseDamage;
    // TEMP DEBUG [BUGFIX-M6]
    console.debug('[BUGFIX-M6] railgun baseDamage', {
      paramsDamage: this.owner.params.damage,
      baseDamage,
      tuning: WEAPON_TUNING.railgun.damage,
    });
    const hitTanksSet = new Set<number>();

    const wall = this.nearestShotBlocker(arena, range);
    const wallDist = wall?.dist ?? Infinity;

    for (const hit of hits) {
      if (hit.distance >= wallDist) break;

      let obj: THREE.Object3D | null = hit.object;
      let hitTank: CombatPeer | undefined;
      while (obj && !hitTank) {
        hitTank = tankMap.get(obj);
        obj = obj.parent;
      }
      if (!hitTank || hitTanksSet.has(hitTank.id)) continue;

      hitTanksSet.add(hitTank.id);
      const dmg = Math.round(currentDamage);
      const force = WEAPON_TUNING.railgun.knockback * (currentDamage / baseDamage);
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

    if (wall) {
      // TEMP DEBUG [BUGFIX-M9]
      console.debug('[BUGFIX-M9] railgun stopped by collider', { id: wall.id, dist: wall.dist });
      this.deps.damageSystem.damageBlock(wall.id, Math.round(currentDamage), wall.point);
      this.deps.effects.impact(wall.point, 0xffa040);
      maxHitDist = wall.dist;
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
