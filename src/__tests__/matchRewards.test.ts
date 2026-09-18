import { describe, expect, it } from 'vitest';
import { calculateMatchRewards } from '../game/economy/matchRewards';

describe('matchRewards — расчёт боевых выплат', () => {
  it('выдаёт базовую выплату 50 CR даже при 0 фрагах и поражении', () => {
    const rewards = calculateMatchRewards({
      kills: 0,
      score: 0,
      playerWon: false,
      isDraw: false,
      bestStreak: 0,
    });

    expect(rewards.base).toBe(50);
    expect(rewards.kills).toBe(0);
    expect(rewards.score).toBe(0);
    expect(rewards.win).toBe(0);
    expect(rewards.streak).toBe(0);
    expect(rewards.total).toBe(50);
  });

  it('корректно рассчитывает полный победный матч с фрагами, очками и серией', () => {
    // 8 фрагов (=160), 450 очков (=45), победа (=100), стрик 4 (=60), база (=50)
    const rewards = calculateMatchRewards({
      kills: 8,
      score: 450,
      playerWon: true,
      isDraw: false,
      bestStreak: 4,
    });

    expect(rewards.base).toBe(50);
    expect(rewards.kills).toBe(160);
    expect(rewards.score).toBe(45);
    expect(rewards.win).toBe(100);
    expect(rewards.streak).toBe(60);
    expect(rewards.total).toBe(415);
  });

  it('начисляет бонус за ничью (40 CR)', () => {
    const rewards = calculateMatchRewards({
      kills: 3,
      score: 100,
      playerWon: false,
      isDraw: true,
      bestStreak: 2,
    });

    expect(rewards.win).toBe(40);
    expect(rewards.total).toBe(50 + 60 + 10 + 40 + 30);
  });

  it('защищает от отрицательных значений', () => {
    const rewards = calculateMatchRewards({
      kills: -5,
      score: -20,
      playerWon: false,
      isDraw: false,
      bestStreak: -1,
    });

    expect(rewards.kills).toBe(0);
    expect(rewards.score).toBe(0);
    expect(rewards.streak).toBe(0);
    expect(rewards.total).toBe(50);
  });
});
