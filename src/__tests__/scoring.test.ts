import { describe, it, expect } from 'vitest';
import { applyPlayerKillScore } from '../game/scoring';
import { SCORE } from '../game/constants';

describe('applyPlayerKillScore (M1)', () => {
  it('increments kills and score by SCORE.kill when byPlayer', () => {
    const next = applyPlayerKillScore({ kills: 0, score: 0 }, true);
    expect(next.kills).toBe(1);
    expect(next.score).toBe(SCORE.kill);
  });

  it('stacks multiple player frags', () => {
    let s = { kills: 0, score: 0 };
    s = applyPlayerKillScore(s, true);
    s = applyPlayerKillScore(s, true);
    expect(s.kills).toBe(2);
    expect(s.score).toBe(SCORE.kill * 2);
  });

  it('does not score bot-on-bot or non-player kills', () => {
    const next = applyPlayerKillScore({ kills: 3, score: 200 }, false);
    expect(next.kills).toBe(3);
    expect(next.score).toBe(200);
  });
});
