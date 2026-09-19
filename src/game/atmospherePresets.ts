// ===== Пресеты атмосферы по картам (Стилизованный Low-Poly / Cel-Shaded / Комикс): =====
// city = Comic Metropolis Noon (яркий лазурный полдень, контрастное солнце, чистые тени);
// factory = Comic Industrial Sunset (графичный янтарный закат, тёплая медь, глубокие тени);
// village = Comic Pastoral Daylight (свежий солнечный день, сочное золотое освещение).
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

const COMIC_CITY: AtmospherePreset = {
  background: 0x3a7ea8,
  fogColor: 0x5a9ec6, fogNear: 160, fogFar: 560,
  exposure: 1.15,
  hemiSky: 0xc5e4ff, hemiGround: 0x28323e, hemiIntensity: 0.65,
  sunColor: 0xffffff, sunIntensity: 2.5, sunPosition: [120, 180, 70],
  rimColor: 0x70c5ff, rimIntensity: 0.55,
  skyZenith: [0.14, 0.42, 0.88], skyHorizon: [0.62, 0.80, 0.96], skyCloud: [1.0, 1.0, 1.0],
  skySunDir: [0.48, 0.72, 0.35],
  skySunDisc: [1.0, 1.0, 0.96], skySunGlow: [0.8, 0.9, 1.0],
};

const COMIC_FACTORY: AtmospherePreset = {
  background: 0x323c4a,
  fogColor: 0x445263, fogNear: 140, fogFar: 520,
  exposure: 1.15,
  hemiSky: 0xa8c8e8, hemiGround: 0x242a32, hemiIntensity: 0.65,
  sunColor: 0xffffff, sunIntensity: 2.5, sunPosition: [135, 150, 55],
  rimColor: 0x78b0f0, rimIntensity: 0.60,
  skyZenith: [0.15, 0.40, 0.80], skyHorizon: [0.60, 0.76, 0.92], skyCloud: [1.0, 1.0, 1.0],
  skySunDir: [0.55, 0.60, 0.35],
  skySunDisc: [1.0, 1.0, 1.0], skySunGlow: [0.75, 0.88, 1.0],
};

const COMIC_VILLAGE: AtmospherePreset = {
  background: 0x4a88b8,
  fogColor: 0x6aa6d0, fogNear: 150, fogFar: 550,
  exposure: 1.18,
  hemiSky: 0xbfe0f8, hemiGround: 0x284a1e, hemiIntensity: 0.70,
  sunColor: 0xfffdf4, sunIntensity: 2.55, sunPosition: [150, 160, 85],
  rimColor: 0xd6f0ff, rimIntensity: 0.55,
  skyZenith: [0.12, 0.45, 0.90], skyHorizon: [0.68, 0.86, 0.98], skyCloud: [1.0, 1.0, 1.0],
  skySunDir: [0.62, 0.65, 0.40],
  skySunDisc: [1.0, 1.0, 0.95], skySunGlow: [0.85, 0.92, 1.0],
};

export const ATMOSPHERES: Record<MapId, AtmospherePreset> = {
  factory: COMIC_FACTORY,
  city: COMIC_CITY,
  village: COMIC_VILLAGE,
};

export function getAtmosphere(mapId: MapId): AtmospherePreset {
  return ATMOSPHERES[mapId];
}
