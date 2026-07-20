// ===== Pure hostile target selection for bot AI (FFA + team) =====
import { losClear, type Collider } from '../engine/physics';
import type { TeamId } from './matchTypes';
import { isAlly, isEnemy } from './teams';

export interface FocusCandidate {
  id: number;
  teamId: TeamId;
  alive: boolean;
  position: { x: number; z: number };
  vel: { x: number; y: number; z: number };
}

export interface FocusSelf {
  id: number;
  teamId: TeamId;
  position: { x: number; z: number };
}

export interface PickAiFocusOpts {
  self: FocusSelf;
  candidates: readonly FocusCandidate[];
  colliders: readonly Collider[] | Collider[];
  /** Max distance for preferred "can see" band. */
  sightRange: number;
  /**
   * Stick to this target id if still a valid enemy and not much worse than nearest.
   * Reduces thrashing in FFA free-for-all.
   */
  stickyId?: number;
  /** Max extra distance allowed for sticky vs nearest (world units). */
  stickySlack?: number;
}

export interface PickAiFocusResult {
  target: FocusCandidate | null;
  canSee: boolean;
}

/**
 * Pick hostile focus for a bot.
 * 1) Prefer nearest **visible** (LoS + sight) enemy.
 * 2) Else nearest alive enemy (hunt).
 * 3) Sticky: keep previous target if still enemy and within slack of best.
 */
export function pickAiFocus(opts: PickAiFocusOpts): PickAiFocusResult {
  const {
    self,
    candidates,
    colliders,
    sightRange,
    stickyId = -1,
    stickySlack = 14,
  } = opts;

  const hostiles = candidates.filter((c) => c.alive && isEnemy(self, c));
  if (hostiles.length === 0) return { target: null, canSee: false };

  type Scored = { c: FocusCandidate; d: number; see: boolean };
  const scored: Scored[] = hostiles.map((c) => {
    const d = Math.hypot(c.position.x - self.position.x, c.position.z - self.position.z);
    const see =
      d <= sightRange &&
      losClear(
        self.position.x,
        self.position.z,
        c.position.x,
        c.position.z,
        colliders as Collider[],
      );
    return { c, d, see };
  });

  const visible = scored.filter((s) => s.see).sort((a, b) => a.d - b.d);
  const byDist = scored.slice().sort((a, b) => a.d - b.d);
  const preferred = visible[0] ?? byDist[0];

  if (stickyId >= 0) {
    const sticky = scored.find((s) => s.c.id === stickyId);
    if (sticky) {
      // Keep sticky if still competitive with preferred.
      if (sticky.d <= preferred.d + stickySlack) {
        return { target: sticky.c, canSee: sticky.see };
      }
    }
  }

  return { target: preferred.c, canSee: preferred.see };
}

/** Bodies that block shots for this shooter (allies only — never FFA peers). */
export function allyLineBlockers<T extends { id: number; teamId: TeamId; alive: boolean }>(
  self: { id: number; teamId: TeamId },
  tanks: readonly T[],
): T[] {
  return tanks.filter((t) => t.alive && t.id !== self.id && isAlly(self, t));
}
