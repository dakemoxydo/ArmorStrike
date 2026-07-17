export type WeaponType = 'railgun' | 'flamethrower' | 'cannon';

export type HullId = 'hunter' | 'viking' | 'mammoth';

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

export type TurretId = 'railgun' | 'flamethrower' | 'cannon';

export interface TurretDef {
  id: TurretId;
  name: string;
  weaponType: WeaponType;
  damage: number;
  shotCooldown: number;
  magazine: number;
  fullReload: number;
  turretSpeed: number;
  recoil: number;
  range: number;
  desc: string;
  badge: string;
}
