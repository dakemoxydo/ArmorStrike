// ===== ПУШКА «ГАУСС» (Gauss Turret) =====
// Снайперское дальнобойное оружие с автозахватом цели при удержании ЛКМ
// и автоматическим мощным выстрелом при заполнении 100% индикатора.
import * as THREE from 'three';
import { WEAPON_TUNING } from '../../core/catalog';
import type { Collider } from '../engine/physics';
import { losClear, segmentHitsCircleT } from '../engine/physics';
import type { RailgunChargeHandle } from '../ports/AudioPort';
import type { CombatPeer, Weapon, WeaponAmmoState, WeaponContext, WeaponDeps, WeaponOwner } from './types';
import { fillAmmoState } from './types';
import { fillMuzzleAndAim } from './muzzle';
import { ownerReloadMul } from './reloadMul';
import { resolveWeaponDamage } from './weaponDamage';
import { applyHit } from '../engine/applyHit';
import { nearestShotBlockerDist } from './railgunBlockers';
import { GaussBeamFx } from './GaussBeamFx';

export type GaussState = 'IDLE' | 'LOCKING' | 'COOLDOWN';

interface GaussCone {
  x: number;
  z: number;
  dirX: number;
  dirZ: number;
  halfCos: number;
  range: number;
}

const tmpGaussCone: GaussCone = {
  x: 0,
  z: 0,
  dirX: 0,
  dirZ: 1,
  halfCos: Math.cos(WEAPON_TUNING.gauss.lockConeAngle),
  range: WEAPON_TUNING.gauss.range,
};

function isOpponent(self: WeaponOwner, other: CombatPeer): boolean {
  if (self.id === other.id) return false;
  const tA = self.teamId ?? null;
  const tB = other.teamId ?? null;
  if (tA !== null && tB !== null) return tA !== tB;
  return true;
}

function findGaussTarget(
  tanks: CombatPeer[],
  owner: WeaponOwner,
  cone: GaussCone,
  colliders: readonly Collider[],
): CombatPeer | null {
  let best: CombatPeer | null = null;
  let bestDot = -Infinity;
  for (const t of tanks) {
    if (!t.alive || !isOpponent(owner, t)) continue;
    const dx = t.position.x - cone.x;
    const dz = t.position.z - cone.z;
    const dist = Math.hypot(dx, dz);
    if (dist <= 0.001 || dist > cone.range) continue;
    const invDist = 1 / dist;
    const dot = (dx * cone.dirX + dz * cone.dirZ) * invDist;
    if (dot < cone.halfCos) continue;
    if (!losClear(cone.x, cone.z, t.position.x, t.position.z, colliders)) continue;
    if (dot > bestDot) {
      bestDot = dot;
      best = t;
    }
  }
  return best;
}

const tmpMuzzle = new THREE.Vector3();
const tmpDir = new THREE.Vector3();
const tmpTargetPos = new THREE.Vector3();

export class GaussWeapon implements Weapon {
  readonly owner: WeaponOwner;
  private deps: WeaponDeps;

  state: GaussState = 'IDLE';
  private isTriggerActive = false;
  private lockTimer = 0;
  private reloadTimer = 0;
  private lastCooldownDuration = 0;
  private needsTriggerRelease = false;
  private wantsArcadeRelease = false;
  private lockedTarget: CombatPeer | null = null;
  private beamFx: GaussBeamFx;
  private chargeHandle: RailgunChargeHandle | null = null;

  constructor(owner: WeaponOwner, deps: WeaponDeps) {
    this.owner = owner;
    this.deps = deps;
    this.beamFx = new GaussBeamFx(deps.scene);
    this.lastCooldownDuration = this.cooldownDuration();
  }

  setFire(active: boolean): void {
    const wasActive = this.isTriggerActive;
    this.isTriggerActive = active;
    if (!active) {
      this.needsTriggerRelease = false;
      if (wasActive && this.state === 'LOCKING') {
        this.wantsArcadeRelease = true;
      }
    }
  }

  get isCharging(): boolean {
    return this.state === 'LOCKING' && this.isTriggerActive && !this.wantsArcadeRelease;
  }

  get isReloading(): boolean {
    return this.state === 'COOLDOWN';
  }

  get currentTarget(): CombatPeer | null {
    if (!this.isTriggerActive || this.wantsArcadeRelease) return null;
    return this.lockedTarget;
  }

  getLockTarget(): { position: THREE.Vector3 } | null {
    if (!this.isTriggerActive || this.wantsArcadeRelease) return null;
    return this.state === 'LOCKING' && this.lockedTarget ? this.lockedTarget : null;
  }

  private lockDuration(): number {
    return WEAPON_TUNING.gauss.lockTime / ownerReloadMul(this.owner);
  }

