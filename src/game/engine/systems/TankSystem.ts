import * as THREE from 'three';
import type { TankEntity } from '../../Tank';
import { BOOST } from '../../constants';
import { clamp, wrapAngle } from '../physics';
import { HEAL_DELAY, HEAL_PER_SEC, KNOCKBACK_DECAY, SPEED_DAMP } from '../../tuning';

export const TankSystem = {
  update(tanks: TankEntity[], dt: number) {
    for (const t of tanks) {
      if (!t.alive) continue;

      const p = t.params;

      const wantBoost = t.boosting && t.boostEnergy > BOOST.minActivate && t.throttle > 0.15;
      t.boostActive = wantBoost;

      t.timeSinceHit += dt;
      if (t.timeSinceHit > HEAL_DELAY && t.health < t.maxHealth) {
        t.health = Math.min(t.maxHealth, t.health + HEAL_PER_SEC * dt);
      }
      t.boostEnergy = clamp(
        t.boostEnergy + (wantBoost ? -BOOST.drainPerSec : BOOST.rechargePerSec) * dt,
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

      t.fireTimer = Math.max(0, t.fireTimer - dt);

      // Перезарядка магазина для всех (игрок и боты с пушкой)
      t.weapon?.updateReload(dt);

      const rel = wrapAngle(t.aimYaw - t.yaw);
      const diff = wrapAngle(rel - t.turretYaw);
      const maxStep = p.turretSpeed * dt;
      t.turretYaw += clamp(diff, -maxStep, maxStep);

      t.visual.hull.rotation.y = t.yaw;
      t.visual.turret.rotation.y = t.turretYaw;
    }
  },
};
