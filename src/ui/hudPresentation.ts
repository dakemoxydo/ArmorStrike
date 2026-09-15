/** Pure presentation helpers for HUD (no game logic). */

/**
 * Discrete ammo (rail/cannon) forces React; flamethrower/isida energy is continuous (ref paint).
 */
export function ammoForcesHudRender(
  prevTurretId: string,
  nextTurretId: string,
  prevAmmo: number,
  nextAmmo: number,
): boolean {
  if (prevAmmo === nextAmmo) return false;
  const continuous = (t: string) => t === 'flamethrower' || t === 'isida';
  if (continuous(prevTurretId) && continuous(nextTurretId)) return false;
  return true;
}

export function scoreboardHpClass(hpFrac: number): 'hp-high' | 'hp-mid' | 'hp-low' {
  const frac = Math.max(0, Math.min(1, hpFrac));
  if (frac > 0.55) return 'hp-high';
  if (frac > 0.25) return 'hp-mid';
  return 'hp-low';
}

export type WeaponStatusKind = 'charging' | 'reloading' | 'empty' | null;

/**
 * «Лучевые» башни (огнемёт/изида): их «reloading» — низкий баллон энергии,
 * а не магазин. Единый предикат для HUD-текста (weaponStatusKind), звука
 * перезарядки (PlayerInputStage, G3) и live-region.
 */
export function isBeamTurretId(t: string): boolean {
  return t === 'flamethrower' || t === 'isida';
}

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
    !isBeamTurretId(input.turretId) &&
    input.magazine > 0 &&
    input.ammo <= 0;
  if (emptyMag) return 'empty';
  return null;
}

export function isLowHealth(health: number, maxHealth: number, thresholdPct = 32): boolean {
  if (maxHealth <= 0) return false;
  return (health / maxHealth) * 100 < thresholdPct;
}

/** Threshold-only state for the polite live region (M15). */
export interface LiveRegionInput {
  lowHp: boolean;
  health: number;
  reloading: boolean;
  isCharging: boolean;
  emptyMag: boolean;
  dead: boolean;
}

/**
 * Coarse state key — re-announce only when it changes. Charging and magazine
 * reload must be distinct tokens: the railgun reports `isCharging` together
 * with `reloading` (shared progress), so a combined key kept the live region
 * silent while the charge ring was visibly running.
 */
export function liveRegionKey(i: LiveRegionInput): string {
  return [
    i.lowHp ? 'low' : 'ok',
    i.isCharging ? 'charge' : i.reloading ? 'reload' : '',
    i.emptyMag ? 'empty' : '',
    i.dead ? 'dead' : '',
  ].join('|');
}

/** Announcement text for a live-region state ('' — nothing to announce). */
export function liveRegionText(i: LiveRegionInput): string {
  const parts: string[] = [];
  if (i.lowHp && !i.dead) parts.push(`Броня критична: ${Math.ceil(i.health)}`);
  if (i.isCharging) parts.push('Зарядка');
  else if (i.reloading) parts.push('Перезарядка');
  if (i.emptyMag) parts.push('Магазин пуст');
  if (i.dead) parts.push('Уничтожен. Возрождение');
  return parts.join('. ');
}
