// ===== Система обновления активного оружия танков (заряд, луч, частицы) =====
import type { TankEntity } from '../../Tank';
import type { Arena } from '../../Arena';

export const WeaponSystem = {
  update(tanks: TankEntity[], arena: Arena, dt: number) {
    for (const t of tanks) {
      if (!t.alive) continue;
      t.weapon?.update(dt, { tanks, arena });
    }
  },
};
