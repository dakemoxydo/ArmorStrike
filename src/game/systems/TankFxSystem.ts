// ===== Система визуальных эффектов танков: дым повреждений и пыль из-под гусениц =====
import * as THREE from 'three';
import type { TankEntity } from '../Tank';
import type { Effects } from '../effects';

const tmpV = new THREE.Vector3();

export const TankFxSystem = {
  update(tanks: TankEntity[], effects: Effects, dt: number) {
    for (const t of tanks) {
      if (!t.alive) continue;

      // Дым повреждений при низком здоровье
      if (t.health < t.maxHealth * 0.32) {
        t.smokeAcc += dt;
        if (t.smokeAcc > 0.11) {
          t.smokeAcc = 0;
          tmpV.set(t.position.x, 1.6, t.position.z);
          effects.tankSmoke(tmpV);
        }
      }

      if (Math.abs(t.speed) > 8) {
        t.dustAcc += dt * (Math.abs(t.speed) / Math.max(1, t.params.speed));
        if (t.dustAcc > 0.1) {
          t.dustAcc = 0;
          const back = t.yaw + Math.PI;
          tmpV.set(
            t.position.x + Math.sin(back) * 2.4 + (Math.random() - 0.5) * 1.2,
            0.35,
            t.position.z + Math.cos(back) * 2.4 + (Math.random() - 0.5) * 1.2,
          );
          effects.tankDust(tmpV);
        }
      }
    }
  },
};
