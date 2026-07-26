import { describe, it, expect } from 'vitest';
import { SCORE } from '../game/constants';
import { BOT_NORMAL } from '../game/match/matchConfig';

describe('match bot / score constants (post-wave)', () => {
  it('BOT_NORMAL: fixed sight and aim (no wave ramp)', () => {
    expect(BOT_NORMAL.sightRange).toBe(46);
    expect(BOT_NORMAL.aimError).toBe(0.1);
    expect(BOT_NORMAL.healthScale).toBe(1);
    expect(BOT_NORMAL.damageScale).toBe(1);
  });

  it('SCORE.kill is fixed', () => {
    expect(SCORE.kill).toBe(100);
  });
});
