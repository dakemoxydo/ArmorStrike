// ===== Pure win evaluation =====
import type { MatchConfig, MatchEndReason, MatchModeId, TeamId } from './matchTypes';

export interface PersonalStanding {
  id: number;
  name: string;
  kills: number;
  isPlayer: boolean;
}

export interface WinEvalInput {
  config: MatchConfig;
  matchTimeSec: number;
  personals: PersonalStanding[];
  teamKills: { alpha: number; bravo: number };
  teamScore: { alpha: number; bravo: number };
}

export interface WinEvalResult {
  reason: MatchEndReason;
  winnerName: string | null;
  winnerTeam: TeamId;
  playerWon: boolean;
}

function leadingPersonal(personals: PersonalStanding[]): PersonalStanding | null {
  if (personals.length === 0) return null;
  return personals.reduce((best, p) => (p.kills > best.kills ? p : best));
}

function teamLead(
  a: number,
  b: number,
): { team: TeamId; tied: boolean } {
  if (a > b) return { team: 'alpha', tied: false };
  if (b > a) return { team: 'bravo', tied: false };
  return { team: null, tied: true };
}

/**
 * Returns null if match continues.
 * Score win (threshold) checked first; time limit uses current leader.
 */
export function evaluateMatchEnd(input: WinEvalInput): WinEvalResult | null {
  const { config, matchTimeSec, personals, teamKills, teamScore } = input;
  const mode: MatchModeId = config.mode;

  if (mode === 'deathmatch') {
    const hit = personals.find((p) => p.kills >= config.winKills);
    if (hit) {
      return {
        reason: 'score',
        winnerName: hit.name,
        winnerTeam: null,
        playerWon: hit.isPlayer,
      };
    }
    if (matchTimeSec >= config.timeLimitSec) {
      const lead = leadingPersonal(personals);
      if (!lead) {
        return { reason: 'time', winnerName: null, winnerTeam: null, playerWon: false };
      }
      return {
        reason: 'time',
        winnerName: lead.name,
        winnerTeam: null,
        playerWon: lead.isPlayer,
      };
    }
    return null;
  }

  if (mode === 'team_deathmatch') {
    if (teamKills.alpha >= config.winTeamKills) {
      return {
        reason: 'score',
        winnerName: null,
        winnerTeam: 'alpha',
        playerWon: true,
      };
    }
    if (teamKills.bravo >= config.winTeamKills) {
      return {
        reason: 'score',
        winnerName: null,
        winnerTeam: 'bravo',
        playerWon: false,
      };
    }
    if (matchTimeSec >= config.timeLimitSec) {
      const { team, tied } = teamLead(teamKills.alpha, teamKills.bravo);
      return {
        reason: 'time',
        winnerName: null,
        winnerTeam: tied ? null : team,
        playerWon: !tied && team === 'alpha',
      };
    }
    return null;
  }

  // capture_point — score from points (P4); for now only time / future score
  if (teamScore.alpha >= config.winTeamScore) {
    return {
      reason: 'score',
      winnerName: null,
      winnerTeam: 'alpha',
      playerWon: true,
    };
  }
  if (teamScore.bravo >= config.winTeamScore) {
    return {
      reason: 'score',
      winnerName: null,
      winnerTeam: 'bravo',
      playerWon: false,
    };
  }
  if (matchTimeSec >= config.timeLimitSec) {
    const { team, tied } = teamLead(teamScore.alpha, teamScore.bravo);
    // If CP scores still 0-0, fall back to team kills as tie-break.
    if (tied) {
      const kb = teamLead(teamKills.alpha, teamKills.bravo);
      return {
        reason: 'time',
        winnerName: null,
        winnerTeam: kb.tied ? null : kb.team,
        playerWon: !kb.tied && kb.team === 'alpha',
      };
    }
    return {
      reason: 'time',
      winnerName: null,
      winnerTeam: team,
      playerWon: team === 'alpha',
    };
  }
  return null;
}
