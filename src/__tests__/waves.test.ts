import { describe, it, expect } from 'vitest';
import { botAiForWave, botsForWave, SCORE } from '../game/constants';

describe('wave scaling', () => {
  it('botsForWave растёт и капится на 5', () => {
    expect(botsForWave(1)).toBe(3);
    expect(botsForWave(2)).toBe(4);
    expect(botsForWave(3)).toBe(5);
    expect(botsForWave(10)).toBe(5);
  });

  it('botAiForWave: aimError сужается, sightRange стабилен', () => {
    const w1 = botAiForWave(1);
    const w5 = botAiForWave(5);
    expect(w1.sightRange).toBe(46);
    expect(w5.sightRange).toBe(46);
    expect(w5.aimError).toBeLessThan(w1.aimError);
    expect(w5.aimError).toBeGreaterThanOrEqual(0.05);
  });

  it('SCORE.waveBonus растёт с номером волны', () => {
    expect(SCORE.waveBonus(1)).toBe(200);
    expect(SCORE.waveBonus(2)).toBe(250);
    expect(SCORE.kill).toBe(100);
  });
});
