// ===== UI-хуки для доступа к метаданным каталогов =====
import { useMemo } from 'react';
import { getWeaponMeta, type WeaponId } from '../core/WeaponCatalog';
import { HULLS, TURRETS, type HullId, type TurretId } from '../core/TankCatalog';

/** Метаданные оружия по id (лейбл/название/цвет). */
export function useWeaponMeta(id: WeaponId) {
  return useMemo(() => getWeaponMeta(id), [id]);
}

/** Человекочитаемые названия корпуса и башни. */
export function useTankMeta(hullId: HullId, turretId: TurretId) {
  return useMemo(
    () => ({ hull: HULLS[hullId], turret: TURRETS[turretId] }),
    [hullId, turretId],
  );
}
