// ===== Централизованная система урона =====
// Чистая реализация контракта DamageSystem (определён в core/types.ts).
// applyDamage применяет урон к цели (чисто, через TankLike.takeDamage),
// а колбэки-хуки отвечают только за эффекты/звук/события (в CombatSystem).
import * as THREE from 'three';
import type { ArenaLike, DamageSystem, DamageSystemHooks, TankLike } from './types';

export function createDamageSystem(
  arena: ArenaLike,
  hooks: DamageSystemHooks,
): DamageSystem {
  return {
    applyDamage: (target: TankLike, dmg: number, source: TankLike) => {
      // Не бить мёртвых: устраняет повторные эффекты/звук по трупу и
      // делает скоринг устойчивым к источникам урона без фильтра !alive.
      if (!target.alive) return;
      // dmg<=0: knockback/VFX helpers call applyHit/applySplashHit with 0 damage;
      if (dmg <= 0) {
        return;
      }
      // Чистая логика урона: помечаем цель, не трогая представление.
      target.takeDamage(dmg, source.id);
      // Эффекты/звук/скоринг — в хуке, зависящем от game-слоя.
      hooks.onTankDamaged(target, dmg, source);
    },
    applyKnockback: (target: TankLike, dir: THREE.Vector3, force: number) => {
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
