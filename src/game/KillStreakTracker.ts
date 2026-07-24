// ===== KillStreakTracker: отслеживание серий убийств =====
// Серии: DOUBLE KILL (2), TRIPLE KILL (3), MULTI KILL (4), RAMPAGE (5+).

export interface StreakLabel {
  count: number;
  label: string;
}

const STREAK_WINDOW = 4.0; // секунд на серию

const STREAK_LABELS: Record<number, string> = {
  2: 'DOUBLE KILL',
  3: 'TRIPLE KILL',
  4: 'MULTI KILL',
  5: 'RAMPAGE',
  6: 'UNSTOPPABLE',
  7: 'GODLIKE',
};

export class KillStreakTracker {
  private killTimes: number[] = [];
  private lastStreakCount = 0;

  /**
   * Регистрирует убийство и возвращает streak label если есть серия.
   * @param currentTime Текущее игровое время (секунды)
   * @returns StreakLabel если серия >= 2, иначе null
   */
  registerKill(currentTime: number): StreakLabel | null {
    // Удаляем старые убийства вне окна
    this.killTimes = this.killTimes.filter((t) => currentTime - t < STREAK_WINDOW);
    this.killTimes.push(currentTime);

    const count = this.killTimes.length;
    if (count >= 2 && count > this.lastStreakCount) {
      this.lastStreakCount = count;
      const label = STREAK_LABELS[Math.min(count, 7)] ?? 'GODLIKE';
      return { count, label };
    }

    // Сбрасываем если серия прервалась
    if (count < 2) {
      this.lastStreakCount = 0;
    }

    return null;
  }

  /** Сброс при смерти игрока или смене раунда. */
  reset() {
    this.killTimes = [];
    this.lastStreakCount = 0;
  }
}
