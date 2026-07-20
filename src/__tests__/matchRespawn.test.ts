import { describe, expect, it } from 'vitest';
import { applyRespawnCombat, canRespawn } from '../game/match/respawn';

describe('respawn helpers', () => {
  it('canRespawn only after delay while dead', () => {
    const t = {
      alive: false,
      deathT: 3.9,
      health: 0,
      maxHealth: 100,
      invulnT: 0,
      throttle: 0,
      steer: 0,
      speed: 0,
      boostEnergy: 0,
      fireTimer: 0,
    };
    expect(canRespawn(t, 4)).toBe(false);
    t.deathT = 4;
    expect(canRespawn(t, 4)).toBe(true);
    t.alive = true;
    expect(canRespawn(t, 4)).toBe(false);
  });

  it('applyRespawnCombat restores HP and invuln', () => {
    const t = {
      alive: false,
      deathT: 5,
      health: 0,
      maxHealth: 120,
      invulnT: 0,
      throttle: 1,
      steer: 1,
      speed: 9,
      boostEnergy: 0.1,
      fireTimer: 2,
    };
    applyRespawnCombat(t, 2);
    expect(t.alive).toBe(true);
    expect(t.health).toBe(120);
    expect(t.deathT).toBe(0);
    expect(t.invulnT).toBe(2);
    expect(t.throttle).toBe(0);
    expect(t.boostEnergy).toBe(1);
  });
});
