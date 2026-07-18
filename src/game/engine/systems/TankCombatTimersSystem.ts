import type { CombatTimerBody } from '../../tank/simPorts';
import { HEAL_DELAY, HEAL_PER_SEC } from '../../tuning';

export const TankCombatTimersSystem = {
  updateOne(t: CombatTimerBody, dt: number) {
    t.fx.timeSinceHit += dt;
    if (t.fx.timeSinceHit > HEAL_DELAY && t.health < t.maxHealth) {
      t.health = Math.min(t.maxHealth, t.health + HEAL_PER_SEC * dt);
    }

    t.fireTimer = Math.max(0, t.fireTimer - dt);

    // Перезарядка магазина для всех (игрок и боты с пушкой)
    t.weapon?.updateReload(dt);
  },
};
