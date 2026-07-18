// ===== Система обновления активного оружия танков (заряд, луч, частицы) =====
import type { WeaponHost } from '../../tank/simPorts';
import type { CombatPeer, WeaponContext } from '../../weapons/types';
import type { Arena } from '../../Arena';

const _wctx: WeaponContext = { tanks: [], arena: null! };

export const WeaponSystem = {
  update(tanks: (WeaponHost & CombatPeer)[], arena: Arena, dt: number) {
    _wctx.tanks = tanks;
    _wctx.arena = arena;
    for (const t of tanks) {
      if (!t.alive) continue;
      t.weapon?.update(dt, _wctx);
    }
  },
};
