import * as THREE from 'three';
import type { AnimBody } from '../../tank/simPorts';
import { clamp, dampTo } from '../physics';
import { BARREL_REST_Z, SUSPENSION_TUNING } from '../../tuning';

/** Порог здоровья для визуального повреждения (темнее + копоть). */
const DAMAGE_VISUAL_THRESHOLD = 0.5;

/** Accumulated elapsed time for ring pulse (avoids performance.now() per tank per frame). */
let _elapsed = 0;

/**
 * Тонирование корпуса: база материала × k (1 = исходный цвет).
 * Раньше здесь стоял `setScalar(k)`, из-за чего accent-металл затирался в белый.
 */
function tintBody(visual: AnimBody['visual'], k: number) {
  const { bodyMats, bodyBaseColors } = visual;
  for (let i = 0; i < bodyMats.length; i++) {
    const base = bodyBaseColors[i] ?? 0xffffff;
    bodyMats[i].color.setHex(base).multiplyScalar(k);
  }
}

/** Анимация гибели/затухания: наклон ствола, вращение башни, потемнение корпуса. */
function animateDeath(t: AnimBody, dt: number) {
  t.boostActive = false;
  t.deathT += dt;
  t.visual.barrelGroup.rotation.x = dampTo(t.visual.barrelGroup.rotation.x, 0.3, 4, dt);
  t.visual.turret.rotation.y += dt * 0.15;
  if (t.visual.hull) {
    t.visual.hull.rotation.x = dampTo(t.visual.hull.rotation.x, 0.02, 3, dt);
    t.visual.hull.rotation.z = dampTo(t.visual.hull.rotation.z, 0.015, 3, dt);
  }
  const k = clamp(1 - t.deathT * 0.5, 0.15, 1);
  tintBody(t.visual, k);
  for (const m of t.visual.bodyMats) m.emissive.setScalar(0);
  t.visual.ring.visible = false;
}

