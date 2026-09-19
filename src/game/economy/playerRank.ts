// ===== Воинские звания игрока (шкала прогресса по кредитам и опыту) =====

export interface PlayerRank {
  readonly id: string;
  readonly title: string;
  readonly level: number;
  readonly minCredits: number;
  readonly insignia: string; // текстовый значок звания (шевроны / звёзды)
}

export const PLAYER_RANKS: readonly PlayerRank[] = [
  { id: 'private', title: 'РЯДОВОЙ', level: 1, minCredits: 0, insignia: '—' },
  { id: 'corporal', title: 'ЕФРЕЙТОР', level: 2, minCredits: 200, insignia: 'v' },
  { id: 'junior_sergeant', title: 'МЛ. СЕРЖАНТ', level: 3, minCredits: 600, insignia: 'vv' },
  { id: 'sergeant', title: 'СЕРЖАНТ', level: 4, minCredits: 1200, insignia: 'vvv' },
  { id: 'master_sergeant', title: 'СТАРШИНА', level: 5, minCredits: 2500, insignia: '▲' },
  { id: 'lieutenant', title: 'ЛЕЙТЕНАНТ', level: 6, minCredits: 5000, insignia: '★' },
  { id: 'captain', title: 'КАПИТАН', level: 7, minCredits: 10000, insignia: '★★' },
  { id: 'major', title: 'МАЙОР', level: 8, minCredits: 20000, insignia: '★★★' },
  { id: 'colonel', title: 'ПОЛКОВНИК', level: 9, minCredits: 40000, insignia: '✦✦' },
  { id: 'general', title: 'ГЕНЕРАЛ', level: 10, minCredits: 75000, insignia: '✪' },
];

/**
 * Рассчитывает воинское звание игрока на основе баланса заработанных кредитов
 * и открытых единиц вооружения.
 */
export function getPlayerRank(credits: number, unlockedItemsCount = 0): PlayerRank {
  const effectiveScore = Math.max(0, credits) + unlockedItemsCount * 300;
  let currentRank = PLAYER_RANKS[0];

  for (const rank of PLAYER_RANKS) {
    if (effectiveScore >= rank.minCredits) {
      currentRank = rank;
    } else {
      break;
    }
  }

  return currentRank;
}
