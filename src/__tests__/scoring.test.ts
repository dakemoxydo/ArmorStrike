import { describe, it, expect } from 'vitest';
import { addSupportHeal, applyPlayerKillScore } from '../game/scoring';
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

describe('addSupportHeal («Изида», очки поддержки)', () => {
  it('целые HP → floor-очки, carry обнуляется', () => {
    const r = addSupportHeal({ carry: 0 }, 5);
    expect(r.earned).toBe(5);
    expect(r.carry).toBe(0);
  });

  it('дробное лечение копится: 5.5+5.5 = 11 очков, а не 5+5', () => {
    let s = { carry: 0 };
    let total = 0;
    for (let i = 0; i < 2; i++) {
      const r = addSupportHeal(s, 5.5);
      s = r;
      total += r.earned;
    }
    expect(total).toBe(11);
    expect(s.carry).toBeCloseTo(0, 10);
  });

  it('нулевое/отрицательное лечение не меняет состояние', () => {
    const s = { carry: 0.4 };
    expect(addSupportHeal(s, 0)).toEqual({ carry: 0.4, earned: 0 });
    expect(addSupportHeal(s, -3)).toEqual({ carry: 0.4, earned: 0 });
  });

  it('rate = SCORE.supportPerHp по умолчанию', () => {
    const r = addSupportHeal({ carry: 0 }, 1 / SCORE.supportPerHp);
    expect(r.earned).toBe(1);
  });
});
