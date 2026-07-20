import { describe, expect, it } from 'vitest';
import { configForMode } from '../game/match/matchConfig';
import { evaluateMatchEnd } from '../game/match/winConditions';

describe('evaluateMatchEnd', () => {
  it('DM: first to winKills wins', () => {
    const cfg = configForMode('deathmatch');
    const r = evaluateMatchEnd({
      config: cfg,
      matchTimeSec: 60,
      personals: [
        { id: 1, name: 'ВЫ', kills: 30, isPlayer: true },
        { id: 2, name: 'BOT', kills: 5, isPlayer: false },
      ],
      teamKills: { alpha: 0, bravo: 0 },
      teamScore: { alpha: 0, bravo: 0 },
    });
    expect(r?.winnerName).toBe('ВЫ');
    expect(r?.playerWon).toBe(true);
    expect(r?.reason).toBe('score');
  });

  it('DM: time limit picks leader', () => {
    const cfg = configForMode('deathmatch');
    const r = evaluateMatchEnd({
      config: cfg,
      matchTimeSec: cfg.timeLimitSec,
      personals: [
        { id: 1, name: 'ВЫ', kills: 10, isPlayer: true },
        { id: 2, name: 'BOT', kills: 12, isPlayer: false },
      ],
      teamKills: { alpha: 0, bravo: 0 },
      teamScore: { alpha: 0, bravo: 0 },
    });
    expect(r?.winnerName).toBe('BOT');
    expect(r?.playerWon).toBe(false);
    expect(r?.reason).toBe('time');
  });

  it('TDM: team kill pool', () => {
    const cfg = configForMode('team_deathmatch');
    const r = evaluateMatchEnd({
      config: cfg,
      matchTimeSec: 100,
      personals: [],
      teamKills: { alpha: cfg.winTeamKills, bravo: 40 },
      teamScore: { alpha: 0, bravo: 0 },
    });
    expect(r?.winnerTeam).toBe('alpha');
    expect(r?.playerWon).toBe(true);
  });

  it('TDM: bravo reaches winTeamKills', () => {
    const cfg = configForMode('team_deathmatch');
    const r = evaluateMatchEnd({
      config: cfg,
      matchTimeSec: 50,
      personals: [],
      teamKills: { alpha: 20, bravo: cfg.winTeamKills },
      teamScore: { alpha: 0, bravo: 0 },
    });
    expect(r?.winnerTeam).toBe('bravo');
    expect(r?.playerWon).toBe(false);
    expect(r?.reason).toBe('score');
  });

  it('TDM: time limit picks team leader', () => {
    const cfg = configForMode('team_deathmatch');
    const r = evaluateMatchEnd({
      config: cfg,
      matchTimeSec: cfg.timeLimitSec,
      personals: [],
      teamKills: { alpha: 44, bravo: 51 },
      teamScore: { alpha: 0, bravo: 0 },
    });
    expect(r?.reason).toBe('time');
    expect(r?.winnerTeam).toBe('bravo');
    expect(r?.playerWon).toBe(false);
  });

  it('TDM: continues under threshold', () => {
    const cfg = configForMode('team_deathmatch');
    const r = evaluateMatchEnd({
      config: cfg,
      matchTimeSec: 30,
      personals: [],
      teamKills: { alpha: 10, bravo: 12 },
      teamScore: { alpha: 0, bravo: 0 },
    });
    expect(r).toBeNull();
  });

  it('CP: team score 1000 wins', () => {
    const cfg = configForMode('capture_point');
    const r = evaluateMatchEnd({
      config: cfg,
      matchTimeSec: 200,
      personals: [],
      teamKills: { alpha: 3, bravo: 5 },
      teamScore: { alpha: 1000, bravo: 400 },
    });
    expect(r?.winnerTeam).toBe('alpha');
    expect(r?.playerWon).toBe(true);
    expect(r?.reason).toBe('score');
  });

  it('CP: time uses teamScore then kills as tiebreak', () => {
    const cfg = configForMode('capture_point');
    const r = evaluateMatchEnd({
      config: cfg,
      matchTimeSec: cfg.timeLimitSec,
      personals: [],
      teamKills: { alpha: 20, bravo: 5 },
      teamScore: { alpha: 100, bravo: 100 },
    });
    expect(r?.reason).toBe('time');
    expect(r?.winnerTeam).toBe('alpha');
  });

  it('continues when under threshold and under time', () => {
    const cfg = configForMode('deathmatch');
    const r = evaluateMatchEnd({
      config: cfg,
      matchTimeSec: 30,
      personals: [{ id: 1, name: 'ВЫ', kills: 5, isPlayer: true }],
      teamKills: { alpha: 0, bravo: 0 },
      teamScore: { alpha: 0, bravo: 0 },
    });
    expect(r).toBeNull();
  });
});
