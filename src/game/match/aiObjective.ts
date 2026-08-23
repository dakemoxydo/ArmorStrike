// ===== Pure CP objective selection for bots (P5) =====
import type { TeamId } from './matchTypes';

export interface ObjectiveZoneView {
  id: string;
  x: number;
  z: number;
  radius: number;
  owner: Exclude<TeamId, null> | null;
  contested: boolean;
}

/**
 * ~50% of roster on objectives (design: 40–60%).
 * Deterministic by spawn index — stable across frames.
 */
export function isObjectiveDuty(botIndex: number): boolean {
  return botIndex % 2 === 0;
}

/**
 * Priority for capturers / defenders:
 * 0 contested → 1 neutral → 2 enemy-owned → 3 own (hold / re-contest).
 */
export function zonePriority(
  zone: ObjectiveZoneView,
  teamId: Exclude<TeamId, null>,
): number {
  if (zone.contested) return 0;
  if (zone.owner === null) return 1;
  if (zone.owner !== teamId) return 2;
  return 3;
}

/**
 * Pick best zone for a bot. Single pass — no per-bot array/sort allocation.
 * Tie-break mirrors the previous stable-sort order: lower priority first,
 * then nearer zone, then earlier in the zones list.
 */
export function pickObjectiveZone(
  self: { x: number; z: number; teamId: Exclude<TeamId, null> },
  zones: readonly ObjectiveZoneView[],
  stickyId: string | null = null,
  stickySlack = 28,
): ObjectiveZoneView | null {
  if (zones.length === 0) return null;

  let best: ObjectiveZoneView | null = null;
  let bestP = 0;
  let bestD = 0;
  let sticky: ObjectiveZoneView | null = null;
  let stickyP = 0;
  let stickyD = 0;

  for (let i = 0; i < zones.length; i++) {
    const z = zones[i];
    const p = zonePriority(z, self.teamId);
    const d = Math.hypot(z.x - self.x, z.z - self.z);
    if (
      best === null ||
      p < bestP ||
      (p === bestP && d < bestD)
    ) {
      best = z; bestP = p; bestD = d;
    }
    if (stickyId !== null && z.id === stickyId) {
      sticky = z; stickyP = p; stickyD = d;
    }
  }
  if (best === null) return null;

  if (sticky) {
    // Keep sticky if better priority, or same priority within slack distance.
    if (stickyP < bestP) return sticky;
    if (stickyP === bestP && stickyD <= bestD + stickySlack) return sticky;
  }
  return best;
}

/**
 * Fight while on objective if enemy is in fight range, or contesting the zone.
 */
export function shouldFightNearObjective(
  bot: { x: number; z: number },
  enemy: { x: number; z: number; alive: boolean } | null,
  zone: ObjectiveZoneView | null,
  fightRange: number,
): boolean {
  if (!enemy?.alive) return false;
  const de = Math.hypot(enemy.x - bot.x, enemy.z - bot.z);
  if (de <= fightRange) return true;
  if (zone) {
    const ez = Math.hypot(enemy.x - zone.x, enemy.z - zone.z);
    // Enemy on/near the point — break off pure pathing and engage.
    if (ez <= zone.radius + 12 && de <= fightRange * 1.85) return true;
  }
  return false;
}

/** Drive target: zone center (AI parks when close via stage/controller). */
export function moveHintForZone(zone: ObjectiveZoneView): { x: number; z: number } {
  return { x: zone.x, z: zone.z };
}
