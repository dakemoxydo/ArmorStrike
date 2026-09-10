// ===== Система обновления активного оружия танков (заряд, луч, частицы) =====
import type { WeaponHost } from '../../tank/simPorts';
import type { CombatPeer, WeaponContext } from '../../weapons/types';
import type { Collider } from '../physics';

/**
 * Per-frame snapshot passed to weapons. Rebuilt each call so a weapon cannot
 * observe stale references from a previous frame or concurrent caller.
 */
export const WeaponSystem = {
  update(tanks: (WeaponHost & CombatPeer)[], colliders: Collider[], dt: number) {
    const ctx: WeaponContext = { tanks, colliders };
    for (const t of tanks) {
      if (!t.alive) continue;
      t.weapon?.update(dt, ctx);
    }
  },
};
