// ===== Типы визуала и параметров танка (без сущности / без buildMesh) =====
// Вынесены, чтобы разорвать цикл Tank.ts ↔ tank/buildMesh.ts.
import type * as THREE from 'three';
import type { CritTuning, DamageType, WeaponType } from '../../core/catalog';

export interface TankVisual {
  group: THREE.Group;
  hull: THREE.Group;
  turret: THREE.Group;
  barrelGroup: THREE.Group;
  muzzle: THREE.Object3D;
  ring: THREE.Mesh;
  bodyMats: THREE.MeshStandardMaterial[];
  /**
   * Исходный `color` каждого материала из `bodyMats` (hex, тот же порядок).
   * FX (hit-flash, damage darkening, death fade) масштабируют базу, а не
   * затирают её белым — иначе accent-металл терял бы свой цвет навсегда.
   */
  bodyBaseColors: number[];
  trackLeftTex?: THREE.CanvasTexture;
  trackRightTex?: THREE.CanvasTexture;
  /** Primary / legacy trackTex reference (alias for trackLeftTex) */
  trackTex: THREE.CanvasTexture;
  railGlowMat?: THREE.MeshStandardMaterial;
  /**
   * Купол респавн-неуязвимости (п.15): аддитивная сфера вокруг корпуса,
   * `visible = false` вне щита. Геометрия/материал — на танк (как `ring`),
   * видимость и пульс ведёт TankAnimationSystem по `invulnT`.
   */
  shield?: THREE.Mesh;
}

export interface TankParams {
  maxHealth: number;
  speed: number;
  reverseSpeed: number;
  turnSpeed: number;
  turretSpeed: number;
  damage: number;
  shotCooldown: number;
  weaponType?: WeaponType;
  range?: number;
  /**
   * Вертикальное наведение ствола (УВН) из каталога башни. Опциональны, чтобы
   * не ломать тестовые двойники, не участвующие в питч-айме; тогда TankAimSystem
   * держит ствол горизонтально (0). Реальные танки всегда получают значения.
   */
  elevationAngle?: number;
  depressionAngle?: number;
  pitchSpeed?: number;
  /**
   * Тип урона башни (ключ таблицы сопротивлений цели) и кривая крита орудия.
   * Опциональны ради тестовых двойников: без них DamageSystem работает так же,
   * как до введений контр-пиков (множитель 1, крита нет).
   */
  damageType?: DamageType;
  /** Сопротивления корпуса по типу урона (из `HullDef.resist`). */
  damageResist?: Partial<Record<DamageType, number>>;
  critTuning?: CritTuning;
}

/** Представленческое/визуальное состояние танка (только FX), не входит в
 *  симуляционный контракт TankLike. Читается/пишется системами анимации и FX. */
export interface TankFxState {
  hitFlash: number;
  /** Мятная вспышка «нано-ремонта» («Изида» лечит этот танк). Симметрична hitFlash. */
  healFlash: number;
  barrelKick: number;
  smokeAcc: number;
  dustAcc: number;
  /** Пройденное расстояние гусениц для спавна отпечатков траков (м). */
  trackDist?: number;
  /** Продольный наклон корпуса (pitch, рад): > 0 клевок носом, < 0 приседание на корму. */
  pitch: number;
  /** Угловая скорость продольного наклона (рад/с). */
  pitchVel: number;
  /** Боковой крен корпуса (roll, рад): крен в виражах и от боковой отдачи. */
  roll: number;
  /** Угловая скорость бокового крена (рад/с). */
  rollVel: number;
  /** Скорость на предыдущем кадре для оценки мгновенного ускорения (м/с). */
  prevSpeed: number;
}
