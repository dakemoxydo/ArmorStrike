// ===== Система визуальных эффектов танков: дым повреждений и пыль из-под гусениц =====
import * as THREE from 'three';
import type { FxBody } from '../../tank/simPorts';
import type { EffectsPort } from '../../ports/EffectsPort';
import { BOOST_JET_OFFSET, DUST_HEIGHT, DUST_SPREAD, SMOKE_HEALTH_FRAC } from '../../tuning';
import { rearPoint } from '../physics';

const tmpV = new THREE.Vector3();

export const TankFxSystem = {
  update(tanks: FxBody[], effects: EffectsPort, dt: number) {
    for (const t of tanks) {
      if (!t.alive) continue;

      // Дым повреждений при низком здоровье
      if (t.health < t.maxHealth * SMOKE_HEALTH_FRAC) {
        t.fx.smokeAcc += dt;
        if (t.fx.smokeAcc > 0.11) {
          t.fx.smokeAcc = 0;
          tmpV.set(t.position.x, 1.6, t.position.z);
          effects.tankSmoke(tmpV);
        }
      }

      if (Math.abs(t.speed) > 8) {
        t.fx.dustAcc += dt * (Math.abs(t.speed) / Math.max(1, t.params.speed));
        if (t.fx.dustAcc > 0.1) {
          t.fx.dustAcc = 0;
          rearPoint(tmpV, t.position.x, t.position.z, t.yaw, BOOST_JET_OFFSET, DUST_HEIGHT);
          tmpV.x += (Math.random() - 0.5) * DUST_SPREAD;
          tmpV.z += (Math.random() - 0.5) * DUST_SPREAD;
          effects.tankDust(tmpV);
        }
      }
    }
  },
};
