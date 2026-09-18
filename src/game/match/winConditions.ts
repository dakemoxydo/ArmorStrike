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
  /** Local player's team. Defaults to alpha (offline roster). */
  playerTeam?: TeamId;
}

export interface WinEvalResult {
  reason: MatchEndReason;
  winnerName: string | null;
  winnerTeam: TeamId;
  playerWon: boolean;
}

function leadingPersonal(personals: PersonalStanding[]): { leader: PersonalStanding | null; tied: boolean } {
  // C7: строгий `>` в reduce отдавал ничью первому в ростере (= игроку
  // молча). Равный максимум теперь честно помечается tied.
  let leader: PersonalStanding | null = null;
  let tied = false;
  for (const p of personals) {
    if (!leader || p.kills > leader.kills) {
      leader = p;
      tied = false;
    } else if (p.kills === leader.kills) {
      tied = true;
    }
  }
  return { leader, tied };
}

function teamLead(
  a: number,
  b: number,
): { team: TeamId; tied: boolean } {
  if (a > b) return { team: 'alpha', tied: false };
  if (b > a) return { team: 'bravo', tied: false };
  return { team: null, tied: true };
}

function localPlayerWon(winnerTeam: TeamId, playerTeam: TeamId | undefined, draw: boolean): boolean {
  if (draw || !winnerTeam) return false;
  return winnerTeam === (playerTeam ?? 'alpha');
}

/**
 * Returns null if match continues.
 * Score win (threshold) checked first; time limit uses current leader.
 */
export function evaluateMatchEnd(input: WinEvalInput): WinEvalResult | null {
  const { config, matchTimeSec, personals, teamKills, teamScore } = input;
  const mode: MatchModeId = config.mode;
  const playerTeam = input.playerTeam ?? 'alpha';

  if (mode === 'deathmatch') {
    // C7: «кто пересёк порог» определяется максимумом килов, а не порядком
    // в personals (find брал первым id=0=игрок при одновременном добивании).
    const { leader, tied } = leadingPersonal(personals);
    if (leader && leader.kills >= config.winKills) {
      return {
        reason: 'score',
        winnerName: tied ? null : leader.name,
        winnerTeam: null,
        playerWon: !tied && leader.isPlayer,
      };
    }
    if (matchTimeSec >= config.timeLimitSec) {
      if (!leader) {
        return { reason: 'time', winnerName: null, winnerTeam: null, playerWon: false };
      }
      return {
        reason: 'time',
        winnerName: tied ? null : leader.name,
        winnerTeam: null,
        playerWon: !tied && leader.isPlayer,
      };
    }
    return null;
  }

  if (mode === 'team_deathmatch') {
    // C7: двойное пересечение порога на одном тике больше не отдаёт победу
    // Alpha автоматически — считаем как time-limit (teamLead, tie→draw).
    if (teamKills.alpha >= config.winTeamKills || teamKills.bravo >= config.winTeamKills) {
      const { team, tied: draw } = teamLead(teamKills.alpha, teamKills.bravo);
      return {
        reason: 'score',
        winnerName: null,
        winnerTeam: draw ? null : team,
        playerWon: localPlayerWon(team, playerTeam, draw),
      };
    }
    if (matchTimeSec >= config.timeLimitSec) {
      const { team, tied } = teamLead(teamKills.alpha, teamKills.bravo);
      return {
        reason: 'time',
        winnerName: null,
        winnerTeam: tied ? null : team,
        playerWon: localPlayerWon(team, playerTeam, tied),
      };
    }
    return null;
  }

  // capture_point — score from points (P4); for now only time / future score
  // C7: та же анти-смещение, что и TDM: обе команды на пороге → draw.
  if (teamScore.alpha >= config.winTeamScore || teamScore.bravo >= config.winTeamScore) {
    const { team, tied: draw } = teamLead(teamScore.alpha, teamScore.bravo);
    return {
      reason: 'score',
      winnerName: null,
      winnerTeam: draw ? null : team,
      playerWon: localPlayerWon(team, playerTeam, draw),
    };
  }
  if (matchTimeSec >= config.timeLimitSec) {
    const { team, tied } = teamLead(teamScore.alpha, teamScore.bravo);
    // Time up: leader by score wins; any score tie (not just 0-0)
    // falls back to team kills as tie-break (per GDD Capture_Point).
    if (tied) {
      const kb = teamLead(teamKills.alpha, teamKills.bravo);
      return {
        reason: 'time',
        winnerName: null,
        winnerTeam: kb.tied ? null : kb.team,
        playerWon: localPlayerWon(kb.team, playerTeam, kb.tied),
      };
    }
    return {
      reason: 'time',
      winnerName: null,
      winnerTeam: team,
      playerWon: localPlayerWon(team, playerTeam, false),
    };
  }
  return null;
}
