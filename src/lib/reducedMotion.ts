// ===== Единый гейт prefers-reduced-motion для вестибулярных эффектов =====
// Тряска камеры (trauma), FOV-punch и charge-zoom — вестибулярная нагрузка:
// при `prefers-reduced-motion: reduce` глушатся до 0. CSS-анимации, радар
// (minimapDraw) и CountUp уже покрыты, этот хелпер закрывает симуляцию
// (CameraShake, Effects, PlayingCameraMode).
// Кешируется ЖИВОЙ MediaQueryList, а не значение: `window.matchMedia(q)`
// конструирует новый MQL на каждый вызов, а гейт дёргается ~4 раза на кадр
// (240 мёртвых MQL/с), тогда как `matches` на одном MQL меняется сам при
// переключении настройки ОС посреди боя. Пересоздаём кеш только если
// подменили саму функцию `window.matchMedia` (смена окна, тестовые стабы) —
// идентичность функции и есть признак нового окружения.
export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

type MediaQueryFactory = (query: string) => MediaQueryList;

let cachedFactory: MediaQueryFactory | null = null;
let cachedMql: MediaQueryList | null = null;

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  const factory: MediaQueryFactory | undefined = window.matchMedia;
  // jsdom/SSR: matchMedia нет — гейт закрыт, кеш не трогаем.
  if (!factory) return false;
  let mql = cachedMql;
  if (cachedFactory !== factory || !mql) {
    // Бросок отсекаем и кеш сбрасываем: иначе следующий кадр пошёл бы к
    // протухшему MQL. Повторная попытка случится на следующем вызове.
    cachedFactory = null;
    cachedMql = null;
    try {
      mql = factory.call(window, REDUCED_MOTION_QUERY) ?? null;
    } catch {
      return false;
    }
    if (!mql) return false;
    cachedMql = mql;
    cachedFactory = factory;
  }
  return mql.matches;
}
