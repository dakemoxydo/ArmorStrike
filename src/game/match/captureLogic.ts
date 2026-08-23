// ===== Pure Capture Point zone sim (neutral-first) =====
import type { TeamId } from './matchTypes';

export type CapturePointId = 'A' | 'B' | 'C';

/** Owner of a zone; null = neutral. */
export type CaptureOwner = Exclude<TeamId, null> | null;

export interface CaptureZoneState {
  id: CapturePointId;
  x: number;
  z: number;
  radius: number;
  owner: CaptureOwner;
  /** 0..1 fill toward capture or neutralize. */
  progress: number;
  /** Team currently filling the bar (null if idle). */
  actor: CaptureOwner;
  contested: boolean;
}

export const CAPTURE = {
  /** World radius of control cylinder. */
  radius: 20,
  /** Seconds of exclusive control to flip ownership step. */
  captureSec: 8,
  /** Team score gained per second per owned point. */
  scorePerSec: 1,
} as const;

export interface ZonePresence {
  alpha: number;
  bravo: number;
}

export function countPresenceInZone(
  zone: Pick<CaptureZoneState, 'x' | 'z' | 'radius'>,
  tanks: readonly { alive: boolean; teamId: TeamId; position: { x: number; z: number } }[],
): ZonePresence {
  let alpha = 0;
  let bravo = 0;
  const r2 = zone.radius * zone.radius;
  for (const t of tanks) {
    if (!t.alive || t.teamId == null) continue;
    const dx = t.position.x - zone.x;
    const dz = t.position.z - zone.z;
    if (dx * dx + dz * dz > r2) continue;
    if (t.teamId === 'alpha') alpha += 1;
    else if (t.teamId === 'bravo') bravo += 1;
  }
  return { alpha, bravo };
}

/**
 * Who advances the bar this frame (null = none / contested).
 * Neutral: capturer with exclusive presence.
 * Owned: only enemy can neutralize; allies hold without progress.
 */
export function resolveActor(
  owner: CaptureOwner,
  presence: ZonePresence,
): { actor: CaptureOwner; contested: boolean } {
  const a = presence.alpha > 0;
  const b = presence.bravo > 0;
  if (a && b) return { actor: null, contested: true };
  if (!a && !b) return { actor: null, contested: false };

  const only: CaptureOwner = a ? 'alpha' : 'bravo';
  if (owner === null) {
    // Neutral: exclusive team captures.
    return { actor: only, contested: false };
  }
  // Owned: only opposite team can neutralize.
  if (only !== owner) return { actor: only, contested: false };
  return { actor: null, contested: false };
}

/**
 * Step one zone into a mutable target (hot path: no per-frame allocation).
 * Single source of truth for capture semantics. Neutral-first:
 * progress → 1 while exclusive capturer → owner set (or cleared if
 * neutralizing). Contested / empty: freeze progress (no decay in v1).
 */
export function stepCaptureZoneInto(
  target: CaptureZoneState,
  presence: ZonePresence,
  dt: number,
  captureSec: number = CAPTURE.captureSec,
): CaptureZoneState {
  const { actor, contested } = resolveActor(target.owner, presence);

  if (contested || actor === null) {
    target.contested = contested;
    target.actor = contested ? null : target.actor;
    return target;
  }

  // Actor switched → restart bar.
  let progress = target.progress;
  if (target.actor !== actor) progress = 0;

  const rate = captureSec > 0 ? 1 / captureSec : 1;
  progress = Math.min(1, progress + dt * rate);

  target.actor = actor;
  target.contested = false;

  if (progress < 1) {
    target.progress = progress;
    return target;
  }

  // Flip ownership step.
  let owner = target.owner;
  if (owner === null) {
    owner = actor;
  } else if (actor !== owner) {
    owner = null; // neutralize first
  }

  target.owner = owner;
  target.progress = 0;
  target.actor = null;
  return target;
}

/** Pure variant: returns a fresh snapshot (HUD/minimap may hold zones immutably). */
export function stepCaptureZone(
  zone: CaptureZoneState,
  presence: ZonePresence,
  dt: number,
  captureSec: number = CAPTURE.captureSec,
): CaptureZoneState {
  return stepCaptureZoneInto({ ...zone }, presence, dt, captureSec);
}

/** Score delta this frame from owned zones. */
export function scoreDeltaFromZones(
  zones: readonly CaptureZoneState[],
  dt: number,
  scorePerSec: number = CAPTURE.scorePerSec,
): { alpha: number; bravo: number } {
  let alpha = 0;
  let bravo = 0;
  const add = scorePerSec * dt;
  for (const z of zones) {
    if (z.owner === 'alpha') alpha += add;
    else if (z.owner === 'bravo') bravo += add;
  }
  return { alpha, bravo };
}

export function createZone(
  id: CapturePointId,
  x: number,
  z: number,
  radius: number = CAPTURE.radius,
): CaptureZoneState {
  return {
    id,
    x,
    z,
    radius,
    owner: null,
    progress: 0,
    actor: null,
    contested: false,
  };
}
