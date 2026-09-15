// ===== Тюнинг-константы: визуальные оффсеты и коэффициенты демпфирования =====
// Выделены из систем/симуляции, чтобы устранить дублирование «магических»
// чисел (напр. оффсет выхлопа 2.4) и централизовать баланс представления.

/** Расстояние позади танка для спавна выхлопа/пыли (по оси yaw + PI). */
export const BOOST_JET_OFFSET = 2.4;
/** Высота точки выхлопа нитро-струи. */
export const BOOST_JET_HEIGHT = 0.75;
/** Высота точки пыли из-под гусениц. */
export const DUST_HEIGHT = 0.35;
/** Случайный разброс позиции пыли вокруг точки. */
export const DUST_SPREAD = 1.2;

/** Коэффициенты демпфирования скорости (обычный / с нитро) — плавный разгон и осязаемый вес танка. */
export const SPEED_DAMP = { normal: 2.8, boost: 4.2 };
/** Затухание отбрасывания (knockback) за секунду. */
export const KNOCKBACK_DECAY = 5.5;
/** Порог здоровья для появления дыма повреждений (доля от max). */
export const SMOKE_HEALTH_FRAC = 0.32;

/**
 * Настройки ремонта вне боя (Out-of-Combat Repair).
 * Если танк не получал урон в течение `outOfCombatDelaySec`, запускается плавное
 * восстановление здоровья: `baseRatePerSec + maxHealth * maxHealthFracPerSec` до maxHealth.
 */
export const REPAIR_TUNING = {
  outOfCombatDelaySec: 5.0,
  baseRatePerSec: 8.0,
  maxHealthFracPerSec: 0.04,
  /** Базовая скорость для легких танков / легаси-ссылок. */
  repairRatePerSec: 8.0,
};

/**
 * Базовый rest Z ствола для recoil-анимации и сброса джиттера рельсы.
 * (Отдельные turret mesh builders могут ставить свой rest при сборке.)
 */
export const BARREL_REST_Z = 0.55;
/** Rest Y ствола для railgun charge jitter reset. */
export const BARREL_REST_Y = 0.5;

/**
 * Подсветка цели в прицеле (Target Highlight): красная обводка по внешнему
 * силуэту модели врага (inverted hull + stencil-маска, modelOutline.ts) —
 * внутренние стыки деталей обводкой не покрываются. Не кольцо и не прицел
 * игрока — обводится сам танк.
 * Источник истины для конуса детекции, гистерезиса и толщины обводки.
 */
export const TARGET_HIGHLIGHT = {
  /** Полуугол конуса «в прицеле», рад (≈4°) — пушка/рельса. Огнемёт берёт свой coneAngle. */
  coneRad: (4 * Math.PI) / 180,
  /** Задержка снятия подсветки, с: гистерезис против мигания на границе конуса. */
  holdSec: 0.15,
  /** Fallback дальности, если у танка не задан params.range. */
  defaultRange: 60,
  /** Цвет danger-красного (как hit-arc/HUD danger, 0xff2d3c). */
  color: 0xff2d3c,
  /**
   * Обводка по силуэту: core — толщина сплошной чёткой линии (м),
   * halo — толщина аддитивного ореола снаружи от неё (м). haloFall/haloExp —
   * форма спада ореола к внешнему краю (шкара яркости у линии / степень мягкости).
   * pulse — «дыхание» ореола: base ± amp на скорости speed (рад/с).
   */
  coreWidth: 0.14,
  haloWidth: 0.42,
  /** Контр-кант (E): ширина тёмной полоски снаружи от линии core, м. */
  rimWidth: 0.05,
  /** Контр-кант: почти-чёрный цвет под красной линией — обводка держится на светлом фоне. */
  rimColor: 0x0b0a10,
  /**
   * Экранная толщина (C): вершинный сдвиг всех shell-слоёв умножается на
   * mix(1, dist/widthRefDist, widthDistMix). widthRefDist — дистанция, на которой
   * толщины номинальны (м); widthDistMix 0..1 — сила поправки
   * (0 — чистые метры, 1 — постоянная толщина на экране).
   */
  widthRefDist: 60,
  widthDistMix: 0.6,
  haloFall: 2.6,
  haloExp: 1.6,
  pulse: { base: 0.85, amp: 0.25, speed: 3.2 },
};
