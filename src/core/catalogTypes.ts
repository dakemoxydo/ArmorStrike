export type WeaponType = 'railgun' | 'flamethrower' | 'cannon' | 'gauss' | 'isida';

/**
 * Тип урона — ось контр-пиков сборки (по мотивам Tanki Online, где броня/пробитие
 * и модули защиты делят урон по источникам). Каждый корпус имеет таблицу
 * сопротивлений `HullDef.resist` по этим же ключам.
 */
export type DamageType = 'ballistic' | 'kinetic' | 'thermal' | 'nano';

/**
 * Кривая накопления крита (Tanki-style): шанс стартует с нуля — первый выстрел
 * критическим не бывает, каждое попадание добавляет `step` до потолка `max`,
 * после крита накопитель обнуляется.
 */
export interface CritTuning {
  /** Прибавка к шансу за каждое попадание (доля 0…1). */
  step: number;
  /** Потолок шанса крита (доля 0…1). */
  max: number;
  /** Множитель урона критического попадания. */
  multiplier: number;
}

export type HullId = 'hunter' | 'viking' | 'mammoth' | 'speedy' | 'titan';

export interface HullDef {
  id: HullId;
  name: string;
  maxHealth: number;
  speed: number;
  reverseSpeed: number;
  turnSpeed: number;
  desc: string;
  badge: string;
  /**
   * Сопротивление корпусов по типу урона: доля ПОГЛОЩЁННОГО урона
   * (0.15 = наносится 85%), отрицательное значение = уязвимость
   * (−0.35 = наносится 135%). Сумма по всем типам = 0 → средний входящий
   * урон (а значит и базовый TTK) не меняется, меняется только распределение
   * по контр-пикам. Пин — `damageTypesAndCrits.test.ts`.
   */
  resist: Partial<Record<DamageType, number>>;
}

export type TurretId = 'railgun' | 'flamethrower' | 'cannon' | 'gauss' | 'isida';

export interface TurretDef {
  id: TurretId;
  name: string;
  weaponType: WeaponType;
  /** Тип урона этого орудия — ключ таблицы сопротивлений цели. */
  damageType: DamageType;
  damage: number;
  shotCooldown: number;
  magazine: number;
  fullReload: number;
  /** Угловая скорость поворота башни в горизонте (рад/с). */
  turretSpeed: number;
  recoil: number;
  range: number;
  /** Максимальный угол задирания ствола вверх (рад). Вертикальная автонаводка. */
  elevationAngle: number;
  /** Максимальный угол опускания ствола вниз (рад, величина положительная). */
  depressionAngle: number;
  /** Угловая скорость наклона ствола (рад/с), плавный довод pitch-аима. */
  pitchSpeed: number;
  desc: string;
  badge: string;
}
