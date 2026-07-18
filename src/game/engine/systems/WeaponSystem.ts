// ===== Система обновления активного оружия танков (заряд, луч, частицы) =====
import type { WeaponHost } from '../../tank/simPorts';
import type { CombatPeer, WeaponContext } from '../../weapons/types';
import type { Collider } from '../physics';

const _wctx: WeaponContext = { tanks: [], colliders: [] };

export const WeaponSystem = {
  update(tanks: (WeaponHost & CombatPeer)[], colliders: Collider[], dt: number) {
    _wctx.tanks = tanks;
    _wctx.colliders = colliders;
    for (const t of tanks) {
      if (!t.alive) continue;
      t.weapon?.update(dt, _wctx);
    }
  },
};
