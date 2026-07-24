// ===== Чистая логика спуска рельсотрона (unit-test without Three.js) =====
// State shape mirrors RailgunState in RailgunWeapon.ts (IDLE/CHARGING/FIRING/COOLDOWN).

/**
 * Whether setFire(active) should begin a charge this call.
 * Level-trigger in IDLE (not rising-edge only) so AI hold-fire re-arms after cooldown.
 */
export function railgunShouldStartCharge(
  active: boolean,
  state: 'IDLE' | 'CHARGING' | 'FIRING' | 'COOLDOWN',
  alive: boolean,
): boolean {
  return active && state === 'IDLE' && alive;
}
