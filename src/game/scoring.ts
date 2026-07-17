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
