// ===== Настройки мыши (чувствительность + инверсия Y) + localStorage =====

export interface MouseSettings {
  sensitivity: number;
  invertY: boolean;
}

export const DEFAULT_MOUSE_SENSITIVITY = 1.0;
export const MIN_MOUSE_SENSITIVITY = 0.2;
export const MAX_MOUSE_SENSITIVITY = 3.0;
export const MOUSE_SENSITIVITY_STEP = 0.2;

const LS_SENS_KEY = 'as2_mouse_sens';
const LS_INVERT_Y_KEY = 'as2_invert_y';

export function loadMouseSettings(): MouseSettings {
  let sensitivity = DEFAULT_MOUSE_SENSITIVITY;
  let invertY = false;

  try {
    const rawSens = localStorage.getItem(LS_SENS_KEY);
    if (rawSens) {
      const parsed = parseFloat(rawSens);
      if (Number.isFinite(parsed) && parsed >= MIN_MOUSE_SENSITIVITY && parsed <= MAX_MOUSE_SENSITIVITY) {
        sensitivity = Math.round(parsed * 10) / 10;
      }
    }
    const rawInvert = localStorage.getItem(LS_INVERT_Y_KEY);
    if (rawInvert === 'true' || rawInvert === '1') {
      invertY = true;
    }
  } catch { /* ignore */ }

  return { sensitivity, invertY };
}

export function saveMouseSettings(settings: Partial<MouseSettings>): void {
  try {
    if (settings.sensitivity !== undefined) {
      localStorage.setItem(LS_SENS_KEY, settings.sensitivity.toFixed(1));
    }
    if (settings.invertY !== undefined) {
      localStorage.setItem(LS_INVERT_Y_KEY, settings.invertY ? 'true' : 'false');
    }
  } catch { /* ignore */ }
}
