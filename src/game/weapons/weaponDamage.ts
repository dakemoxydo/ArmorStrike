// ===== M6: resolve per-shot / per-tick damage from tank params (wave scale) =====
// Shared by RailgunWeapon + FlamethrowerWeapon so unit tests exercise shipped logic.

/**
 * Prefer owner.params.damage (catalog × damageScale for bots); fall back to weapon tuning.
 * Zero/undefined paramsDamage uses tuning (same as historical hardcoded path for unscaled owners).
 */
export function resolveWeaponDamage(
  paramsDamage: number | undefined,
  tuningFallback: number,
): number {
  if (paramsDamage != null && paramsDamage > 0) return paramsDamage;
  return tuningFallback;
}
