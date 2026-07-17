// ===== Общий helper нанесения удара: урон + толчок + визуальный эффект =====
// Устраняет дублирование паттерна «applyDamage + applyKnockback + effects.*»
// между RailgunWeapon, FlamethrowerWeapon, ProjectileBehavior и doSplash.
// Чистая структура: поведение (направление/сила толчка, формула урона)
// остаётся за вызывающим — helper лишь объединяет шаги.
import * as THREE from 'three';
import type { DamageSystem, TankLike } from '../../core/types';

export interface HitEffect {
  (hitPoint: THREE.Vector3): void;
}

/**
 * Применяет прямой удар по танку: урон + толчок + визуальный эффект.
 * @param knockDir  нормированное направление толчка (обычно полёт снаряда или к цели)
 * @param knockForce  сила толчка
 * @param effect  визуальный эффект в точке попадания (impact/spawnSmoke/explosion)
 */
export function applyHit(
  damageSystem: DamageSystem,
  target: TankLike,
  dmg: number,
  source: TankLike,
  knockDir: THREE.Vector3,
  knockForce: number,
  effect: HitEffect,
  hitPoint: THREE.Vector3,
) {
  damageSystem.applyDamage(target, dmg, source);
  damageSystem.applyKnockback(target, knockDir, knockForce);
  effect(hitPoint);
}

/**
 * Площадной урон от эпицентра (splash): убывает с дистанцией,
 * толчок направлен от центра к танку.
 */
export function applySplashHit(
  damageSystem: DamageSystem,
  target: TankLike,
  dmg: number,
  source: TankLike,
  center: THREE.Vector3,
  knockForce: number,
  effect: HitEffect,
) {
  damageSystem.applyDamage(target, dmg, source);
  const dx = target.position.x - center.x;
  const dz = target.position.z - center.z;
  const dist = Math.sqrt(dx * dx + dz * dz);
  if (dist > 0.1) {
    target.knockback.x += (dx / dist) * knockForce;
    target.knockback.z += (dz / dist) * knockForce;
  }
  effect(target.position);
}
