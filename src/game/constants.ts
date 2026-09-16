// ===== Глобальные настройки игры =====
export const ARENA = {
  size: 300,         // ширина/длина арены (все карты — factory/village/city — используют всю)
  wallH: 7.5,        // высота цеховых стен
  wallT: 3.5,        // толщина стен
};

export const TANK = {
  radius: 1.8,       // радиус кругового коллайдера
  /**
   * Мировая высота точки прицела цели (центр корпуса) для вертикальной
   * автонаводки. Совпадает с высотой поражения снаряда/луча (y≈1.6 в
   * Projectile/TankFx) — ствол наводится ровно туда, куда попадёт выстрел.
   */
  aimCenterY: 1.6,
};

// --- Ускорение (нитро) ---
export const BOOST = {
  multiplier: 1.5,       // множитель максимальной скорости при бусте
  drainPerSec: 0.35,     // расход энергии в секунду (полный запас ~2.85 с)
  rechargePerSec: 0.28,  // восстановление энергии в секунду
  minActivate: 0.1,      // минимум энергии для активации
};

export const PROJECTILE = {
  // No `speed` here on purpose: the flight speed lives in
  // WEAPON_TUNING.<weapon>.speed (catalogData) and is applied by each
  // ProjectileBehavior in init(). A legacy global `speed: 58` diverged from
  // the real cannon shell speed (48) and leaked into the AI lead math.
  range: 85,
  radius: 0.18,
};

export const SCORE = {
  kill: 100,
  /** «Изида»: очки поддержки за 1 ФАКТИЧЕСКИ вылеченный HP союзника. */
  supportPerHp: 1,
};