export const TankAnimationSystem = {
  update(tanks: AnimBody[], dt: number) {
    _elapsed += dt;
    for (const t of tanks) {
      if (!t.alive) {
        animateDeath(t, dt);
        continue;
      }

      t.fx.barrelKick = dampTo(t.fx.barrelKick, 0, 11, dt);
      t.visual.barrelGroup.position.z = BARREL_REST_Z - t.fx.barrelKick * 0.4;
      // Вертикальная автонаводка: наклон ствола к цели. В локальных осях модели
      // ствол смотрит вдоль +Z, а поворот вокруг +X (rotation.x>0) роняет дуло
      // вниз (ẑ → −ŷ). barrelPitch>0 = вверх, поэтому в mesh идёт со знаком «−».
      // Отдача (position.z) и джиттер заряда (position.x/y) остаются независимыми.
      t.visual.barrelGroup.rotation.x = -(t.barrelPitch ?? 0);

      // Дифференциальная скорость перемотки гусениц:
      // При steer > 0 (поворот вправо): левая гусеница ускоряется вперёд, правая замедляется/реверсирует.
      // При нейтрали (speed = 0) и развороте: гусеницы вращаются в противоположные стороны.
      const trackHalfWidth = 1.45;
      const turnSpeed = t.params?.turnSpeed ?? 2.4;
      const steer = t.steer ?? 0;
      const turnDelta = steer * turnSpeed * trackHalfWidth;

      const leftSpeed = t.speed + turnDelta;
      const rightSpeed = t.speed - turnDelta;

      // 1 тайл текстуры = 1 трак (длина трака ~0.22 м).
      // Физическая скорость перемотки без проскальзывания: SCROLL_FACTOR = 1 / nominalLinkLen (4.545 м^-1).
      // При движении вперёд (+Z) верхняя ветвь бежит вперёд к носу корпуса (offset.y увеличивается).
      const SCROLL_FACTOR = 1 / 0.22;
      const dLeft = leftSpeed * dt * SCROLL_FACTOR;
      const dRight = rightSpeed * dt * SCROLL_FACTOR;

      if (t.visual.trackLeftTex) {
        t.visual.trackLeftTex.offset.y += dLeft;
      }
      if (t.visual.trackRightTex) {
        t.visual.trackRightTex.offset.y += dRight;
      }
      if (t.visual.trackTex && t.visual.trackTex !== t.visual.trackLeftTex) {
        t.visual.trackTex.offset.y += dLeft;
      }

      // Динамика подвески корпуса (клевки при ускорении/торможении, крен в виражах, отдача и сотрясения):
      if (t.visual.hull) {
        if (t.visual.hull.rotation.order !== 'YXZ') {
          t.visual.hull.rotation.order = 'YXZ';
        }

        // 1. Оценка продольного ускорения a = (speed - prevSpeed) / dt
        const prevSpeed = t.fx.prevSpeed ?? t.speed;
        const accel = dt > 1e-5 ? (t.speed - prevSpeed) / dt : 0;
        t.fx.prevSpeed = t.speed;

        // Целевой наклон носа (pitch):
        // При разгоне вперёд (accel > 0) нос задирается (pitch < 0).
        // При торможении / реверсе (accel < 0) нос клюёт землю (pitch > 0).
        const targetPitch = clamp(
          -accel * SUSPENSION_TUNING.pitchAccel,
          -SUSPENSION_TUNING.maxPitch,
          SUSPENSION_TUNING.maxPitch,
        );

        // 2. Оценка центробежной силы в повороте:
        // steer > 0 (поворот вправо) при speed > 0: центробежная сила кренит корпус влево (roll > 0).
        const targetRoll = clamp(
          steer * turnSpeed * t.speed * SUSPENSION_TUNING.rollCentrif,
          -SUSPENSION_TUNING.maxRoll,
          SUSPENSION_TUNING.maxRoll,
        );

        // 3. Сотрясение от внешнего импульса knockback (попадания снарядов/взрывы)
        if (t.knockback && (Math.abs(t.knockback.x) > 0.01 || Math.abs(t.knockback.z) > 0.01)) {
          const yaw = t.yaw ?? 0;
          const sinY = Math.sin(yaw);
          const cosY = Math.cos(yaw);
          // Проекция knockback в локальные оси корпуса:
          // localZ (вперёд) = kx * sinY + kz * cosY
          // localX (вправо) = kx * cosY - kz * sinY
          const localZ = t.knockback.x * sinY + t.knockback.z * cosY;
          const localX = t.knockback.x * cosY - t.knockback.z * sinY;

          t.fx.pitchVel = (t.fx.pitchVel ?? 0) - localZ * SUSPENSION_TUNING.flinchScale;
          t.fx.rollVel = (t.fx.rollVel ?? 0) - localX * SUSPENSION_TUNING.flinchScale;
        }

        // 4. Интеграция пружинно-демпферной модели (Spring-Damper):
        const omega = SUSPENSION_TUNING.omega;
        const zeta = SUSPENSION_TUNING.zeta;
        const twoZetaOmega = 2 * zeta * omega;
        const omegaSq = omega * omega;

        let pitch = t.fx.pitch ?? 0;
        let pitchVel = t.fx.pitchVel ?? 0;
        let roll = t.fx.roll ?? 0;
        let rollVel = t.fx.rollVel ?? 0;

        // Питч (продольный наклон)
        const pitchAccel = -omegaSq * (pitch - targetPitch) - twoZetaOmega * pitchVel;
        pitchVel += pitchAccel * dt;
        pitch += pitchVel * dt;
        pitch = clamp(pitch, -SUSPENSION_TUNING.maxPitch * 1.3, SUSPENSION_TUNING.maxPitch * 1.3);

        // Ролл (боковой крен)
        const rollAccel = -omegaSq * (roll - targetRoll) - twoZetaOmega * rollVel;
        rollVel += rollAccel * dt;
        roll += rollVel * dt;
        roll = clamp(roll, -SUSPENSION_TUNING.maxRoll * 1.3, SUSPENSION_TUNING.maxRoll * 1.3);

        t.fx.pitch = pitch;
        t.fx.pitchVel = pitchVel;
        t.fx.roll = roll;
        t.fx.rollVel = rollVel;

        t.visual.hull.rotation.x = pitch;
        t.visual.hull.rotation.z = roll;
      }

      if (t.fx.hitFlash > 0) {
        t.fx.hitFlash = Math.max(0, t.fx.hitFlash - dt * 6);
        for (const m of t.visual.bodyMats) m.emissive.setScalar(t.fx.hitFlash * 0.85);
      } else if (t.fx.healFlash > 0) {
        // «Нано-ремонт» («Изида»): мятное свечение корпуса союзника. Spад чуть
        // медленнее hitFlash — лечение — это positive-ток, его читаем дольше.
        t.fx.healFlash = Math.max(0, t.fx.healFlash - dt * 4);
        const e = t.fx.healFlash * 0.6;
        for (const m of t.visual.bodyMats) m.emissive.setRGB(e * 0.18, e, e * 0.62);
      } else {
        // Обе вспышки погасли: снять emissive (иначе мятный/белный остаток висел бы).
        for (const m of t.visual.bodyMats) m.emissive.setScalar(0);
      }

      // Damage state: затемнение корпуса при низком HP
      // Применяем только если нет hitFlash (он владеет цветом в свой момент).
      if (t.fx.hitFlash <= 0) {
        const hpFrac = t.health / t.maxHealth;
        // Линейно темнее от 1.0 (50% HP) до 0.55 (0% HP), затем обратно к базе.
        const darkK = hpFrac < DAMAGE_VISUAL_THRESHOLD
          ? 0.55 + 0.45 * (hpFrac / DAMAGE_VISUAL_THRESHOLD)
          : 1;
        tintBody(t.visual, darkK);
      }

      const ringMat = t.visual.ring.material as THREE.MeshBasicMaterial;
      ringMat.opacity = 0.45 + Math.sin(_elapsed * 4 + t.id) * 0.18;
    }
  },

  /**
   * Анимация гибели/затухания мёртвых танков вне боевого шага.
   * Iterates the full roster but only processes dead tanks — no intermediate
   * array allocation (replaces tanks.filter(!alive) per frame in GameLoop).
   */
  updateDead(tanks: AnimBody[], dt: number) {
    for (const t of tanks) {
      if (t.alive) continue;
      animateDeath(t, dt);
    }
  },
};
