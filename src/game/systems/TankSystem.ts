import * as THREE from 'three';
import type { TankEntity } from '../Tank';
import { BOOST } from '../constants';
import { clamp, wrapAngle } from '../physics';

export const TankSystem = {
  update(tanks: TankEntity[], dt: number) {
    for (const t of tanks) {
      if (!t.alive) continue;

      const p = t.params;

      const wantBoost = t.boosting && t.boostEnergy > BOOST.minActivate && t.throttle > 0.15;
      t.boostActive = wantBoost;

      t.timeSinceHit += dt;
      if (t.timeSinceHit > 5 && t.health < t.maxHealth) {
        t.health = Math.min(t.maxHealth, t.health + 7 * dt);
      }
      t.boostEnergy = clamp(
        t.boostEnergy + (wantBoost ? -BOOST.drainPerSec : BOOST.rechargePerSec) * dt,
        0, 1,
      );

      const maxFwd = p.speed * (wantBoost ? BOOST.multiplier : 1);
      const targetSpeed = t.throttle >= 0
        ? t.throttle * maxFwd
        : t.throttle * p.reverseSpeed;
      t.speed = THREE.MathUtils.damp(t.speed, targetSpeed, wantBoost ? 6 : 4.5, dt);

      const agility = 0.55 + 0.45 * Math.min(Math.abs(t.speed) / p.speed, 1);
      t.yaw += t.steer * p.turnSpeed * agility * dt;

      const fx = Math.sin(t.yaw);
      const fz = Math.cos(t.yaw);
      const px = t.position.x;
      const pz = t.position.z;
      t.position.x += (fx * t.speed + t.knockback.x) * dt;
      t.position.z += (fz * t.speed + t.knockback.z) * dt;
      t.knockback.multiplyScalar(Math.exp(-5.5 * dt));
      t.vel.set((t.position.x - px) / dt, 0, (t.position.z - pz) / dt);

      t.fireTimer = Math.max(0, t.fireTimer - dt);

      if (t.isPlayer) {
        if (t.fullReloading) {
          t.reloadTimer -= dt;
          if (t.reloadTimer <= 0) {
            t.fullReloading = false;
            t.ammo = t.magazine;
          }
        } else if (t.ammo === 0) {
          t.startFullReload();
        }
      }

      const rel = wrapAngle(t.aimYaw - t.yaw);
      const diff = wrapAngle(rel - t.turretYaw);
      const maxStep = p.turretSpeed * dt;
      t.turretYaw += clamp(diff, -maxStep, maxStep);

      t.visual.hull.rotation.y = t.yaw;
      t.visual.turret.rotation.y = t.turretYaw;
    }
  },
};
