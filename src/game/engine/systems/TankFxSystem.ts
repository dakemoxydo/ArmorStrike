// ===== Система визуальных эффектов танков: дым повреждений, пыль и следы гусениц =====
import * as THREE from 'three';
import type { FxBody } from '../../tank/simPorts';
import type { EffectsPort } from '../../ports/EffectsPort';
import { SMOKE_HEALTH_FRAC } from '../../tuning';

const tmpV = new THREE.Vector3();
const tmpTrackL = new THREE.Vector3();
const tmpTrackR = new THREE.Vector3();
const tmpDustPosL = new THREE.Vector3();
const tmpDustPosR = new THREE.Vector3();
const tmpDustVelL = new THREE.Vector3();
const tmpDustVelR = new THREE.Vector3();

const TRACK_HALF_WIDTH = 1.42;
const TRACK_MARK_STEP = 0.75;
const DUST_MIN_SPEED = 1.8;
const DUST_MIN_STEER = 0.3;

export const TankFxSystem = {
  update(tanks: FxBody[], effects: EffectsPort, dt: number) {
    for (const t of tanks) {
      if (!t.alive) continue;

      // 1. Дым повреждений при низком здоровье
      if (t.health < t.maxHealth * SMOKE_HEALTH_FRAC) {
        t.fx.smokeAcc += dt;
        if (t.fx.smokeAcc > 0.11) {
          // E6: вычитаем порог, а не обнуляем — иначе при dt > порога эмиттер
          // «теряет» остаток и частота дыма плавает от FPS (как у flame `-=`).
          t.fx.smokeAcc -= 0.11;
          tmpV.set(t.position.x, 1.6, t.position.z);
          effects.tankSmoke(tmpV);
        }
      }

      // 2. Кинематика шасси: дифференциальная скорость и дистанция траков
      const yaw = t.yaw;
      const cosY = Math.cos(yaw);
      const sinY = Math.sin(yaw);

      const turnSpeed = t.params.turnSpeed ?? 2.4;
      const steer = t.steer ?? 0;
      const turnDelta = steer * turnSpeed * TRACK_HALF_WIDTH;
      const leftSpeed = t.speed + turnDelta;
      const rightSpeed = t.speed - turnDelta;
      const maxTrackSpeed = Math.max(Math.abs(leftSpeed), Math.abs(rightSpeed));

      // Координаты контакта левой и правой гусениц с поверхностью (нормаль вправо: (cosY, -sinY))
      const lx = t.position.x - cosY * TRACK_HALF_WIDTH;
      const lz = t.position.z + sinY * TRACK_HALF_WIDTH;
      const rx = t.position.x + cosY * TRACK_HALF_WIDTH;
      const rz = t.position.z - sinY * TRACK_HALF_WIDTH;

      // 3. Отпечатки гусениц на грунте (Track Marks)
      if (maxTrackSpeed > 0.1) {
        t.fx.trackDist = (t.fx.trackDist ?? 0) + maxTrackSpeed * dt;
        if (t.fx.trackDist >= TRACK_MARK_STEP) {
          t.fx.trackDist -= TRACK_MARK_STEP;

          const isSkidding = Math.abs(t.speed) < 3.0 && Math.abs(steer) > 0.35;
          const intensity = isSkidding ? 0.9 : 0.65;

          tmpTrackL.set(lx, 0.025, lz);
          tmpTrackR.set(rx, 0.025, rz);
          effects.trackMark?.(tmpTrackL, yaw, 0.68, 0.85, intensity);
          effects.trackMark?.(tmpTrackR, yaw, 0.68, 0.85, intensity);
        }
      }

      // 4. Дорожная пыль из-под гусениц (Drive Dust)
      if (Math.abs(t.speed) > DUST_MIN_SPEED || Math.abs(steer) > DUST_MIN_STEER) {
        const speedNorm = Math.min(1.5, Math.abs(t.speed) / Math.max(1, t.params.speed));
        const steerBonus = Math.abs(steer) * 0.4;
        t.fx.dustAcc += dt * (speedNorm + steerBonus);

        if (t.fx.dustAcc > 0.1) {
          t.fx.dustAcc -= 0.1;

          // Вектор назад от курса танка
          const bx = -sinY;
          const bz = -cosY;
          const boost = t.boostActive ? 1.5 : 1.0;
          const kickSpeed = (1.4 + speedNorm * 1.8) * boost;
          const dustScale = (0.42 + speedNorm * 0.25) * boost;

          // Пылевой выброс левой гусеницы
          tmpDustPosL.set(
            lx + bx * 1.5 + (Math.random() - 0.5) * 0.3,
            0.2,
            lz + bz * 1.5 + (Math.random() - 0.5) * 0.3,
          );
          tmpDustVelL.set(
            bx * kickSpeed + (Math.random() - 0.5) * 1.2,
            0.8 + Math.random() * 0.6,
            bz * kickSpeed + (Math.random() - 0.5) * 1.2,
          );
          effects.tankDust(tmpDustPosL, tmpDustVelL, dustScale);

          // Пылевой выброс правой гусеницы
          tmpDustPosR.set(
            rx + bx * 1.5 + (Math.random() - 0.5) * 0.3,
            0.2,
            rz + bz * 1.5 + (Math.random() - 0.5) * 0.3,
          );
          tmpDustVelR.set(
            bx * kickSpeed + (Math.random() - 0.5) * 1.2,
            0.8 + Math.random() * 0.6,
            bz * kickSpeed + (Math.random() - 0.5) * 1.2,
          );
          effects.tankDust(tmpDustPosR, tmpDustVelR, dustScale);
        }
      }
    }
  },
};
