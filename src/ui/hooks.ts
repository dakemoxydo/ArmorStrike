// ===== UI-хуки для доступа к метаданным каталогов =====
import { useMemo } from 'react';
import { getWeaponMeta } from '../core/WeaponCatalog';
import { HULLS, TURRETS } from '../core/catalog';
import type { WeaponType, HullId, TurretId } from '../core/catalog';

/** Метаданные оружия по id (лейбл/название/цвет). */
export function useWeaponMeta(id: WeaponType) {
  return useMemo(() => getWeaponMeta(id), [id]);
}

/** Человекочитаемые названия корпуса и башни. */
export function useTankMeta(hullId: HullId, turretId: TurretId) {
  return useMemo(
    () => ({ hull: HULLS[hullId], turret: TURRETS[turretId] }),
    [hullId, turretId],
  );
}
