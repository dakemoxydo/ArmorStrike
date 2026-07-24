import * as THREE from 'three';
import type { AnimBody } from '../../tank/simPorts';
import { clamp, dampTo } from '../physics';
import { BARREL_REST_Z } from '../../tuning';

/** Порог здоровья для визуального повреждения (темнее + копоть). */
const DAMAGE_VISUAL_THRESHOLD = 0.5;

/** Accumulated elapsed time for ring pulse (avoids performance.now() per tank per frame). */
let _elapsed = 0;

/** Анимация гибели/затухания: наклон ствола, вращение башни, потемнение корпуса. */
function animateDeath(t: AnimBody, dt: number) {
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
}

export const TankAnimationSystem = {
  update(tanks: AnimBody[], dt: number) {
    _elapsed += dt;
    for (const t of tanks) {
      if (!t.alive) {
        animateDeath(t, dt);
        continue;
      }

      t.fx.barrelKick = dampTo(t.fx.barrelKick, 0, 9, dt);
      t.visual.barrelGroup.position.z = BARREL_REST_Z - t.fx.barrelKick * 0.4;

      t.visual.trackTex.offset.y -= t.speed * dt * 0.22;

      if (t.fx.hitFlash > 0) {
        t.fx.hitFlash = Math.max(0, t.fx.hitFlash - dt * 6);
        for (const m of t.visual.bodyMats) m.emissive.setScalar(t.fx.hitFlash * 0.85);
      }

      // Damage state: затемнение корпуса при низком HP
      const hpFrac = t.health / t.maxHealth;
      if (hpFrac < DAMAGE_VISUAL_THRESHOLD) {
        // Линейно темнее от 1.0 (50% HP) до 0.55 (0% HP)
        const darkK = 0.55 + 0.45 * (hpFrac / DAMAGE_VISUAL_THRESHOLD);
        for (const m of t.visual.bodyMats) {
          // Применяем затемнение только если нет hitFlash
          if (t.fx.hitFlash <= 0) {
            m.color.setScalar(darkK);
          }
        }
      } else {
        // Восстановление нормального цвета
        for (const m of t.visual.bodyMats) {
          if (t.fx.hitFlash <= 0) {
            m.color.setScalar(1);
          }
        }
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
