// ===== Runtime components of a tank (SRP slices; entity composes them) =====
import * as THREE from 'three';
import type { TankFxState } from './types';

/** Drive / pose / knockback (sim motion). Position lives on visual.group. */
export class TankMotionState {
  yaw = 0;
  turretYaw = 0;
  aimYaw = 0;
  /**
   * Текущий угол наклона ствола (тангаж, рад): > 0 — ствол задран вверх,
   * < 0 — опущен. Считается в TankAimSystem (плавно дотягивается к цели),
   * пишется в `barrelGroup.rotation.x` (со знаком по оси модели) и в aimDir.
   */
  barrelPitch = 0;
  /** Вход питч-аима: вертикальное смещение точки прицела цели относительно дула. */
  pitchDy = 0;
  /** Вход питч-аима: горизонтальная (XZ) дистанция от дула до точки прицела цели. */
  pitchDistXZ = 0;
  /** Есть ли в этом тике валидная цель для вертикальной автонаводки. */
  pitchLocked = false;
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
  /** Время с момента последнего получения урона (для ремонта вне боя). */
  timeSinceDamaged = 999;
  /**
   * Накопленный шанс крита этого орудия (доля 0…1). Мутируется DamageSystem при
   * каждом фактическом попадании: +step, после крита — 0. Сбрасывается при
   * гибели/респавне (см. applyRespawnCombat).
   */
  critChance = 0;

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
  return {
    hitFlash: 0,
    healFlash: 0,
    barrelKick: 0,
    smokeAcc: 0,
    dustAcc: 0,
    trackDist: 0,
    pitch: 0,
    pitchVel: 0,
    roll: 0,
    rollVel: 0,
    prevSpeed: 0,
  };
}
