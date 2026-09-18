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
    blurb: 'Литейный комплекс ЗАВОД-51: домна и цеха, контейнерный терминал, портальный кран над плазой, цистерны и разрушаемые укрытия.',
    accent: '#f59e0b',
    accentRgb: '245, 158, 11',
  },
  village: {
    id: 'village',
    name: 'Деревня',
    nameEn: 'Village',
    blurb: 'Сельский посёлок на закате: рыночная площадь с колодцем, часовня с колокольней, фахверковые дома и амбары, ветряк, пруд, фруктовый сад и дым из труб.',
    accent: '#c8a24a',
    accentRgb: '200, 162, 74',
  },
  city: {
    id: 'city',
    name: 'Город',
    nameEn: 'City',
    blurb: 'Огромный ночной мегаполис: широкий крест авеню, 4 квартала-района, плаза, эстакада и плотный неон.',
    accent: '#5ec8ff',
    accentRgb: '94, 200, 255',
  },
};

export const MAP_IDS: MapId[] = ['factory', 'village', 'city'];

export const DEFAULT_MAP_ID: MapId = 'factory';

export function isMapId(v: unknown): v is MapId {
  return v === 'factory' || v === 'village' || v === 'city';
}
