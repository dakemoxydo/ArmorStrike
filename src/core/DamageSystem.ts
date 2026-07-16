// ===== Централизованная система урона =====
// Чистая реализация контракта DamageSystem (определён в weapons/types.ts).
// Инкапсулирует применение урона, отброс и разрушение блоков арены,
// вызывая колбэки для эффектов/событий, которые остаются в CombatSystem.
import * as THREE from 'three';
import type { Arena } from '../game/Arena';
import type { TankEntity } from '../game/Tank';
import type { DamageSystem } from '../game/weapons/types';

export interface DamageSystemHooks {
  /** Полная обработка урона по танку: takeDamage + эффекты/звук/события. */
  onTankHit: (target: TankEntity, dmg: number, source: TankEntity) => void;
  /** Вызывается при уничтожении блока арены (для взрыва/дебриса). */
  onBlockDestroyed: (pos: THREE.Vector3, size: number) => void;
}

export function createDamageSystem(
  arena: Arena,
  hooks: DamageSystemHooks,
): DamageSystem {
  return {
    applyDamage: (target: TankEntity, dmg: number, source: TankEntity) => {
      hooks.onTankHit(target, dmg, source);
    },
    applyKnockback: (target: TankEntity, dir: THREE.Vector3, force: number) => {
      target.knockback.addScaledVector(dir, force);
    },
    damageBlock: (blockId: number, dmg: number, hitPos: THREE.Vector3) => {
      const res = arena.damageBlock(blockId, dmg);
      if (res === 'destroyed') {
        hooks.onBlockDestroyed(hitPos, 1.4);
      }
    },
  };
}
