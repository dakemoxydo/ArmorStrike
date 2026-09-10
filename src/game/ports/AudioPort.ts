// ===== Порт звука: вызывающие зависят от контракта, не от WebAudio-реализации =====
import type { WeaponType } from '../../core/catalog';

/**
 * Узкий публичный контракт процедурного аудио.
 * `AudioFX` — единственная реализация; тесты/заглушки могут подменять порт.
 */
export interface AudioPort {
  muted: boolean;
  ensure(): void;
  setMuted(m: boolean): void;

  chargeRailgun(duration?: number): void;
  /** Live pitch boost for the active charge voice (0..1 charge progress). */
  setChargeRailgunPitch(progress: number): void;
  /** Per-pierce ping for railgun penetration feedback (0-based hit index). */
  railgunPierce(index: number): void;
  stopChargeRailgun(hard?: boolean): void;
  startFlameLoop(): void;
  stopFlameLoop(): void;

  shoot(weaponType?: WeaponType): void;
  explosion(): void;
  hitEnemy(): void;
  hitPlayer(): void;
  reload(): void;
  click(): void;
  death(): void;

  startEngine(): void;
  setEngine(ratio: number, boost?: boolean): void;
  stopEngine(): void;

  /** Full teardown: stop voices, clear timers, close the context. */
  dispose(): void;
}
