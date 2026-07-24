// ===== Типы конвейера симуляции =====
// FrameContext — минимальные данные кадра; стабильные зависимости
// инжектируются в конструкторы стадий (ISP на уровне рантайма).
import type { TankEntity } from '../../Tank';
import type { GameEvent } from '../../types';
import type { Nameplate } from '../../nameplate';

/** Shared mutable scalar (same object as GameSimulation cell — mid-step external writes stay visible). */
export type ScalarCell<T> = { value: T };

/**
 * Минимальный контекст кадра (per-frame data).
 * Стабильные зависимости (arena, effects, audio, …) — в конструкторах стадий.
 */
export interface FrameContext {
  dt: number;
  emit: (e: GameEvent) => void;
  player: TankEntity;
  tanks: TankEntity[];
  /** Shared cell with GameSimulation.deathT. */
  deathT: ScalarCell<number>;
  /** Shared cell with GameSimulation.prevReloading. */
  prevReloading: ScalarCell<boolean>;
  /** Единый переход в game over (mode + events). */
  requestGameOver(): void;
}

export interface SimSystem {
  readonly name: string;
  update(ctx: FrameContext): void;
}

export type NameplateMap = Map<number, { plate: Nameplate; color: number }>;
