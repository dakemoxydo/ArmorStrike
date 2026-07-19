// ===== Каталог карт: id, метаданные для UI =====

export type MapId = 'factory' | 'village' | 'city';

export interface MapDef {
  id: MapId;
  name: string;
  nameEn: string;
  blurb: string;
  /** CSS accent for map card (rgb channels or hex for inline styles). */
  accent: string;
  accentRgb: string;
}

export const MAPS: Record<MapId, MapDef> = {
  factory: {
    id: 'factory',
    name: 'Завод',
    nameEn: 'Factory',
    blurb: 'Литейный комплекс: цеха, контейнеры, краны и разрушаемые укрытия.',
    accent: '#2ee6c0',
    accentRgb: '46, 230, 192',
  },
  village: {
    id: 'village',
    name: 'Деревня',
    nameEn: 'Village',
    blurb: 'Сельский посёлок на закате: рыночная площадь с колодцем, фахверковые дома и амбары, ветряк, пшеничные поля и дым из труб.',
    accent: '#c8a24a',
    accentRgb: '200, 162, 74',
  },
  city: {
    id: 'city',
    name: 'Город',
    nameEn: 'City',
    blurb: 'Огромный ночной downtown: широкий крест авеню, 4 квартала-district, плаза, эстакада и плотный неон.',
    accent: '#5ec8ff',
    accentRgb: '94, 200, 255',
  },
};

export const MAP_IDS: MapId[] = ['factory', 'village', 'city'];

export const DEFAULT_MAP_ID: MapId = 'factory';

export function isMapId(v: unknown): v is MapId {
  return v === 'factory' || v === 'village' || v === 'city';
}
