import type { TankEntity } from '../../Tank';
import { clamp, wrapAngle } from '../physics';

export const TankAimSystem = {
  updateOne(t: TankEntity, dt: number) {
    const p = t.params;
    const rel = wrapAngle(t.aimYaw - t.yaw);
    const diff = wrapAngle(rel - t.turretYaw);
    const maxStep = p.turretSpeed * dt;
    t.turretYaw += clamp(diff, -maxStep, maxStep);
  },
};
