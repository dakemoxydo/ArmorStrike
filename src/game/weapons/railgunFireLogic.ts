// ===== Чистая логика спуска рельсотрона (unit-test without Three.js) =====
export type RailgunFireState = 'IDLE' | 'CHARGING' | 'FIRING' | 'COOLDOWN';

/**
 * Whether setFire(active) should begin a charge this call.
 * Level-trigger in IDLE (not rising-edge only) so AI hold-fire re-arms after cooldown.
 */
export function railgunShouldStartCharge(
  active: boolean,
  state: RailgunFireState,
  alive: boolean,
): boolean {
  return active && state === 'IDLE' && alive;
}
