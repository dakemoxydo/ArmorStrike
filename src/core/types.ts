// ===== Чистые доменные типы слоя core (без зависимости от game/) =====
import type * as THREE from 'three';
import type { CritTuning, DamageType, HullId, TurretId } from './catalogTypes';

/** Стиль окраски танка (чистые данные, без привязки к Three.js-объектам). */
export interface TankStyle {
  body: string;
  dark: string;
  light: string;
  glow: number;
  accent: number;
  antenna: boolean;
}

/** Минимальный контракт танка для урона и hit-testing снарядов (не полный TankEntity). */
export interface TankLike {
  id: number;
  name: string;
  isPlayer: boolean;
  health: number;
  alive: boolean;
  /** Радиус коллизии (projectile hit-test). */
  radius: number;
  knockback: THREE.Vector3;
  position: THREE.Vector3;
  yaw: number;
  /** Ракурс прицела/камеры (для точного направления индикатора урона на экране). */
  aimYaw?: number;
  /** Match team: null = FFA. Optional for tests/stubs. */
  teamId?: string | null;
  /** Network peer: pose/HP are replicated; local combat must not mutate them. */
  isRemote?: boolean;
  /** Stable multiplayer id (auth/guest/bot:N). Optional for offline stubs. */
  networkId?: string | null;
  /** Spawn invulnerability seconds remaining. Optional for tests/stubs. */
  invulnT?: number;
  /** Тип урона этого танка (из каталога башни). Optional для стабов/без башни. */
  damageType?: DamageType;
  /** Корпус/башня — для presentation-остова при гибели. Optional для стабов. */
  hullId?: HullId;
  turretId?: TurretId;
  /**
   * Сопротивления корпуса цели по типу урона (доля поглощённого, минус =
   * уязвимость). Ключи — `DamageType`; см. `HullDef.resist`.
   */
  damageResist?: Partial<Record<DamageType, number>>;
  /** Кривая накопления крита этого орудия (из `WEAPON_TUNING[x].crit`). */
  critTuning?: CritTuning;
  /** Накопленный шанс крита стрелка (мутируется DamageSystem при попадании). */
  critChance?: number;
  /** Применяет урон и помечает источник (чистая логика без эффектов). */
  takeDamage(dmg: number, attackerId: number): void;
}

/**
 * Что DamageSystem сообщает хукам о применённом уроне: итог после
 * сопротивления корпуса и броска крита. НуженPresentation-слою (цвета чисел
 * урона, отдельный SFX крита), а не для расчёта.
 */
export interface DamageInfo {
  /** Тип урона источника (undefined — у танка без башни/стаба). */
  type?: DamageType;
  /** Критическое ли попадание. */
  crit: boolean;
  /** Множитель сопротивления цели (1 = броня не повлияла, >1 = контр-пик). */
  resistMul: number;
  /** Итоговая величина, ушедшая в `takeDamage` (без дробного «остатка»). */
  dealt: number;
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
  /**
   * Эффекты/звук/события после применения чистого урона (target.takeDamage уже вызван).
   * `info` — итог после сопротивлений/крита; отсутствует у старых вызывающих стабов.
   */
  onTankDamaged: (target: TankLike, dmg: number, source: TankLike, info?: DamageInfo) => void;
  /**
   * Урон был бы нанесён, но его поглотила неуязвимость цели (респавн-щит).
   * Нужен presentation-слою, чтобы показать «ИММУНИТЕТ» вместо молчаливого 0.
   */
  onDamageIgnored?: (target: TankLike, source: TankLike) => void;
  /** Вызывается при уничтожении блока арены (для взрыва/дебриса). */
  onBlockDestroyed: (pos: THREE.Vector3, size: number, blockId?: number) => void;
}