  private cooldownDuration(): number {
    return WEAPON_TUNING.gauss.reloadTime / ownerReloadMul(this.owner);
  }

  private arcadeCooldownDuration(): number {
    return WEAPON_TUNING.gauss.arcadeReloadTime / ownerReloadMul(this.owner);
  }

  private startLockAudio(): void {
    if (!this.chargeHandle) {
      this.chargeHandle = this.deps.audio.chargeRailgun(this.lockDuration());
    }
  }

  private stopLockAudio(hard = false): void {
    if (this.chargeHandle) {
      this.deps.audio.stopChargeRailgun(this.chargeHandle, hard);
      this.chargeHandle = null;
    }
  }

  private cancelLock(): void {
    this.state = 'IDLE';
    this.lockTimer = 0;
    this.lockedTarget = null;
    this.wantsArcadeRelease = false;
    this.stopLockAudio(false);
    this.owner.setBarrelKick?.(0);
    if (this.owner.visual.railGlowMat) {
      this.owner.visual.railGlowMat.emissiveIntensity = 0.15;
    }
  }

  update(dt: number, ctx: WeaponContext): void {
    this.beamFx.update(dt);

    if (!this.owner.alive) {
      if (this.state === 'LOCKING') this.cancelLock();
      return;
    }

    switch (this.state) {
      case 'COOLDOWN': {
        this.reloadTimer -= dt;
        const cd = this.lastCooldownDuration > 0 ? this.lastCooldownDuration : this.cooldownDuration();
        if (this.owner.visual.railGlowMat) {
          const ratio = cd > 0 ? Math.max(0, this.reloadTimer / cd) : 0;
          this.owner.visual.railGlowMat.emissiveIntensity = 0.15 + ratio * 1.2;
        }
        if (this.reloadTimer <= 0) {
          this.state = 'IDLE';
          this.reloadTimer = 0;
          if (this.owner.visual.railGlowMat) {
            this.owner.visual.railGlowMat.emissiveIntensity = 0.15;
          }
        }
        break;
      }

      case 'IDLE': {
        if (this.isTriggerActive && !this.needsTriggerRelease && this.owner.fireTimer <= 0) {
          fillMuzzleAndAim(this.owner, tmpMuzzle, tmpDir);
          const range = this.owner.params.range ?? WEAPON_TUNING.gauss.range;
          tmpGaussCone.x = this.owner.position.x;
          tmpGaussCone.z = this.owner.position.z;
          tmpGaussCone.dirX = tmpDir.x;
          tmpGaussCone.dirZ = tmpDir.z;
          tmpGaussCone.halfCos = Math.cos(WEAPON_TUNING.gauss.lockConeAngle);
          tmpGaussCone.range = range;
          const target = findGaussTarget(ctx.tanks, this.owner, tmpGaussCone, ctx.colliders);
          if (target) {
            this.state = 'LOCKING';
            this.lockedTarget = target;
            this.lockTimer = 0;
            this.startLockAudio();
          } else {
            this.executeArcadeFiring(ctx);
            this.state = 'COOLDOWN';
            this.lastCooldownDuration = this.arcadeCooldownDuration();
            this.reloadTimer = this.lastCooldownDuration;
          }
        }
        break;
      }

      case 'LOCKING': {
        if (this.wantsArcadeRelease || !this.isTriggerActive) {
          this.wantsArcadeRelease = false;
          this.stopLockAudio(true);
          this.owner.setBarrelKick?.(0);
          if (this.owner.visual.railGlowMat) {
            this.owner.visual.railGlowMat.emissiveIntensity = 0.15;
          }
          this.executeArcadeFiring(ctx);
          this.state = 'COOLDOWN';
          this.lastCooldownDuration = this.arcadeCooldownDuration();
          this.reloadTimer = this.lastCooldownDuration;
          this.lockTimer = 0;
          this.lockedTarget = null;
          break;
        }
        const target = this.lockedTarget;
        if (!target || !target.alive) {
          this.needsTriggerRelease = true;
          this.cancelLock();
          break;
        }

        fillMuzzleAndAim(this.owner, tmpMuzzle, tmpDir);
        const dx = target.position.x - this.owner.position.x;
        const dz = target.position.z - this.owner.position.z;
        const dist = Math.hypot(dx, dz);
        const range = this.owner.params.range ?? WEAPON_TUNING.gauss.range;
        // Строгий сектор удержания (~4.6°): малейший увод с цели срывает заряд
        const hysteresisCos = Math.cos(WEAPON_TUNING.gauss.lockConeAngle * 1.08);
        const invDist = dist > 0.001 ? 1 / dist : 0;
        const dot = (dx * tmpDir.x + dz * tmpDir.z) * invDist;

        const losOk = losClear(
          this.owner.position.x,
          this.owner.position.z,
          target.position.x,
          target.position.z,
          ctx.colliders,
        );

        // Проверка перевода прицела на другого врага: накопление НЕ переносится,
        // при попытке перенацелиться заряд мгновенно обнуляется
        let switchedTarget = false;
        for (const other of ctx.tanks) {
          if (other.id === target.id || !other.alive || !isOpponent(this.owner, other)) continue;
          const odx = other.position.x - this.owner.position.x;
          const odz = other.position.z - this.owner.position.z;
          const odist = Math.hypot(odx, odz);
          if (odist <= 0.001 || odist > range) continue;
          const odot = (odx * tmpDir.x + odz * tmpDir.z) / odist;
          if (odot > dot && odot >= Math.cos(WEAPON_TUNING.gauss.lockConeAngle)) {
            switchedTarget = true;
            break;
          }
        }

        if (dist > range || dot < hysteresisCos || !losOk || switchedTarget) {
          this.needsTriggerRelease = true;
          this.cancelLock();
          break;
        }

        const lockDur = this.lockDuration();
        this.lockTimer += dt;
        const progress = lockDur > 0 ? Math.min(1, this.lockTimer / lockDur) : 1;

        if (this.chargeHandle) {
          this.deps.audio.setChargeRailgunPitch(this.chargeHandle, progress);
        }
        if (this.owner.visual.railGlowMat) {
          this.owner.visual.railGlowMat.emissiveIntensity = 0.2 + progress * 4.2;
        }
        this.owner.setBarrelKick?.(progress * 0.7);

        // 100% заполнение круга — автоматический выстрел!
        if (this.lockTimer >= lockDur) {
          this.executeSniperFiring(target, ctx.tanks);
          this.stopLockAudio(true);
          this.state = 'COOLDOWN';
          this.lastCooldownDuration = this.cooldownDuration();
          this.reloadTimer = this.lastCooldownDuration;
          this.lockTimer = 0;
          this.lockedTarget = null;
          this.owner.setBarrelKick?.(0);
        }
        break;
      }
    }
  }

