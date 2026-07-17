import * as THREE from 'three';
import type { TankEntity } from '../../Tank';
import { clamp, dampTo } from '../physics';
import { BARREL_REST_Z } from '../../tuning';

export const TankAnimationSystem = {
  update(tanks: TankEntity[], dt: number) {
    for (const t of tanks) {
      if (!t.alive) {
        t.boostActive = false;
        t.deathT += dt;
        t.visual.barrelGroup.rotation.x = dampTo(t.visual.barrelGroup.rotation.x, 0.3, 4, dt);
        t.visual.turret.rotation.y += dt * 0.15;
        const k = clamp(1 - t.deathT * 0.5, 0.15, 1);
        for (const m of t.visual.bodyMats) {
          m.color.setScalar(k);
          m.emissive.setScalar(0);
        }
        t.visual.ring.visible = false;
        continue;
      }

      t.fx.barrelKick = dampTo(t.fx.barrelKick, 0, 9, dt);
      t.visual.barrelGroup.position.z = BARREL_REST_Z - t.fx.barrelKick * 0.4;

      t.visual.trackTex.offset.y -= t.speed * dt * 0.22;

      if (t.fx.hitFlash > 0) {
        t.fx.hitFlash = Math.max(0, t.fx.hitFlash - dt * 6);
        for (const m of t.visual.bodyMats) m.emissive.setScalar(t.fx.hitFlash * 0.85);
      }

      const ringMat = t.visual.ring.material as THREE.MeshBasicMaterial;
      ringMat.opacity = 0.45 + Math.sin(performance.now() * 0.004 + t.id) * 0.18;
    }
  },
};
