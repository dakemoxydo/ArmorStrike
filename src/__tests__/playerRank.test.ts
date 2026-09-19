import { describe, expect, it } from 'vitest';
import { getPlayerRank, PLAYER_RANKS } from '../game/economy/playerRank';

describe('Player Rank Calculator', () => {
  it('returns Private (РЯДОВОЙ) for new recruits with 0 credits', () => {
    const rank = getPlayerRank(0, 0);
    expect(rank.title).toBe('РЯДОВОЙ');
    expect(rank.level).toBe(1);
    expect(rank.insignia).toBe('—');
  });

  it('progresses to higher ranks as credits increase', () => {
    expect(getPlayerRank(250, 0).title).toBe('ЕФРЕЙТОР');
    expect(getPlayerRank(800, 0).title).toBe('МЛ. СЕРЖАНТ');
    expect(getPlayerRank(1500, 0).title).toBe('СЕРЖАНТ');
    expect(getPlayerRank(3000, 0).title).toBe('СТАРШИНА');
    expect(getPlayerRank(6000, 0).title).toBe('ЛЕЙТЕНАНТ');
    expect(getPlayerRank(12000, 0).title).toBe('КАПИТАН');
    expect(getPlayerRank(25000, 0).title).toBe('МАЙОР');
    expect(getPlayerRank(50000, 0).title).toBe('ПОЛКОВНИК');
    expect(getPlayerRank(100000, 0).title).toBe('ГЕНЕРАЛ');
  });

  it('factors unlocked equipment into rank progression', () => {
    // 0 credits but 5 items unlocked: 5 * 300 = 1500 effective score -> СЕРЖАНТ
    const rank = getPlayerRank(0, 5);
    expect(rank.title).toBe('СЕРЖАНТ');
  });

  it('contains strictly ascending minimum credit thresholds', () => {
    for (let i = 1; i < PLAYER_RANKS.length; i++) {
      expect(PLAYER_RANKS[i].minCredits).toBeGreaterThan(PLAYER_RANKS[i - 1].minCredits);
      expect(PLAYER_RANKS[i].level).toBe(PLAYER_RANKS[i - 1].level + 1);
    }
  });
});
