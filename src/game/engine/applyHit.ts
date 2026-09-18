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
 * Impulse/VFX gate matching DamageSystem HP rules: no self, no corpse,
 * no spawn-invuln shove, no friendly-fire knockback (C6 for cannon/splash).
 * HP itself is still applied via applyDamage (which no-ops on the same cases).
 */
export function combatAllowsImpulse(target: TankLike, source: TankLike): boolean {
  if (!target.alive) return false;
  if (source.id === target.id) return false;
  if (source.isRemote) return false;
  if ((target.invulnT ?? 0) > 0) return false;
  const st = source.teamId ?? null;
  const tt = target.teamId ?? null;
  if (st != null && tt != null && st === tt) return false;
  return true;
}

/** Same-team pair with both sides teamed — projectile should ignore the hull. */
export function isFriendlyPair(a: TankLike, b: TankLike): boolean {
  const st = a.teamId ?? null;
  const tt = b.teamId ?? null;
  return st != null && tt != null && st === tt;
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
  if (!combatAllowsImpulse(target, source)) return;
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
  if (!combatAllowsImpulse(target, source)) return;
  const dx = target.position.x - center.x;
  const dz = target.position.z - center.z;
  const dist = Math.sqrt(dx * dx + dz * dz);
  if (dist > 0.1) {
    target.knockback.x += (dx / dist) * knockForce;
    target.knockback.z += (dz / dist) * knockForce;
  }
  effect(target.position);
}
