// ===== Чистая логика скоринга убийств (M1) =====
import { SCORE } from './constants';

export interface KillScoreState {
  kills: number;
  score: number;
}

/** Apply player frag to run stats. No-op if not by player. */
export function applyPlayerKillScore(state: KillScoreState, byPlayer: boolean): KillScoreState {
  if (!byPlayer) return state;
  return {
    kills: state.kills + 1,
    score: state.score + SCORE.kill,
  };
}

/**
 * «Изида»: очки поддержки за фактическое лечение союзников.
 * Дробные HP копятся в `carry` (лечение тиками ~5.5 HP), очка списываются целыми —
 * без переноса остатка игрок терял бы ~1 очко каждый тик.
 * Возвращает НОВОЕ состояние; начислять `earned` вызывающему (run.score += earned).
 */
export interface SupportScoreState {
  carry: number;
  /** Очки, заработанные этим вызовом (0, если остатка не хватило на целое). */
  earned: number;
}

export function addSupportHeal(
  state: { carry: number },
  healedHp: number,
  rate: number = SCORE.supportPerHp,
): SupportScoreState {
  if (!(healedHp > 0) || !(rate > 0)) return { carry: state.carry, earned: 0 };
  const total = state.carry + healedHp * rate;
  const earned = Math.floor(total);
  return { carry: total - earned, earned };
}
