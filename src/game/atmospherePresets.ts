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
  background: 0x4a8ebb,
  fogColor: 0x6aaed6, fogNear: 150, fogFar: 550,
  exposure: 1.15,
  hemiSky: 0xbee0f8, hemiGround: 0x324456, hemiIntensity: 0.65,
  sunColor: 0xfff4d6, sunIntensity: 2.4, sunPosition: [120, 180, 70],
  rimColor: 0x60c8ff, rimIntensity: 0.55,
  skyZenith: [0.18, 0.45, 0.85], skyHorizon: [0.65, 0.82, 0.96], skyCloud: [0.95, 0.98, 1.0],
  skySunDir: [0.48, 0.72, 0.35],
  skySunDisc: [1.0, 0.96, 0.85], skySunGlow: [0.8, 0.9, 1.0],
};

const COMIC_FACTORY: AtmospherePreset = {
  background: 0x382216,
  fogColor: 0x523522, fogNear: 130, fogFar: 500,
  exposure: 1.18,
  hemiSky: 0xffc892, hemiGround: 0x2c1e14, hemiIntensity: 0.62,
  sunColor: 0xffa84d, sunIntensity: 2.6, sunPosition: [135, 140, 50],
  rimColor: 0xff7b22, rimIntensity: 0.65,
  skyZenith: [0.28, 0.22, 0.38], skyHorizon: [0.98, 0.60, 0.28], skyCloud: [0.95, 0.52, 0.35],
  skySunDir: [0.55, 0.55, 0.35],
  skySunDisc: [1.0, 0.85, 0.50], skySunGlow: [1.0, 0.60, 0.30],
};

const COMIC_VILLAGE: AtmospherePreset = {
  background: 0x5288a8,
  fogColor: 0x78a8be, fogNear: 140, fogFar: 520,
  exposure: 1.20,
  hemiSky: 0xd2ecf9, hemiGround: 0x3a4828, hemiIntensity: 0.68,
  sunColor: 0xfff0c8, sunIntensity: 2.5, sunPosition: [160, 150, 90],
  rimColor: 0xffc466, rimIntensity: 0.60,
  skyZenith: [0.22, 0.48, 0.82], skyHorizon: [0.72, 0.86, 0.94], skyCloud: [0.96, 0.98, 1.0],
  skySunDir: [0.65, 0.60, 0.42],
  skySunDisc: [1.0, 0.94, 0.80], skySunGlow: [0.9, 0.85, 0.7],
};

export const ATMOSPHERES: Record<MapId, AtmospherePreset> = {
  factory: COMIC_FACTORY,
  city: COMIC_CITY,
  village: COMIC_VILLAGE,
};

export function getAtmosphere(mapId: MapId): AtmospherePreset {
  return ATMOSPHERES[mapId];
}
