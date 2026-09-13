// ===== Пресеты качества графики (тени, pixel ratio) + localStorage =====

export type QualityLevel = 'low' | 'medium' | 'high';

export interface QualityPreset {
  id: QualityLevel;
  label: string;
  /** Верхняя граница devicePixelRatio */
  pixelRatioMax: number;
  /** Размер shadow map (квадрат) */
  shadowMapSize: number;
  /**
   * Scene-wide shadow toggle. Deliberately `true` at every tier (shadows scale
   * by map size only — see Docs/Architecture/Graphics_Presets_Matrix.md);
   * the flag stays so a future tier can disable them. The runtime toggle in
   * RenderWorld.applyQuality forces a one-time material recompile (three.js
   * does not recompile already-compiled materials on its own).
   */
  shadows: boolean;
}

export const QUALITY_PRESETS: Record<QualityLevel, QualityPreset> = {
  low: {
    id: 'low',
    label: 'НИЗК.',
    pixelRatioMax: 1,
    shadowMapSize: 512,
    shadows: true,
  },
  medium: {
    id: 'medium',
    label: 'СРЕДН.',
    pixelRatioMax: 1.5,
    shadowMapSize: 1024,
    shadows: true,
  },
  high: {
    id: 'high',
    label: 'ВЫСОК.',
    pixelRatioMax: 2,
    shadowMapSize: 2048,
    shadows: true,
  },
};

const ORDER: QualityLevel[] = ['low', 'medium', 'high'];
const LS_KEY = 'as2_quality';

export function loadQuality(): QualityLevel {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw === 'low' || raw === 'medium' || raw === 'high') return raw;
  } catch { /* ignore */ }
  return 'high';
}

export function saveQuality(level: QualityLevel) {
  try {
    localStorage.setItem(LS_KEY, level);
  } catch { /* ignore */ }
}

export function nextQuality(level: QualityLevel): QualityLevel {
  const i = ORDER.indexOf(level);
  return ORDER[(i + 1) % ORDER.length];
}

export function getQualityPreset(level: QualityLevel = loadQuality()): QualityPreset {
  return QUALITY_PRESETS[level];
}
