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
 *
 * Single pass over candidates; LoS is raycast lazily — for the running best
 * visible candidate, plus at most once more for the sticky target (was:
 * raycast to every hostile + two sorts + three intermediate arrays per bot
 * per frame).
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

  let nearest: FocusCandidate | null = null;
  let nearestD = Infinity;
  let visible: FocusCandidate | null = null;
  let visibleD = Infinity;
  let sticky: FocusCandidate | null = null;
  let stickyD = Infinity;
  // Own LoS fact for the sticky target — returned as canSee even when sticky
  // is NOT the nearest visible one (contract: canSee = "LoS to the returned
  // target", not "target is the nearest visible").
  let stickySee = false;

  for (const c of candidates) {
    if (!c.alive || !isEnemy(self, c)) continue;
    const d = Math.hypot(c.position.x - self.position.x, c.position.z - self.position.z);
    if (d < nearestD) {
      nearestD = d;
      nearest = c;
    }
    // Lazy LoS gate first: only raycast the running best visible target.
    const inSight = d <= sightRange && d < visibleD;
    const see =
      inSight &&
      losClear(self.position.x, self.position.z, c.position.x, c.position.z, colliders as Collider[]);
    if (see) {
      visibleD = d;
      visible = c;
    }
    if (c.id === stickyId) {
      sticky = c;
      stickyD = d;
      // LoS for sticky is evaluated independently of the visible-best gate,
      // but reuses a raycast already made for this candidate above.
      stickySee = see || (d <= sightRange &&
        losClear(self.position.x, self.position.z, c.position.x, c.position.z, colliders as Collider[]));
    }
  }

  const preferred = visible ?? nearest;
  if (!preferred) return { target: null, canSee: false };

  if (sticky) {
    const preferredD = visible ? visibleD : nearestD;
    // Keep sticky if still competitive with preferred.
    if (stickyD <= preferredD + stickySlack) {
      return { target: sticky, canSee: stickySee };
    }
  }

  return { target: preferred, canSee: visible === preferred };
}

/** Single source of truth for "t blocks this shooter's line of fire". */
function isLineBlocker(
  self: { id: number; teamId: TeamId },
  t: { id: number; teamId: TeamId; alive: boolean },
): boolean {
  return t.alive && t.id !== self.id && isAlly(self, t);
}

/** Bodies that block shots for this shooter (allies only — never FFA peers). */
export function allyLineBlockers<T extends { id: number; teamId: TeamId; alive: boolean }>(
  self: { id: number; teamId: TeamId },
  tanks: readonly T[],
  /** Pass a reusable array to avoid per-call allocation in hot loops. */
  out?: T[],
): T[] {
  if (!out) return tanks.filter((t) => isLineBlocker(self, t));
  out.length = 0;
  for (const t of tanks) {
    if (isLineBlocker(self, t)) out.push(t);
  }
  return out;
}
