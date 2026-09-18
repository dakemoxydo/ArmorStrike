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
/** Undo death-pose greying / hide ring (shared with network revive). */
export function restoreRespawnVisuals(tank: {
  visual: {
    bodyMats: Array<{ color: { setHex: (n: number) => void }; emissive: { setScalar: (n: number) => void } }>;
    bodyBaseColors: number[];
    ring: { visible: boolean };
    barrelGroup: { rotation: { x: number } };
  };
}): void {
  const { bodyMats, bodyBaseColors } = tank.visual;
  for (let i = 0; i < bodyMats.length; i++) {
    bodyMats[i].color.setHex(bodyBaseColors[i] ?? 0xffffff);
    bodyMats[i].emissive.setScalar(0);
  }
  tank.visual.ring.visible = true;
  tank.visual.barrelGroup.rotation.x = 0;
}

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
