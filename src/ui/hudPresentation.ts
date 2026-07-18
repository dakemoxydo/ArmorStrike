/** Pure presentation helpers for HUD (no game logic). */

/**
 * Discrete ammo (rail/cannon) forces React; flamethrower energy is continuous (ref paint).
 */
export function ammoForcesHudRender(
  prevTurretId: string,
  nextTurretId: string,
  prevAmmo: number,
  nextAmmo: number,
): boolean {
  if (prevAmmo === nextAmmo) return false;
  if (prevTurretId === 'flamethrower' && nextTurretId === 'flamethrower') return false;
  return true;
}

export function scoreboardHpClass(hpFrac: number): 'hp-high' | 'hp-mid' | 'hp-low' {
  const frac = Math.max(0, Math.min(1, hpFrac));
  if (frac > 0.55) return 'hp-high';
  if (frac > 0.25) return 'hp-mid';
  return 'hp-low';
}

export type WeaponStatusKind = 'charging' | 'reloading' | 'empty' | null;

export function weaponStatusKind(input: {
  isCharging?: boolean;
  reloading?: boolean;
  turretId: string;
  ammo: number;
  magazine: number;
}): WeaponStatusKind {
  if (input.isCharging) return 'charging';
  if (input.reloading) return 'reloading';
  const emptyMag =
    input.turretId !== 'flamethrower' &&
    input.magazine > 0 &&
    input.ammo <= 0;
  if (emptyMag) return 'empty';
  return null;
}

export function isLowHealth(health: number, maxHealth: number, thresholdPct = 32): boolean {
  if (maxHealth <= 0) return false;
  return (health / maxHealth) * 100 < thresholdPct;
}
