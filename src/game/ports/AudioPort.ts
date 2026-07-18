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
  stopChargeRailgun(hard?: boolean): void;
  startFlameLoop(): void;
  stopFlameLoop(): void;

  shoot(weaponType?: WeaponType): void;
  explosion(): void;
  hitEnemy(): void;
  hitPlayer(): void;
  reload(): void;
  click(): void;
  waveHorn(): void;
  death(): void;

  startEngine(): void;
  setEngine(ratio: number, boost?: boolean): void;
  stopEngine(): void;
}