  private playerNear(tanks: CombatPeer[] | undefined, range: number): boolean {
    if (!tanks) return false;
    const range2 = range * range;
    const pos = this.owner.position;
    for (const t of tanks) {
      if (!t.isPlayer || !t.alive) continue;
      const dx = t.position.x - pos.x;
      const dz = t.position.z - pos.z;
      if (dx * dx + dz * dz <= range2) return true;
    }
    return false;
  }

  private executeSniperFiring(target: CombatPeer, tanks?: CombatPeer[]): void {
    fillMuzzleAndAim(this.owner, tmpMuzzle, tmpDir);
    tmpTargetPos.set(target.position.x, target.position.y + 0.8, target.position.z);

    const dmg = resolveWeaponDamage(this.owner.params.damage, WEAPON_TUNING.gauss.damage);
    const knockDir = tmpDir.clone();

    applyHit(
      this.deps.damageSystem,
      target,
      dmg,
      this.owner,
      knockDir,
      WEAPON_TUNING.gauss.knockback,
      (p) => {
        this.deps.effects.impact(p, 0xc084fc);
        this.deps.effects.explosion(p, 0xc084fc, 1.2);
      },
      tmpTargetPos,
    );

    this.beamFx.fire(tmpMuzzle, tmpTargetPos, WEAPON_TUNING.gauss.beamDuration);
    this.deps.effects.muzzle(tmpMuzzle, 0xc084fc);
    this.owner.onFired(WEAPON_TUNING.gauss.knockback);
    if (this.owner.isPlayer) {
      this.deps.audio.shoot('gauss');
    } else {
      this.deps.audio.shoot('gauss', this.owner.position);
    }

    if (this.owner.isPlayer) {
      this.deps.effects.addShake(WEAPON_TUNING.gauss.fireShakePlayer);
      this.deps.effects.addFovPunch(6.5);
      this.deps.onShotFired?.();
    } else if (this.playerNear(tanks, 45)) {
      this.deps.effects.addShake(WEAPON_TUNING.gauss.fireShakeBot);
    }
  }

