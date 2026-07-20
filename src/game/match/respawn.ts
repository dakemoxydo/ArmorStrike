// ===== Pure respawn helpers =====
import type { MatchConfig } from './matchTypes';

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
}

export function respawnDelayOf(cfg: MatchConfig): number {
  return cfg.respawnDelaySec;
}

export function invulnOf(cfg: MatchConfig): number {
  return cfg.spawnInvulnSec;
}
