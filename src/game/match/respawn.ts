// ===== Pure respawn helpers =====

export interface Respawnable {
  alive: boolean;
  deathT: number;
  health: number;
  maxHealth: number;
  invulnT: number;
  throttle: number;
  steer: number;
  speed: number;
  boostEnergy: number;
  fireTimer: number;
  /** Накопленный шанс крита орудия (обнуляется при респавне, как и патроны). */
  critChance?: number;
}

/** True when dead long enough to respawn. */
export function canRespawn(tank: Respawnable, delaySec: number): boolean {
  return !tank.alive && tank.deathT >= delaySec;
}

/** Restore combat stats; position/visuals applied by caller. */
export function applyRespawnCombat(tank: Respawnable, invulnSec: number): void {
  tank.alive = true;
  tank.health = tank.maxHealth;
  tank.deathT = 0;
  tank.invulnT = invulnSec;
  tank.throttle = 0;
  tank.steer = 0;
  tank.speed = 0;
  tank.boostEnergy = 1;
  tank.fireTimer = 0;
  // Накопитель крита сгорает вместе с магазином: возрождение — новая сборка
  // боя, «раскочегаренный» до смерти шанс давал бы преимущество с первых секунд.
  tank.critChance = 0;
}
