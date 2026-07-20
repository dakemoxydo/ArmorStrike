import { describe, expect, it } from 'vitest';
import {
  formatKd,
  formatMatchClock,
  modeLabelRu,
  resultsHeadline,
} from '../game/match/resultsText';
import { configForMode } from '../game/match/matchConfig';

describe('resultsText / balance P6', () => {
  it('formats clock and K/D', () => {
    expect(formatMatchClock(125)).toBe('02:05');
    expect(formatMatchClock(0)).toBe('00:00');
    expect(formatKd(10, 5)).toBe('2.00');
    expect(formatKd(3, 0)).toBe('3.0');
    expect(formatKd(0, 0)).toBe('0.0');
  });

  it('mode labels', () => {
    expect(modeLabelRu('deathmatch')).toContain('НАСМЕРТЬ');
    expect(modeLabelRu('team_deathmatch')).toContain('КОМАНДНЫЙ');
    expect(modeLabelRu('capture_point')).toContain('ЗАХВАТ');
  });

  it('headline: DM win / loss / draw', () => {
    expect(resultsHeadline({
      playerWon: true, winnerName: 'ВЫ', winnerTeam: null, reason: 'score',
    })).toContain('ПОБЕДИЛИ');
    expect(resultsHeadline({
      playerWon: false, winnerName: 'BOT-1', winnerTeam: null, reason: 'score',
    })).toContain('BOT-1');
    expect(resultsHeadline({
      playerWon: false, winnerName: null, winnerTeam: null, reason: 'time',
    })).toContain('НИЧЬЯ');
  });

  it('headline: team win / loss', () => {
    expect(resultsHeadline({
      playerWon: true, winnerName: null, winnerTeam: 'alpha', reason: 'score',
    })).toContain('ALPHA');
    expect(resultsHeadline({
      playerWon: false, winnerName: null, winnerTeam: 'bravo', reason: 'time',
    })).toMatch(/BRAVO|ВРЕМЯ/);
  });

  it('balance: TDM winTeamKills is 75', () => {
    expect(configForMode('team_deathmatch').winTeamKills).toBe(75);
    expect(configForMode('deathmatch').winKills).toBe(30);
    expect(configForMode('capture_point').winTeamScore).toBe(1000);
  });
});
