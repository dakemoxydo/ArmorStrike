// ===== Централизованная система урона =====
// Чистая реализация контракта DamageSystem (определён в core/types.ts).
// applyDamage применяет урон к цели (чисто, через TankLike.takeDamage),
// а колбэки-хуки отвечают только за эффекты/звук/события (в CombatSystem).
// Порядок стадий: гейты → сопротивление корпуса → крит → takeDamage → хук.
import * as THREE from 'three';
import type {
  ArenaLike, DamageInfo, DamageSystem, DamageSystemHooks, TankLike,
} from './types';
import { resistMultiplier, rollCrit } from './damageRolls';

/** Опции фабрики: `rng` внедряется ради детерминированных тестов крита. */
export interface DamageSystemOptions {
  rng?: () => number;
}

export function createDamageSystem(
  arena: ArenaLike,
  hooks: DamageSystemHooks,
  options: DamageSystemOptions = {},
): DamageSystem {
  const rng = options.rng ?? Math.random;
  return {
    applyDamage: (target: TankLike, dmg: number, source: TankLike) => {
      // Не бить мёртвых: устраняет повторные эффекты/звук по трупу и
      // делает скоринг устойчивым к источникам урона без фильтра !alive.
      if (!target.alive) return;
      if (source.id === target.id) return;
      // dmg<=0: knockback/VFX helpers call applyHit/applySplashHit with 0 damage.
      // Проверка стоит ДО щита: иначе каждый knockback-хелп кричал бы «ИММУНИТЕТ».
      if (dmg <= 0) {
        return;
      }
      // Spawn invulnerability (match respawn): урон не проходит, но стрелок обязан
      // это увидеть — иначе выстрел в щит выглядит как «оружие сломалось».
      if ((target.invulnT ?? 0) > 0) {
        hooks.onDamageIgnored?.(target, source);
        return;
      }
      // Friendly fire off when both have non-null matching teams.
      const st = source.teamId;
      const tt = target.teamId;
      if (st != null && tt != null && st === tt) return;

      // Контр-пик: сопротивление корпуса цели по типу урона источника.
      const resistMul = resistMultiplier(target.damageResist, source.damageType);
      let dealt = dmg * resistMul;

      // Крит по кривой накопления стрелка (первое попадание не критует;
      // накопитель живёт на танке и обнуляется самим броском после крита).
      const crit = rollCrit(source.critChance ?? 0, source.critTuning, rng);
      source.critChance = crit.nextChance;
      const tuning = source.critTuning;
      if (crit.crit && tuning) dealt *= tuning.multiplier;
      if (dealt <= 0) return;

      // Чистая логика урона: помечаем цель, не трогая представление.
      target.takeDamage(dealt, source.id);
      const info: DamageInfo = {
        type: source.damageType,
        crit: crit.crit,
        resistMul,
        dealt,
      };
      // Эффекты/звук/скоринг — в хуке, зависящем от game-слоя.
      hooks.onTankDamaged(target, dealt, source, info);
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
