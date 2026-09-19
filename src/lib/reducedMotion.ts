// ===== Единый гейт prefers-reduced-motion для вестибулярных эффектов =====
// Тряска камеры (trauma), FOV-punch и charge-zoom — вестибулярная нагрузка:
// при `prefers-reduced-motion: reduce` глушатся до 0. CSS-анимации, радар
// (minimapDraw) и CountUp уже покрыты, этот хелпер закрывает симуляцию
// (CameraShake, Effects, PlayingCameraMode).
// Прямой matchMedia-запрос без кеширования MQL: вызовов единицы на кадр,
// зато значение всегда живое (переключение настройки ОС посреди боя) и
// мокается в тестах обычной подменой window.matchMedia.
export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.matchMedia?.(REDUCED_MOTION_QUERY)?.matches ?? false;
  } catch {
    return false;
  }
}
