import type { CombatTimerBody } from '../../tank/simPorts';
import { REPAIR_TUNING } from '../../tuning';

export const TankCombatTimersSystem = {
  updateOne(t: CombatTimerBody, dt: number) {
    t.fireTimer = Math.max(0, t.fireTimer - dt);

    // Перезарядка магазина для всех (игрок и боты с пушкой)
    t.weapon?.updateReload(dt);

    // Ремонт вне боя (Out-of-Combat Repair)
    if (t.timeSinceDamaged !== undefined) {
      t.timeSinceDamaged += dt;
      if (
        t.alive !== false &&
        t.health !== undefined &&
        t.maxHealth !== undefined &&
        t.timeSinceDamaged >= REPAIR_TUNING.outOfCombatDelaySec &&
        t.health < t.maxHealth
      ) {
        const rate = REPAIR_TUNING.baseRatePerSec + t.maxHealth * REPAIR_TUNING.maxHealthFracPerSec;
        t.health = Math.min(t.maxHealth, t.health + rate * dt);
      }
    }
  },
};

