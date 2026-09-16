export type WeaponType = 'railgun' | 'flamethrower' | 'cannon' | 'gauss' | 'isida';

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
}

export type TurretId = 'railgun' | 'flamethrower' | 'cannon' | 'gauss' | 'isida';

export interface TurretDef {
  id: TurretId;
  name: string;
  weaponType: WeaponType;
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
