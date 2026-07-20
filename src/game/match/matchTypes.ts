// ===== Типы матчевого слоя (режимы, команды, результат) =====

export type MatchModeId = 'deathmatch' | 'team_deathmatch' | 'capture_point';

/** FFA: null. Team modes: alpha (player side) | bravo. */
export type TeamId = 'alpha' | 'bravo' | null;

export type MatchEndReason = 'score' | 'time';

export interface MatchConfig {
  mode: MatchModeId;
  /** DM: first personal kills to this. */
  winKills: number;
  /** TDM: first team kill pool to this. */
  winTeamKills: number;
  /** CP: first team score to this (capture points feed score). */
  winTeamScore: number;
  /** Soft end; winner by leading score/kills. */
  timeLimitSec: number;
  respawnDelaySec: number;
  spawnInvulnSec: number;
  /** DM: bots only (player separate). */
  dmBotCount: number;
  /** TDM/CP: players per team (includes human on alpha). */
  teamSize: number;
}

export interface MatchResult {
  reason: MatchEndReason;
  mode: MatchModeId;
  /** DM: name of winner tank. */
  winnerName: string | null;
  /** Team modes: winning team (null on true draw — rare). */
  winnerTeam: TeamId;
  /** True if local player is on the winning side / is the winner. */
  playerWon: boolean;
  playerKills: number;
  playerDeaths: number;
  playerScore: number;
  teamKills: { alpha: number; bravo: number };
  teamScore: { alpha: number; bravo: number };
  matchTimeSec: number;
}

export interface TankMatchStats {
  kills: number;
  deaths: number;
}
