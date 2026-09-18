import type {
  AimBody,
  CombatTimerBody,
  MotionBody,
  PresentationBody,
} from '../../tank/simPorts';
import { TankMotionSystem } from './TankMotionSystem';
import { TankCombatTimersSystem } from './TankCombatTimersSystem';
import { TankAimSystem } from './TankAimSystem';
import { TankPresentationSystem } from './TankPresentationSystem';

/** Живой танк = пересечение портов motion/timers/aim/presentation. */
type LiveTank = MotionBody & CombatTimerBody & AimBody & PresentationBody & {
  alive: boolean;
  isRemote?: boolean;
};

/**
 * Фасад: один проход по живым танкам, подсистемы по SRP.
 * Порядок: motion → combat timers → aim → presentation.
 */
export const TankSystem = {
  update(tanks: LiveTank[], dt: number) {
    for (const t of tanks) {
      if (!t.alive) continue;
      if (t.isRemote) {
        // Keep weapon cadence so remote VFX can fire; skip OOC repair (HP is replicated).
        t.fireTimer = Math.max(0, t.fireTimer - dt);
        t.weapon?.updateReload(dt);
        TankPresentationSystem.sync(t);
        continue;
      }
      TankMotionSystem.updateOne(t, dt);
      TankCombatTimersSystem.updateOne(t, dt);
      TankAimSystem.updateOne(t, dt);
      TankPresentationSystem.sync(t);
    }
  },
};
