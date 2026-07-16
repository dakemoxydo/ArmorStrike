import { describe, it, expect } from 'vitest';
import { botStatsForWave, botsForWave, SCORE } from '../game/constants';

describe('wave scaling', () => {
  it('botsForWave растёт и капится на 5', () => {
    expect(botsForWave(1)).toBe(3);
    expect(botsForWave(2)).toBe(4);
    expect(botsForWave(3)).toBe(5);
    expect(botsForWave(10)).toBe(5);
  });

  it('botStatsForWave усиливает HP/урон и сужает aimError', () => {
    const w1 = botStatsForWave(1);
    const w5 = botStatsForWave(5);
    expect(w5.maxHealth).toBeGreaterThan(w1.maxHealth);
    expect(w5.damage).toBeGreaterThan(w1.damage);
    expect(w5.aimError).toBeLessThan(w1.aimError);
    expect(w5.shotCooldown).toBeLessThanOrEqual(w1.shotCooldown);
    expect(w5.speed).toBeLessThanOrEqual(13.5);
  });

  it('SCORE.waveBonus растёт с номером волны', () => {
    expect(SCORE.waveBonus(1)).toBe(200);
    expect(SCORE.waveBonus(2)).toBe(250);
    expect(SCORE.kill).toBe(100);
  });
});
