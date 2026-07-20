import { describe, it, expect } from 'vitest';
import { HudModel } from '../game/HudModel';
import type { RunState } from '../game/RunState';
import type { AudioFX } from '../game/audio';
import type { BotRoster } from '../game/BotRoster';
import type { PlayerController } from '../game/PlayerController';
import type { MatchRuntime } from '../game/match/MatchRuntime';
import { configForMode } from '../game/match/matchConfig';
import type { MinimapDynamic } from '../game/types';

/** Minimal stubs — exercise shipped HudModel.getHud. */
function makeHudModel() {
  const run = {
    mode: 'playing',
    paused: false,
    score: 10,
    kills: 1,
    matchTime: 12.5,
    currentHull: 'hunter',
    currentTurret: 'railgun',
  } as unknown as RunState;
  const audio = { muted: false } as unknown as AudioFX;
  const bots = { bots: [] as { tank: { alive: boolean } }[] } as unknown as BotRoster;
  const input = { scoreHeld: false } as unknown as PlayerController;
  const match = {
    config: configForMode('deathmatch'),
    teamKills: { alpha: 0, bravo: 0 },
    teamScore: { alpha: 0, bravo: 0 },
    mode: 'deathmatch',
    getCaptureZones: () => [],
  } as unknown as MatchRuntime;
  return new HudModel({ run, audio, bots, input, getMatch: () => match });
}

describe('HudModel getHud (shipped)', () => {
  it('returns snapshot fields from run state', () => {
    const model = makeHudModel();
    const a = model.getHud(null, []);
    expect(a.score).toBe(10);
    expect(a.kills).toBe(1);
    expect(a.botsAlive).toBe(0);
    expect(a.matchMode).toBe('deathmatch');
    expect(a.winTarget).toBe(30);
  });

  it('scoreboard path builds rows when Tab held', () => {
    const model = makeHudModel();
    const a = model.getHud(null, [], true);
    expect(Array.isArray(a.scoreboard)).toBe(true);
  });

  it('fillDynamics writes alive tank blips into out buffer', () => {
    const model = makeHudModel();
    const tank = {
      id: 1,
      alive: true,
      position: { x: 1, z: 2 },
      yaw: 0.5,
      turretYaw: 0.1,
      isPlayer: true,
      teamId: null,
    };
    const out: MinimapDynamic[] = [];
    model.fillDynamics([tank as never], out);
    expect(out).toHaveLength(1);
    expect(out[0].x).toBe(1);
    expect(out[0].z).toBe(2);
    expect(out[0].isPlayer).toBe(true);
    expect(out[0].relation).toBe('self');
  });

  it('fillDynamics marks team allies vs enemies', () => {
    const model = makeHudModel();
    const player = {
      id: 1, alive: true, position: { x: 0, z: 0 }, yaw: 0, turretYaw: 0,
      isPlayer: true, teamId: 'alpha' as const,
    };
    const ally = {
      id: 2, alive: true, position: { x: 1, z: 0 }, yaw: 0, turretYaw: 0,
      isPlayer: false, teamId: 'alpha' as const,
    };
    const enemy = {
      id: 3, alive: true, position: { x: 2, z: 0 }, yaw: 0, turretYaw: 0,
      isPlayer: false, teamId: 'bravo' as const,
    };
    const out: MinimapDynamic[] = [];
    model.fillDynamics([player, ally, enemy] as never, out);
    expect(out.map((d) => d.relation)).toEqual(['self', 'ally', 'enemy']);
  });

  it('TDM winTarget is team kills', () => {
    const run = {
      mode: 'playing', paused: false, score: 0, kills: 0, matchTime: 1,
      currentHull: 'hunter', currentTurret: 'railgun',
    } as unknown as RunState;
    const match = {
      config: configForMode('team_deathmatch'),
      teamKills: { alpha: 12, bravo: 9 },
      teamScore: { alpha: 0, bravo: 0 },
      mode: 'team_deathmatch',
      getCaptureZones: () => [],
    } as unknown as MatchRuntime;
    const model = new HudModel({
      run,
      audio: { muted: false } as unknown as AudioFX,
      bots: { bots: [] } as unknown as BotRoster,
      input: { scoreHeld: false } as unknown as PlayerController,
      getMatch: () => match,
    });
    const s = model.getHud(null, []);
    expect(s.matchMode).toBe('team_deathmatch');
    expect(s.winTarget).toBe(75);
    expect(s.teamKillsAlpha).toBe(12);
    expect(s.teamKillsBravo).toBe(9);
  });
});
