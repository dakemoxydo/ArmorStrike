import { describe, expect, it } from 'vitest';
import {
  advanceQuestsOnMatchEnd,
  createInitialQuests,
  getQuestDef,
  rollNextQuest,
  type QuestProgress,
} from '../game/economy/questCatalog';

describe('questCatalog — боевые задачи и контракты', () => {
  it('создаёт 3 начальных квеста с нулевым прогрессом', () => {
    const quests = createInitialQuests();
    expect(quests).toHaveLength(3);
    for (const q of quests) {
      expect(q.current).toBe(0);
      expect(q.claimed).toBe(false);
      expect(getQuestDef(q.id)).toBeDefined();
    }
  });

  it('обновляет прогресс по фрагам и завершённым матчам', () => {
    const initial: QuestProgress[] = [
      { id: 'q_kills_5', current: 1, target: 5, claimed: false },
      { id: 'q_matches_2', current: 0, target: 2, claimed: false },
    ];

    const updated = advanceQuestsOnMatchEnd(initial, {
      kills: 3,
      playerWon: false,
      mode: 'deathmatch',
      bestStreak: 2,
    });

    expect(updated[0].current).toBe(4); // 1 + 3
    expect(updated[1].current).toBe(1); // 0 + 1
  });

  it('засчитывает победу в TDM только при выигрыше в режиме team_deathmatch', () => {
    const quests: QuestProgress[] = [
      { id: 'q_win_tdm', current: 0, target: 1, claimed: false },
      { id: 'q_win_any', current: 0, target: 1, claimed: false },
    ];

    // Победа в deathmatch: win_any = 1, win_tdm = 0
    const dmResult = advanceQuestsOnMatchEnd(quests, {
      kills: 5,
      playerWon: true,
      mode: 'deathmatch',
      bestStreak: 3,
    });
    expect(dmResult[0].current).toBe(0);
    expect(dmResult[1].current).toBe(1);

    // Победа в team_deathmatch: win_tdm = 1
    const tdmResult = advanceQuestsOnMatchEnd(quests, {
      kills: 5,
      playerWon: true,
      mode: 'team_deathmatch',
      bestStreak: 3,
    });
    expect(tdmResult[0].current).toBe(1);
    expect(tdmResult[1].current).toBe(1);
  });

  it('засчитывает квест на стрик при достижении порога', () => {
    const quests: QuestProgress[] = [
      { id: 'q_streak_3', current: 0, target: 3, claimed: false },
    ];

    // Стрик 2 — не дотягивает
    const res1 = advanceQuestsOnMatchEnd(quests, {
      kills: 2,
      playerWon: false,
      mode: 'deathmatch',
      bestStreak: 2,
    });
    expect(res1[0].current).toBe(0);

    // Стрик 4 — выполнено
    const res2 = advanceQuestsOnMatchEnd(quests, {
      kills: 4,
      playerWon: false,
      mode: 'deathmatch',
      bestStreak: 4,
    });
    expect(res2[0].current).toBe(3);
  });

  it('rollNextQuest исключает уже активные квесты', () => {
    const active = ['q_kills_5', 'q_matches_2', 'q_streak_3'];
    const next = rollNextQuest(active);
    expect(active.includes(next.id)).toBe(false);
    expect(next.current).toBe(0);
    expect(next.claimed).toBe(false);
  });
});
