import * as THREE from 'three';
import type { MotionBody } from '../../tank/simPorts';
import { BOOST } from '../../constants';
import { clamp } from '../physics';
import { KNOCKBACK_DECAY, SPEED_DAMP } from '../../tuning';

export const TankMotionSystem = {
  updateOne(t: MotionBody, dt: number) {
    const p = t.params;

    const wantBoost = t.boosting && t.boostEnergy > BOOST.minActivate && t.throttle > 0.15;
    t.boostActive = wantBoost;

    const drain = BOOST.drainPerSec * (t.boostDrainMul || 1);
    const recharge = BOOST.rechargePerSec * (t.boostRechargeMul || 1);
    t.boostEnergy = clamp(
      t.boostEnergy + (wantBoost ? -drain : recharge) * dt,
      0, 1,
    );

    const maxFwd = p.speed * (wantBoost ? BOOST.multiplier : 1);
    const targetSpeed = t.throttle >= 0
      ? t.throttle * maxFwd
      : t.throttle * p.reverseSpeed;
    t.speed = THREE.MathUtils.damp(
      t.speed, targetSpeed, wantBoost ? SPEED_DAMP.boost : SPEED_DAMP.normal, dt,
    );

    const agility = 0.55 + 0.45 * Math.min(Math.abs(t.speed) / p.speed, 1);
    t.yaw += t.steer * p.turnSpeed * agility * dt;

    const fx = Math.sin(t.yaw);
    const fz = Math.cos(t.yaw);
    const px = t.position.x;
    const pz = t.position.z;
    t.position.x += (fx * t.speed + t.knockback.x) * dt;
    t.position.z += (fz * t.speed + t.knockback.z) * dt;
    t.knockback.multiplyScalar(Math.exp(-KNOCKBACK_DECAY * dt));
    t.vel.set((t.position.x - px) / dt, 0, (t.position.z - pz) / dt);
  },
};
