// ===== Чистая логика спуска рельсотрона (unit-test without Three.js) =====
// State shape mirrors RailgunState in RailgunWeapon.ts (IDLE/CHARGING/COOLDOWN).

/** FSM-состояния рельсотрона (FIRING из старой схемы свёрнут в конец CHARGING). */
export type RailgunTriggerState = 'IDLE' | 'CHARGING' | 'COOLDOWN';

/**
 * Whether setFire(active) should begin a charge this call.
 * Level-trigger in IDLE (not rising-edge only) so AI hold-fire re-arms after cooldown.
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

/**
 * Whether setFire(active) should cancel an in-progress charge (player only).
 *
 * Bots intentionally do NOT cancel: their wantsFire flickers frame-to-frame
 * (aim noise re-rolls in aiAimFire), so release-cancel would reset the 1.1s
 * charge almost every attempt. Players get full commit control instead.
 */
export function railgunShouldCancelCharge(
  active: boolean,
  state: RailgunTriggerState,
  isPlayer: boolean,
): boolean {
  return isPlayer && !active && state === 'CHARGING';
}
