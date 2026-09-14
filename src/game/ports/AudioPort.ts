// ===== Порт звука: вызывающие зависят от контракта, не от WebAudio-реализации =====
import type { WeaponType } from '../../core/catalog';

/**
 * Узкий публичный контракт процедурного аудио.
 * `AudioFX` — единственная реализация; тесты/заглушки могут подменять порт.
 */
/**
 * Opaque handle of ONE railgun charge voice. Several charges may overlap
 * (player + bot snipers in one frame); every handle only ever touches its
 * own session — a shared "current charge" used to cut a sibling's whine.
 */
export interface RailgunChargeHandle {
  readonly id: number;
}

export interface AudioPort {
  muted: boolean;
  ensure(): void;
  setMuted(m: boolean): void;

  chargeRailgun(duration?: number): RailgunChargeHandle;
  /** Live pitch boost for that charge voice (0..1 charge progress). */
  setChargeRailgunPitch(handle: RailgunChargeHandle, progress: number): void;
  /** Per-pierce ping for railgun penetration feedback (0-based hit index). */
  railgunPierce(index: number): void;
  /** Stop exactly that charge voice (hard cut on fire, soft fade on cancel). */
  stopChargeRailgun(handle: RailgunChargeHandle, hard?: boolean): void;
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
