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
type LiveTank = MotionBody & CombatTimerBody & AimBody & PresentationBody & { alive: boolean };

/**
 * Фасад: один проход по живым танкам, подсистемы по SRP.
 * Порядок: motion → combat timers → aim → presentation.
 */
export const TankSystem = {
  update(tanks: LiveTank[], dt: number) {
    for (const t of tanks) {
      if (!t.alive) continue;
      TankMotionSystem.updateOne(t, dt);
      TankCombatTimersSystem.updateOne(t, dt);
      TankAimSystem.updateOne(t, dt);
      TankPresentationSystem.sync(t);
    }
  },
};
