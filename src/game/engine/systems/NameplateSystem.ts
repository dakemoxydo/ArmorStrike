// ===== Система обновления именных табличек ботов =====
import type { Nameplate } from '../../nameplate';

/** Narrow port — no TankEntity fan-in. */
export interface NameplateSubject {
  id: number;
  alive: boolean;
  health: number;
  maxHealth: number;
  position: { x: number; z: number };
}

type NameplateEntry = { plate: Nameplate; color: number };

export const NameplateSystem = {
  update(bots: Iterable<{ tank: NameplateSubject }>, nameplates: Map<number, NameplateEntry>) {
    for (const b of bots) {
      const np = nameplates.get(b.tank.id);
      if (!np) continue;
      if (b.tank.alive) {
        np.plate.sprite.visible = true;
        np.plate.setPosition(b.tank.position.x, 3.6, b.tank.position.z);
        np.plate.update(b.tank.health / b.tank.maxHealth, np.color);
      } else {
        np.plate.sprite.visible = false;
      }
    }
  },
};
