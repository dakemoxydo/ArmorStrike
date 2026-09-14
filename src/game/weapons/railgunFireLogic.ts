// ===== Чистая логика спуска рельсотрона (unit-test without Three.js) =====
// State shape mirrors RailgunState in RailgunWeapon.ts (IDLE/CHARGING/COOLDOWN).

/** FSM-состояния рельсотрона (FIRING из старой схемы свёрнут в конец CHARGING). */
export type RailgunTriggerState = 'IDLE' | 'CHARGING' | 'COOLDOWN';

/**
 * Whether setFire(active) should begin a charge this call.
 * Level-trigger in IDLE (not rising-edge only) so AI hold-fire re-arms after cooldown.
 * Для игрока это «клик»: отпускание триггера во время CHARGING ничего не делает —
 * начатый заряд всегда доходит до выстрела.
 * @param fireReady  base fire gate of the owner (fireTimer <= 0) — weapon must
 *                   respect it in addition to its own FSM (Tank.canFire contract).
 */
export function railgunShouldStartCharge(
  active: boolean,
  state: RailgunTriggerState,
  alive: boolean,
  fireReady: boolean,
): boolean {
  return active && state === 'IDLE' && alive && fireReady;
}

// M20: `railgunShouldCancelCharge` удалён — выстрельный заряд больше не
// отменяется отпускением триггера (ни у игрока, ни у ботов). Отмена (M18)
// требовала удержания 1.1 с и наказывала за «отпустил раньше»; теперь клик
// = безоговорочный запуск заряда, выстрел неизбежен.

/** Конфиг радиусов зарядных шаров (срез WEAPON_TUNING.railgun.chargeBalls). */
export interface ChargeBallConfig {
  electricStart: number;
  airStart: number;
  contactRadius: number;
}

/**
 * M21: радиусы двух шаров на дуле от прогресса заряда (чисто, без Three).
 * Электрический шар нарастает (п² — «накапливается»), белый «воздушный»
 * схлопывается вогнуто (1−(1−p)²: сначала быстро, к концу замедляется).
 * При p = 1 радиусы равны contactRadius — «соприкосновение» совпадает с
 * кадром выстрела FSM (неотменённый заряд всегда доходит до p = 1).
 */
export function chargeBallRadii(
  progress: number,
  cfg: ChargeBallConfig,
): { electric: number; air: number } {
  const p = Math.min(1, Math.max(0, progress));
  const electric = cfg.electricStart + (cfg.contactRadius - cfg.electricStart) * (p * p);
  const collapse = 1 - (1 - p) * (1 - p);
  const air = cfg.airStart - (cfg.airStart - cfg.contactRadius) * collapse;
  return { electric, air };
}
