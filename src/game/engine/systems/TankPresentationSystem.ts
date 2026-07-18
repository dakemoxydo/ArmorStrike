import type { PresentationBody } from '../../tank/simPorts';

/** Синхронизация mesh-позы с симуляцией (живой танк). */
export const TankPresentationSystem = {
  sync(t: PresentationBody) {
    t.visual.hull.rotation.y = t.yaw;
    t.visual.turret.rotation.y = t.turretYaw;
  },
};
