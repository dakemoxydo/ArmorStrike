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
 * Pick best zone for an objective bot. Sticky keeps same id if still competitive.
 */
export function pickObjectiveZone(
  self: { x: number; z: number; teamId: Exclude<TeamId, null> },
  zones: readonly ObjectiveZoneView[],
  stickyId: string | null = null,
  stickySlack = 28,
): ObjectiveZoneView | null {
  if (zones.length === 0) return null;

  type Scored = { z: ObjectiveZoneView; p: number; d: number };
  const scored: Scored[] = zones.map((z) => ({
    z,
    p: zonePriority(z, self.teamId),
    d: Math.hypot(z.x - self.x, z.z - self.z),
  }));
  scored.sort((a, b) => a.p - b.p || a.d - b.d);
  const best = scored[0];

  if (stickyId) {
    const sticky = scored.find((s) => s.z.id === stickyId);
    if (sticky) {
      // Keep sticky if better priority, or same priority within slack distance.
      if (sticky.p < best.p) return sticky.z;
      if (sticky.p === best.p && sticky.d <= best.d + stickySlack) return sticky.z;
    }
  }
  return best.z;
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
