import { describe, expect, it } from 'vitest';
import { isAlly, isEnemy, isTeamMode } from '../game/match/teams';
import { rosterTeamSides } from '../game/match/rosterSpawn';
import { ALPHA_SPAWN_POINTS, BRAVO_SPAWN_POINTS } from '../game/match/spawnPoints';
import { configForMode } from '../game/match/matchConfig';

describe('isEnemy / isAlly', () => {
  it('FFA: everyone else is enemy', () => {
    const a = { id: 1, teamId: null as null };
    const b = { id: 2, teamId: null as null };
    expect(isEnemy(a, b)).toBe(true);
    expect(isAlly(a, b)).toBe(false);
    expect(isEnemy(a, a)).toBe(false);
    expect(isAlly(a, a)).toBe(true);
  });

  it('team modes: same team ally, opposite enemy', () => {
    const a = { id: 1, teamId: 'alpha' as const };
    const b = { id: 2, teamId: 'alpha' as const };
    const c = { id: 3, teamId: 'bravo' as const };
    expect(isEnemy(a, b)).toBe(false);
    expect(isAlly(a, b)).toBe(true);
    expect(isEnemy(a, c)).toBe(true);
    expect(isAlly(a, c)).toBe(false);
  });

  it('isTeamMode covers TDM and CP only', () => {
    expect(isTeamMode('deathmatch')).toBe(false);
    expect(isTeamMode('team_deathmatch')).toBe(true);
    expect(isTeamMode('capture_point')).toBe(true);
  });

  it('configForMode TDM has 5v5 and winTeamKills 50 (P6 balance pass)', () => {
    const cfg = configForMode('team_deathmatch');
    expect(cfg.mode).toBe('team_deathmatch');
    expect(cfg.teamSize).toBe(5);
    expect(cfg.winTeamKills).toBe(50);
    expect(cfg.timeLimitSec).toBe(12 * 60);
  });

  it('rosterTeamSides: Bravo player gets Bravo allies and Alpha enemies', () => {
    const bravo = rosterTeamSides('bravo');
    expect(bravo.allyTeam).toBe('bravo');
    expect(bravo.enemyTeam).toBe('alpha');
    expect(bravo.allySpawns).toBe(BRAVO_SPAWN_POINTS);
    expect(bravo.enemySpawns).toBe(ALPHA_SPAWN_POINTS);
    const alpha = rosterTeamSides('alpha');
    expect(alpha.allyTeam).toBe('alpha');
    expect(alpha.allySpawns).toBe(ALPHA_SPAWN_POINTS);
  });
});
