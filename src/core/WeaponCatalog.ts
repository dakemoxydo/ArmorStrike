// ===== Единый каталог оружия: метаданные, метки и цвета =====
// Единственный источник истины для названий/цветов оружия.
// Ранее метки дублировались в HUD.tsx, App.tsx, Garage.tsx, AI.ts.
import type { WeaponType } from './catalog';

export type WeaponId = WeaponType;

export interface WeaponMeta {
  id: WeaponId;
  /** Короткий бренд-лейбл (англ.), напр. RAILGUN / FIREBIRD / СМОКИ. */
  label: string;
  /** Полное русское название оружия. */
  name: string;
  /** Краткая характеристика типа снаряда/луча (для паспорта гаража). */
  kind: string;
  /** HEX-цвет акцента (строка для CSS/React). */
  color: string;
  /** Tailwind-класс акцента для HUD. */
  accentClass: string;
}

export const WEAPONS: Record<WeaponId, WeaponMeta> = {
  railgun: {
    id: 'railgun',
    label: 'RAILGUN',
    name: 'РЕЛЬСОТРОН',
    kind: 'ЭНЕРГЕТИЧЕСКИЙ ЛУЧ',
    color: '#2ee6c0',
    accentClass: 'text-cyan-300/80',
  },
  flamethrower: {
    id: 'flamethrower',
    label: 'FIREBIRD',
    name: 'ОГНЕМЁТ',
    kind: 'ОГНЕННАЯ СТРУЯ',
    color: '#ff8a3d',
    accentClass: 'text-orange-300/80',
  },
  cannon: {
    id: 'cannon',
    label: 'СМОКИ',
    name: 'ПУШКА',
    kind: 'ФУГАСНЫЙ СНАРЯД',
    color: '#ffd24a',
    accentClass: 'text-amber-300/80',
  },
};

export function getWeaponMeta(id: WeaponId): WeaponMeta {
  return WEAPONS[id];
}
