// ===== Пресеты прицела (точка / крест / полный) + localStorage =====
// Настройка чисто презентационная: HUD показывает/скрывает элементы прицела
// атрибутом `data-ch` (правила — в hud.css), игровой движок её не видит.

export type CrosshairStyle = 'dot' | 'cross' | 'ring';

export interface CrosshairStylePreset {
  id: CrosshairStyle;
  /** Подпись в пикере меню паузы. */
  label: string;
}

/** Порядок — обход пикера слева направо. */
export const CROSSHAIR_STYLES: readonly CrosshairStylePreset[] = [
  { id: 'dot', label: 'ТОЧКА' },
  { id: 'cross', label: 'КРЕСТ' },
  { id: 'ring', label: 'ПОЛНЫЙ' },
];

/** Минималистичная точка — пресет по умолчанию. */
export const DEFAULT_CROSSHAIR_STYLE: CrosshairStyle = 'dot';

const LS_KEY = 'as2_crosshair';

export function loadCrosshairStyle(): CrosshairStyle {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw === 'dot' || raw === 'cross' || raw === 'ring') return raw;
  } catch { /* ignore */ }
  return DEFAULT_CROSSHAIR_STYLE;
}

export function saveCrosshairStyle(style: CrosshairStyle): void {
  try {
    localStorage.setItem(LS_KEY, style);
  } catch { /* ignore */ }
}
