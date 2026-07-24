// ===== TimeScale: hit-stop (freeze) + kill slow-mo =====
// Управляет множителем dt для драматических моментов боя.

export class TimeScale {
  /** Текущий множитель времени (1 = нормально). */
  private scale = 1;
  /** Оставшееся время hit-stop (секунды реального времени). */
  private freezeT = 0;
  /** Оставшееся время slow-mo (секунды реального времени). */
  private slowT = 0;
  /** Целевой масштаб для slow-mo. */
  private slowScale = 0.4;

  /**
   * Hit-stop: полная заморозка на 30-50мс.
   * Вызывается при убийстве для "удара".
   */
  hitStop(durationSec = 0.04) {
    this.freezeT = Math.max(this.freezeT, durationSec);
  }

  /**
   * Kill slow-mo: замедление времени на 0.4x.
   * Вызывается при убийстве игроком.
   */
  killSlowMo(durationSec = 0.6, scale = 0.4) {
    this.slowT = Math.max(this.slowT, durationSec);
    this.slowScale = scale;
  }

  /**
   * Обновляет состояние и возвращает множитель dt для текущего кадра.
   * @param realDt Реальный dt кадра (не масштабированный)
   * @returns Масштабированный dt для симуляции
   */
  update(realDt: number): number {
    // Hit-stop имеет приоритет
    if (this.freezeT > 0) {
      this.freezeT -= realDt;
      return 0; // Полная заморозка
    }

    // Slow-mo
    if (this.slowT > 0) {
      this.slowT -= realDt;
      // Плавный выход из slow-mo в последние 0.15с
      const fadeZone = 0.15;
      if (this.slowT < fadeZone) {
        const k = this.slowT / fadeZone;
        this.scale = this.slowScale + (1 - this.slowScale) * (1 - k);
      } else {
        this.scale = this.slowScale;
      }
      return realDt * this.scale;
    }

    this.scale = 1;
    return realDt;
  }

  /** Сброс при смене режима / рестарте. */
  reset() {
    this.scale = 1;
    this.freezeT = 0;
    this.slowT = 0;
  }

  /** Текущий масштаб (для UI / отладки). */
  get current(): number {
    return this.freezeT > 0 ? 0 : this.scale;
  }
}
