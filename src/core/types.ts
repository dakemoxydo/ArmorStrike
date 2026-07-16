// ===== Чистые доменные типы слоя core (без зависимости от game/) =====
import type * as THREE from 'three';

/** Стиль окраски танка (чистые данные, без привязки к Three.js-объектам). */
export interface TankStyle {
  body: string;
  dark: string;
  light: string;
  glow: number;
  accent: number;
  antenna: boolean;
}

/** Минимальный контракт танка, нужный системе урона. */
export interface TankLike {
  id: number;
  name: string;
  isPlayer: boolean;
  health: number;
  alive: boolean;
  knockback: THREE.Vector3;
  position: THREE.Vector3;
  yaw: number;
  /** Применяет урон и помечает источник (чистая логика без эффектов). */
  takeDamage(dmg: number, attackerId: number): void;
}

/** Минимальный контракт арены, нужный системе урона. */
export interface ArenaLike {
  damageBlock(blockId: number, dmg: number): 'destroyed' | 'hit' | null;
}

/** Централизованная система урона (реализуется в core/DamageSystem). */
export interface DamageSystem {
  applyDamage: (target: TankLike, dmg: number, source: TankLike) => void;
  applyKnockback: (target: TankLike, dir: THREE.Vector3, force: number) => void;
  damageBlock: (blockId: number, dmg: number, hitPos: THREE.Vector3) => void;
}

/** Колбэки эффектов/событий, вызываемые системой урона (остаются в CombatSystem). */
export interface DamageSystemHooks {
  /** Эффекты/звук/события после применения чистого урона (target.takeDamage уже вызван). */
  onTankDamaged: (target: TankLike, dmg: number, source: TankLike) => void;
  /** Вызывается при уничтожении блока арены (для взрыва/дебриса). */
  onBlockDestroyed: (pos: THREE.Vector3, size: number) => void;
}
