// ===== Визуал заряда рельсотрона (glow / jitter / shake) — без смены чисел =====
import * as THREE from 'three';
import { WEAPON_TUNING } from '../../core/catalog';
import { BARREL_REST_Y } from '../tuning';
import type { EffectsPort } from '../ports/EffectsPort';
import type { WeaponOwner } from './types';
import { fillMuzzleAndAim } from './muzzle';

const tmpMuzzle = new THREE.Vector3();
const tmpDir = new THREE.Vector3();

/** Idle glow + clear FOV tighten. */
export function applyRailgunIdleChargeFx(
  owner: WeaponOwner,
  effects: EffectsPort,
): void {
  const visual = owner.visual;
  if (visual.railGlowMat) {
    visual.railGlowMat.emissiveIntensity = WEAPON_TUNING.railgun.emissiveIdle;
  }
  if (owner.isPlayer) effects.setFovTighten(0);
}

/**
 * Charge-frame presentation. Returns updated chargeFxAcc.
 * When charge completes, barrel reset is done by caller before fire.
 */
export function applyRailgunChargingFx(
  owner: WeaponOwner,
  effects: EffectsPort,
  progress: number,
  chargeFxAcc: number,
  dt: number,
): number {
  const visual = owner.visual;
  const isPlayer = owner.isPlayer;
  const p2 = progress * progress;
  const p25 = Math.pow(progress, 2.5);

  if (visual.railGlowMat) {
    visual.railGlowMat.emissiveIntensity = THREE.MathUtils.lerp(
      WEAPON_TUNING.railgun.emissiveIdle,
      WEAPON_TUNING.railgun.emissiveCharged,
      p2,
    );
    if (progress > 0.92) {
      visual.railGlowMat.emissiveIntensity =
        WEAPON_TUNING.railgun.emissiveCharged * (1 + (progress - 0.92) * 8);
    }
  }

  const pull = p2 * 0.85;
  owner.setBarrelKick?.(pull);
  const t = performance.now() * 0.001;
  const jitter = p25 * 0.07;
  visual.barrelGroup.position.x = Math.sin(t * (18 + progress * 40)) * jitter;
  visual.barrelGroup.position.y =
    BARREL_REST_Y + Math.sin(t * (23 + progress * 35) + 1.7) * jitter * 0.7;

  let acc = chargeFxAcc;
  if (isPlayer) {
    effects.setFovTighten(WEAPON_TUNING.railgun.chargeFovTighten * p2);
    acc += dt;
    const shakeEvery = THREE.MathUtils.lerp(0.12, 0.035, p2);
    if (acc >= shakeEvery) {
      acc = 0;
      effects.addShake(WEAPON_TUNING.railgun.chargeShakePeak * p25);
      fillMuzzleAndAim(owner, tmpMuzzle, tmpDir);
      effects.boostJet(
        tmpMuzzle.clone().addScaledVector(tmpDir, 1.2),
        tmpDir.clone().multiplyScalar(-1),
        0x8fffe8,
      );
    }
  }
  return acc;
}

/** Cooldown glow damp + FOV clear. */
export function applyRailgunCooldownChargeFx(
  owner: WeaponOwner,
  effects: EffectsPort,
  reloadTimer: number,
  cooldownDuration: number,
  dt: number,
): void {
  const visual = owner.visual;
  if (visual.railGlowMat) {
    const target =
      reloadTimer > cooldownDuration * 0.92
        ? 0.02
        : WEAPON_TUNING.railgun.emissiveIdle;
    visual.railGlowMat.emissiveIntensity = THREE.MathUtils.damp(
      visual.railGlowMat.emissiveIntensity,
      target,
      8,
      dt,
    );
  }
  if (owner.isPlayer) effects.setFovTighten(0);
}
