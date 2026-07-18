import { describe, it, expect } from 'vitest';
import { HudModel } from '../game/HudModel';
import type { RunState } from '../game/RunState';
import type { AudioFX } from '../game/audio';
import type { WaveManager } from '../game/WaveManager';
import type { PlayerController } from '../game/PlayerController';

/** Minimal stubs — exercise shipped HudModel.getHud. */
function makeHudModel() {
  const run = {
    mode: 'playing',
    paused: false,
    intermission: false,
    score: 10,
    kills: 1,
    matchTime: 12.5,
    currentHull: 'hunter',
    currentTurret: 'railgun',
  } as unknown as RunState;
  const audio = { muted: false } as unknown as AudioFX;
  const waves = { wave: 2, bots: [] as { tank: { alive: boolean } }[] } as unknown as WaveManager;
  const input = { scoreHeld: false } as unknown as PlayerController;
  return new HudModel({ run, audio, waves, input });
}

describe('HudModel getHud (shipped)', () => {
  it('returns snapshot fields from run state', () => {
    const model = makeHudModel();
    const a = model.getHud(null, []);
    expect(a.score).toBe(10);
    expect(a.wave).toBe(2);
    expect(a.botsAlive).toBe(0);
    expect(a.intermission).toBe(false);
  });

  it('scoreboard path builds rows when Tab held', () => {
    const model = makeHudModel();
    const a = model.getHud(null, [], true);
    expect(Array.isArray(a.scoreboard)).toBe(true);
  });

  it('fillDynamics writes alive tank blips into out buffer', () => {
    const model = makeHudModel();
    const tank = {
      alive: true,
      position: { x: 1, z: 2 },
      yaw: 0.5,
      turretYaw: 0.1,
      isPlayer: true,
    };
    const out: { x: number; z: number; yaw: number; turret: number; isPlayer: boolean }[] = [];
    model.fillDynamics([tank as never], out);
    expect(out).toHaveLength(1);
    expect(out[0].x).toBe(1);
    expect(out[0].z).toBe(2);
    expect(out[0].isPlayer).toBe(true);
  });
});
