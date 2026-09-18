// ===== Расчёт боевых выплат (валюта Кредиты CR) по итогам матча =====

export interface MatchRewardParams {
  kills: number;
  score: number;
  playerWon: boolean;
  isDraw: boolean;
  bestStreak: number;
}

export interface MatchRewardBreakdown {
  base: number;
  kills: number;
  score: number;
  win: number;
  streak: number;
  total: number;
}

export type MatchRewards = MatchRewardBreakdown;

export const REWARD_RATES = {
  base: 50,
  perKill: 20,
  scoreDivisor: 10,
  winBonus: 100,
  drawBonus: 40,
  perStreak: 15,
} as const;

export const ECONOMY_PRICES = {
  crate: 600,
  directUnlock: 1200,
} as const;

/**
 * Чистый расчёт боевой награды за матч.
 * Награждает за базовое участие, фраги, боевой вклад (очки), победу и серии убийств.
 */
export function calculateMatchRewards(params: MatchRewardParams): MatchRewardBreakdown {
  const base = REWARD_RATES.base;
  const kills = Math.max(0, params.kills) * REWARD_RATES.perKill;
  const score = Math.floor(Math.max(0, params.score) / REWARD_RATES.scoreDivisor);
  const win = params.playerWon
    ? REWARD_RATES.winBonus
    : params.isDraw
      ? REWARD_RATES.drawBonus
      : 0;
  const streak = Math.max(0, params.bestStreak) * REWARD_RATES.perStreak;

  const total = base + kills + score + win + streak;

  return {
    base,
    kills,
    score,
    win,
    streak,
    total,
  };
}
