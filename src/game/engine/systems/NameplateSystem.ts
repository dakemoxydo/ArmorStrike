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
  update(
    bots: Iterable<{ tank: NameplateSubject }>,
    nameplates: Map<number, NameplateEntry>,
    observer?: { x: number; z: number },
  ) {
    for (const b of bots) this.syncOne(b.tank, nameplates, observer);
  },

  /** Bots + remote peers (anything with a nameplate, not just the AI roster). */
  updateTanks(
    tanks: Iterable<NameplateSubject>,
    nameplates: Map<number, NameplateEntry>,
    observer?: { x: number; z: number },
  ) {
    for (const t of tanks) this.syncOne(t, nameplates, observer);
  },

  syncOne(
    tank: NameplateSubject,
    nameplates: Map<number, NameplateEntry>,
    observer?: { x: number; z: number },
  ) {
    const np = nameplates.get(tank.id);
    if (!np) return;
    if (tank.alive) {
      np.plate.sprite.visible = true;
      np.plate.setPosition(tank.position.x, 3.6, tank.position.z);
      np.plate.update(tank.health / tank.maxHealth, np.color);
      if (observer) {
        const dx = tank.position.x - observer.x;
        const dz = tank.position.z - observer.z;
        np.plate.setRange(Math.hypot(dx, dz));
      }
    } else {
      np.plate.sprite.visible = false;
    }
  },
};
