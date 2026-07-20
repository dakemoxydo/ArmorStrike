// ===== Runtime components of a tank (SRP slices; entity composes them) =====
import * as THREE from 'three';
import type { TankFxState } from './types';

/** Snapshot of combat params while a wave buff is active. */
export interface BuffBaseSnapshot {
  damage: number;
  speed: number;
  reverseSpeed: number;
  turnSpeed: number;
  shotCooldown: number;
}

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

/** Temporary wave-buff multipliers and base-param snapshot. */
export class TankBuffState {
  /** Wave buff: multiply BOOST.drain (1 = normal). */
  boostDrainMul = 1;
  /** Wave buff: multiply BOOST.recharge (1 = normal). */
  boostRechargeMul = 1;
  /** Wave buff: >1 = faster weapon reload / charge / energy recovery. */
  reloadSpeedMul = 1;
  buffBase: BuffBaseSnapshot | null = null;
}

export function createTankFxState(): TankFxState {
  return { hitFlash: 0, barrelKick: 0, smokeAcc: 0, dustAcc: 0, timeSinceHit: 0 };
}
