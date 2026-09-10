// ===== Runtime components of a tank (SRP slices; entity composes them) =====
import * as THREE from 'three';
import type { TankFxState } from './types';

/** Drive / pose / knockback (sim motion). Position lives on visual.group. */
export class TankMotionState {
  yaw = 0;
  turretYaw = 0;
  aimYaw = 0;
  speed = 0;
  throttle = 0;
  steer = 0;
  boosting = false;
  boostActive = false;
  boostEnergy = 1;
  knockback = new THREE.Vector3();
  vel = new THREE.Vector3();
}

/** HP, death, fire cooldown, last attacker, spawn invuln. */
export class TankCombatState {
  health: number;
  alive = true;
  deathT = 0;
  fireTimer = 0;
  lastAttackerId = -1;
  /** Seconds of damage immunity after respawn. */
  invulnT = 0;

  constructor(maxHealth: number) {
    this.health = maxHealth;
  }
}

/** Owner-level multipliers applied at spawn (role cadence pads). */
export class TankBuffState {
  /** >1 = faster weapon reload / charge / energy recovery. */
  reloadSpeedMul = 1;
}

export function createTankFxState(): TankFxState {
  return { hitFlash: 0, barrelKick: 0, smokeAcc: 0, dustAcc: 0, timeSinceHit: 0 };
}
