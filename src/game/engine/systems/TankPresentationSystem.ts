import type { TankEntity } from '../../Tank';

/** Синхронизация mesh-позы с симуляцией (живой танк). */
export const TankPresentationSystem = {
  sync(t: TankEntity) {
    t.visual.hull.rotation.y = t.yaw;
    t.visual.turret.rotation.y = t.turretYaw;
  },
};
