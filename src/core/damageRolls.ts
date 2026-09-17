// ===== Чистые броски урона: сопротивление корпуса и накопление крита =====
// Вынесено из DamageSystem, чтобы (а) формулы были единым источником истины для
// оружия, которое минует DamageSystem («Изида» крутит крит на лечении), и
// (б) их можно было тестировать без арены/хуков.
import type { CritTuning, DamageType } from './catalogTypes';

/**
 * Границы множителя сопротивления. Нужны не для «красивого баланса», а как
 * страховка от опечатки в каталоге: корпус с resist = 0.95 не должен становиться
 * неуязвимым, а resist = −0.9 — мгновенно испаряться.
 */
export const RESIST_MULTIPLIER_MIN = 0.65;
export const RESIST_MULTIPLIER_MAX = 1.35;

function clamp01(x: number, lo: number, hi: number): number {
  return x < lo ? lo : x > hi ? hi : x;
}

/**
 * Доля входящего урона после сопротивления корпуса цели (1 = без изменений).
 *
 * Резист положительный = поглощение (0.15 → наносится 85%), отрицательный =
 * уязвимость контр-пика (−0.35 → наносится 135%). Отсутствие типа/таблицы
 * (тестовые танки, будущие источники урона без башни) = 1.
 */
export function resistMultiplier(
  resist: Partial<Record<DamageType, number>> | undefined,
  type: DamageType | undefined,
): number {
  if (!resist || type === undefined) return 1;
  const r = resist[type];
  if (r === undefined || !Number.isFinite(r)) return 1;
  return clamp01(1 - r, RESIST_MULTIPLIER_MIN, RESIST_MULTIPLIER_MAX);
}

/** Результат броска крита: был ли крит + новое значение накопителя стрелка. */
export interface CritRoll {
  crit: boolean;
  nextChance: number;
}

/**
 * Бросок крита по кривой накопления (Tanki-style):
 * шанс стартует с нуля — первый выстрел критическим не бывает; каждое попадание
 * добавляет `step` до потолка `max`; после крита накопитель обнуляется.
 *
 * `chance` — текущее значение накопителя стрелка (мутируется вызывающим).
 * `rng` внедряется ради детерминированных тестов (в проде — Math.random).
 */
export function rollCrit(
  chance: number,
  tuning: CritTuning | undefined,
  rng: () => number,
): CritRoll {
  if (!tuning) return { crit: false, nextChance: 0 };
  const cur = Number.isFinite(chance) ? clamp01(chance, 0, tuning.max) : 0;
  const crit = rng() < cur;
  return {
    crit,
    nextChance: crit ? 0 : Math.min(tuning.max, cur + tuning.step),
  };
}