  private executeArcadeFiring(ctx: WeaponContext): void {
    fillMuzzleAndAim(this.owner, tmpMuzzle, tmpDir);
    const range = WEAPON_TUNING.gauss.arcadeRange;
    const endX = tmpMuzzle.x + tmpDir.x * range;
    const endZ = tmpMuzzle.z + tmpDir.z * range;

    let hitT = 1.0;
    let hitTank: CombatPeer | null = null;
    let isWall = false;

    // 1. Проверка столкновения со стеной/препятствием
    const blocker = nearestShotBlockerDist(
      tmpMuzzle.x,
      tmpMuzzle.z,
      tmpDir.x,
      tmpDir.z,
      range,
      ctx.colliders as Collider[],
      tmpMuzzle.y,
    );
    if (blocker) {
      hitT = blocker.dist / range;
      isWall = true;
    }

    // 2. Проверка попадания в танки до препятствия
    for (const t of ctx.tanks) {
      if (!t.alive || !isOpponent(this.owner, t)) continue;
      const tHit = segmentHitsCircleT(
        tmpMuzzle.x,
        tmpMuzzle.z,
        endX,
        endZ,
        t.position.x,
        t.position.z,
        t.radius ?? 1.8,
      );
      if (tHit >= 0 && tHit < hitT) {
        hitT = tHit;
        hitTank = t;
        isWall = false;
      }
    }

    tmpTargetPos.set(
      tmpMuzzle.x + tmpDir.x * range * hitT,
      tmpMuzzle.y + 0.1,
      tmpMuzzle.z + tmpDir.z * range * hitT,
    );

    if (hitTank) {
      const baseArcade = resolveWeaponDamage(
        this.owner.params.damage != null
          ? Math.round(this.owner.params.damage * (WEAPON_TUNING.gauss.arcadeDamage / WEAPON_TUNING.gauss.damage))
          : undefined,
        WEAPON_TUNING.gauss.arcadeDamage,
      );
      const knockDir = tmpDir.clone();
      applyHit(
        this.deps.damageSystem,
        hitTank,
        baseArcade,
        this.owner,
        knockDir,
        WEAPON_TUNING.gauss.arcadeKnockback,
        (p) => {
          this.deps.effects.impact(p, 0xc084fc);
          this.deps.effects.explosion(p, 0xc084fc, 0.7);
        },
        tmpTargetPos,
      );
    } else if (isWall) {
      this.deps.effects.impact(tmpTargetPos, 0xc084fc);
      this.deps.effects.explosion(tmpTargetPos, 0xc084fc, 0.7);
    }

    this.beamFx.fire(tmpMuzzle, tmpTargetPos, WEAPON_TUNING.gauss.arcadeBeamDuration);
    this.deps.effects.muzzle(tmpMuzzle, 0xc084fc);
    this.owner.onFired(WEAPON_TUNING.gauss.arcadeKnockback);
    if (this.owner.isPlayer) {
      this.deps.audio.shoot('gauss');
    } else {
      this.deps.audio.shoot('gauss', this.owner.position);
    }

    if (this.owner.isPlayer) {
      this.deps.effects.addShake(WEAPON_TUNING.gauss.fireShakePlayer * 0.4);
      this.deps.effects.addFovPunch(2.0);
      this.deps.onShotFired?.();
    } else if (this.playerNear(ctx.tanks, 35)) {
      this.deps.effects.addShake(WEAPON_TUNING.gauss.fireShakeBot * 0.4);
    }
  }

  updateReload(_dt: number): void {
    // Gauss reload is automatic through COOLDOWN state
  }

  requestReload(): void {
    // Gauss uses single-round capacitor discharge
  }

  onOwnerDeath(): void {
    this.cancelLock();
    this.state = 'IDLE';
    this.reloadTimer = 0;
    this.wantsArcadeRelease = false;
    this.needsTriggerRelease = false;
    this.beamFx.hide();
  }

  onRespawn(): void {
    this.cancelLock();
    this.state = 'IDLE';
    this.reloadTimer = 0;
    this.wantsArcadeRelease = false;
    this.needsTriggerRelease = false;
  }

  dispose(): void {
    this.cancelLock();
    this.beamFx.dispose();
  }

  getAmmoState(out?: WeaponAmmoState): WeaponAmmoState {
    if (this.state === 'LOCKING') {
      const dur = this.lockDuration();
      const prog = dur > 0 ? Math.min(1, this.lockTimer / dur) : 1;
      return fillAmmoState(out, {
        ammo: 1,
        magazine: 1,
        reloading: false,
        reloadProgress: prog,
        isCharging: true,
      });
    }
    if (this.state === 'COOLDOWN') {
      const cd = this.lastCooldownDuration > 0 ? this.lastCooldownDuration : this.cooldownDuration();
      const prog = cd > 0 ? Math.min(1, 1 - this.reloadTimer / cd) : 1;
      return fillAmmoState(out, {
        ammo: 0,
        magazine: 1,
        reloading: true,
        reloadProgress: prog,
        isCharging: false,
      });
    }
    return fillAmmoState(out, {
      ammo: 1,
      magazine: 1,
      reloading: false,
      reloadProgress: 1,
      isCharging: false,
    });
  }
}
