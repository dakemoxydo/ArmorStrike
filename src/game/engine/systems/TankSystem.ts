import type { TankEntity } from '../../Tank';
import { TankMotionSystem } from './TankMotionSystem';
import { TankCombatTimersSystem } from './TankCombatTimersSystem';
import { TankAimSystem } from './TankAimSystem';
import { TankPresentationSystem } from './TankPresentationSystem';

/**
 * Фасад: один проход по живым танкам, подсистемы по SRP.
 * Порядок: motion → combat timers → aim → presentation.
 */
export const TankSystem = {
  update(tanks: TankEntity[], dt: number) {
    for (const t of tanks) {
      if (!t.alive) continue;
      TankMotionSystem.updateOne(t, dt);
      TankCombatTimersSystem.updateOne(t, dt);
      TankAimSystem.updateOne(t, dt);
      TankPresentationSystem.sync(t);
    }
  },
};
