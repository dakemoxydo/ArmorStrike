// ===== Pure copy helpers for match results screen (P6) =====
import type { MatchEndReason, MatchModeId, TeamId } from './matchTypes';

export function modeLabelRu(mode: MatchModeId): string {
  if (mode === 'team_deathmatch') return 'КОМАНДНЫЙ БОЙ';
  if (mode === 'capture_point') return 'ЗАХВАТ ТОЧКИ';
  return 'БОЙ НАСМЕРТЬ';
}

export function formatMatchClock(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

export function formatKd(kills: number, deaths: number): string {
  if (deaths <= 0) return kills > 0 ? kills.toFixed(1) : '0.0';
  return (kills / deaths).toFixed(2);
}

export interface ResultsHeadlineInput {
  playerWon: boolean;
  winnerName: string | null;
  winnerTeam: TeamId;
  reason: MatchEndReason;
}

/** Primary title line under mode label. */
export function resultsHeadline(input: ResultsHeadlineInput): string {
  const { playerWon, winnerName, winnerTeam, reason } = input;
  const timeNote = reason === 'time' ? ' · ВРЕМЯ' : '';

  if (!winnerName && !winnerTeam) {
    return reason === 'time' ? 'НИЧЬЯ · ВРЕМЯ' : 'НИЧЬЯ';
  }
  if (winnerTeam === 'alpha') {
    return playerWon ? `ПОБЕДА ALPHA${timeNote}` : `ПОРАЖЕНИЕ · ALPHA${timeNote}`;
  }
  if (winnerTeam === 'bravo') {
    // Local player is always Alpha in shipped roster.
    return `ПОРАЖЕНИЕ · BRAVO${timeNote}`;
  }
  // DM personal
  if (winnerName) {
    return playerWon ? `ВЫ ПОБЕДИЛИ${timeNote}` : `ПОБЕДИТЕЛЬ: ${winnerName}${timeNote}`;
  }
  return playerWon ? `ПОБЕДА${timeNote}` : `ПОРАЖЕНИЕ${timeNote}`;
}
