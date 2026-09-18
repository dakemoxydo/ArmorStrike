// ===== Каталог боевых задач (квестов) и логика их прогресса =====
import type { MatchModeId } from '../types';

export type QuestType =
  | 'kills'
  | 'matches'
  | 'win_any'
  | 'win_tdm'
  | 'capture_points'
  | 'streak';

export interface QuestDef {
  id: string;
  title: string;
  desc: string;
  target: number;
  rewardCredits: number;
  type: QuestType;
}

export interface QuestProgress {
  id: string;
  current: number;
  target: number;
  claimed: boolean;
}

export const QUEST_CATALOG: readonly QuestDef[] = [
  {
    id: 'q_kills_5',
    title: 'Охотник на танках',
    desc: 'Уничтожьте 5 танков противника',
    target: 5,
    rewardCredits: 200,
    type: 'kills',
  },
  {
    id: 'q_kills_10',
    title: 'Грозный ликвидатор',
    desc: 'Уничтожьте 10 танков противника',
    target: 10,
    rewardCredits: 350,
    type: 'kills',
  },
  {
    id: 'q_matches_2',
    title: 'Боевое крещение',
    desc: 'Завершите 2 любых матча до конца',
    target: 2,
    rewardCredits: 150,
    type: 'matches',
  },
  {
    id: 'q_matches_4',
    title: 'Ветеран арены',
    desc: 'Завершите 4 любых матча до конца',
    target: 4,
    rewardCredits: 300,
    type: 'matches',
  },
  {
    id: 'q_win_any',
    title: 'Вкус победы',
    desc: 'Одержите 1 победу в любом режиме игры',
    target: 1,
    rewardCredits: 250,
    type: 'win_any',
  },
  {
    id: 'q_win_tdm',
    title: 'Командный триумф',
    desc: 'Одержите победу в командном бою (TDM)',
    target: 1,
    rewardCredits: 300,
    type: 'win_tdm',
  },
  {
    id: 'q_cp_capture_3',
    title: 'Контроль территории',
    desc: 'Захватите 3 контрольные точки в режиме CP',
    target: 3,
    rewardCredits: 300,
    type: 'capture_points',
  },
  {
    id: 'q_streak_3',
    title: 'Серийный хищник',
    desc: 'Совершите серию из 3 убийств в одном матче',
    target: 3,
    rewardCredits: 250,
    type: 'streak',
  },
  {
    id: 'q_streak_5',
    title: 'Неудержимый ас',
    desc: 'Совершите серию из 5 убийств в одном матче',
    target: 5,
    rewardCredits: 400,
    type: 'streak',
  },
];

export const QUEST_MAP: Readonly<Record<string, QuestDef>> = Object.freeze(
  QUEST_CATALOG.reduce((acc, q) => {
    acc[q.id] = q;
    return acc;
  }, {} as Record<string, QuestDef>),
);

export function getQuestDef(id: string): QuestDef | undefined {
  return QUEST_MAP[id];
}

/** Создаёт начальный пул из 3 уникальных квестов. */
export function createInitialQuests(): QuestProgress[] {
  return [
    { id: 'q_kills_5', current: 0, target: 5, claimed: false },
    { id: 'q_matches_2', current: 0, target: 2, claimed: false },
    { id: 'q_streak_3', current: 0, target: 3, claimed: false },
  ];
}

/** Выбирает случайный квест, которого ещё нет в активном пуле. */
export function rollNextQuest(excludeIds: readonly string[]): QuestProgress {
  const available = QUEST_CATALOG.filter((q) => !excludeIds.includes(q.id));
  const pool = available.length > 0 ? available : QUEST_CATALOG;
  const picked = pool[Math.floor(Math.random() * pool.length)];
  return {
    id: picked.id,
    current: 0,
    target: picked.target,
    claimed: false,
  };
}

export interface MatchSummaryForQuests {
  kills: number;
  playerWon: boolean;
  mode: MatchModeId;
  bestStreak: number;
  pointsCaptured?: number;
}

/**
 * Обновляет прогресс активных квестов по результатам завершённого матча.
 */
export function advanceQuestsOnMatchEnd(
  quests: readonly QuestProgress[],
  summary: MatchSummaryForQuests,
): QuestProgress[] {
  return quests.map((q) => {
    if (q.claimed || q.current >= q.target) return q;
    const def = getQuestDef(q.id);
    if (!def) return q;

    let delta = 0;
    switch (def.type) {
      case 'kills':
        delta = summary.kills;
        break;
      case 'matches':
        delta = 1;
        break;
      case 'win_any':
        delta = summary.playerWon ? 1 : 0;
        break;
      case 'win_tdm':
        delta = summary.playerWon && summary.mode === 'team_deathmatch' ? 1 : 0;
        break;
      case 'capture_points':
        delta = summary.pointsCaptured ?? 0;
        break;
      case 'streak':
        // Для стрика: если в этом матче стрик достиг или превысил цель
        if (summary.bestStreak >= def.target) {
          return { ...q, current: def.target };
        }
        return q;
    }

    const nextVal = Math.min(def.target, q.current + Math.max(0, delta));
    return { ...q, current: nextVal };
  });
}
