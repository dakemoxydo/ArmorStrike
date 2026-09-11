// ===== Пресеты атмосферы по картам: небо / туман / солнце / hemisphere / rim / экспозиция =====
// city = legacy cold night (нулевой визуальный регресс);
// factory = натриевая смога-ночь (промзона: амбер-дымка, оранжевый rim);
// village = тёплый golden-hour dusk.
import type { MapId } from './maps/mapCatalog';

export interface AtmospherePreset {
  background: number;
  fogColor: number;
  fogNear: number;
  fogFar: number;
  exposure: number;
  hemiSky: number;
  hemiGround: number;
  hemiIntensity: number;
  sunColor: number;
  sunIntensity: number;
  sunPosition: [number, number, number];
  rimColor: number;
  rimIntensity: number;
  skyZenith: [number, number, number];
  skyHorizon: [number, number, number];
  skyCloud: [number, number, number];
  skySunDir: [number, number, number];
  skySunDisc: [number, number, number];
  skySunGlow: [number, number, number];
}

const NIGHT: AtmospherePreset = {
  background: 0x060a12,
  fogColor: 0x0a0f18, fogNear: 130, fogFar: 440,
  exposure: 0.92,
  hemiSky: 0x8fb9d8, hemiGround: 0x0a0e14, hemiIntensity: 0.42,
  sunColor: 0xffe6c0, sunIntensity: 1.8, sunPosition: [116, 156, 64],
  rimColor: 0x2ee6c0, rimIntensity: 0.4,
  skyZenith: [0.03, 0.05, 0.09], skyHorizon: [0.10, 0.17, 0.26], skyCloud: [0.16, 0.22, 0.30],
  skySunDir: [0.5, 0.6, 0.4],
  skySunDisc: [1.0, 0.85, 0.6], skySunGlow: [0.5, 0.6, 0.8],
};

const DUSK: AtmospherePreset = {
  background: 0x2a1c16,
  fogColor: 0x6b4a34, fogNear: 118, fogFar: 460,
  exposure: 1.0,
  hemiSky: 0xffd9a8, hemiGround: 0x2a1c10, hemiIntensity: 0.52,
  sunColor: 0xffb066, sunIntensity: 2.0, sunPosition: [185, 78, 118],
  rimColor: 0xff9a4d, rimIntensity: 0.65,
  skyZenith: [0.20, 0.15, 0.27], skyHorizon: [0.96, 0.55, 0.30], skyCloud: [0.82, 0.48, 0.38],
  skySunDir: [0.75, 0.22, 0.48],
  skySunDisc: [1.0, 0.78, 0.46], skySunGlow: [1.0, 0.55, 0.28],
};

/**
 * Промзона: та же ночь, но воздух «сварен» — плотнее туман, тёплая натриевая
 * дымка и оранжевый rim. Отличает Завод от холодного неона Города с первого
 * взгляда, не трогая ни один пресет City/Village.
 */
const FACTORY: AtmospherePreset = {
  background: 0x0d0b08,
  fogColor: 0x1d1810, fogNear: 108, fogFar: 400,
  exposure: 0.95,
  hemiSky: 0xc0a077, hemiGround: 0x14100a, hemiIntensity: 0.5,
  sunColor: 0xffd0a0, sunIntensity: 1.65, sunPosition: [128, 150, 44],
  rimColor: 0xff8c30, rimIntensity: 0.52,
  skyZenith: [0.05, 0.045, 0.035], skyHorizon: [0.26, 0.19, 0.11], skyCloud: [0.22, 0.17, 0.12],
  skySunDir: [0.52, 0.6, 0.32],
  skySunDisc: [1.0, 0.82, 0.55], skySunGlow: [0.85, 0.58, 0.3],
};

export const ATMOSPHERES: Record<MapId, AtmospherePreset> = {
  factory: FACTORY,
  city: NIGHT,
  village: DUSK,
};

export function getAtmosphere(mapId: MapId): AtmospherePreset {
  return ATMOSPHERES[mapId];
}
