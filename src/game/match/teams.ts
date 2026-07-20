// ===== Team / enemy helpers (pure) =====
import type { TeamId } from './matchTypes';

export interface TeamTagged {
  id: number;
  teamId: TeamId;
  alive?: boolean;
}

/** True when a may damage / engage b (and not self). */
export function isEnemy(a: TeamTagged, b: TeamTagged): boolean {
  if (a.id === b.id) return false;
  // Both teamed → hostile only if different teams.
  if (a.teamId !== null && b.teamId !== null) return a.teamId !== b.teamId;
  // Any FFA (null team) participant is hostile to everyone else.
  return true;
}

export function isAlly(a: TeamTagged, b: TeamTagged): boolean {
  if (a.id === b.id) return true;
  if (a.teamId === null || b.teamId === null) return false;
  return a.teamId === b.teamId;
}

/** Team modes disable friendly fire; FFA has no allies. */
export function friendlyFireEnabled(modeTeamAware: boolean): boolean {
  return !modeTeamAware;
}

export function isTeamMode(mode: string): boolean {
  return mode === 'team_deathmatch' || mode === 'capture_point';
}
