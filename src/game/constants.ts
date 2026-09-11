// ===== Глобальные настройки игры =====
export const ARENA = {
  size: 300,         // ширина/длина арены (все карты — factory/village/city — используют всю)
  wallH: 7.5,        // высота цеховых стен
  wallT: 3.5,        // толщина стен
};

export const TANK = {
  radius: 1.8,       // радиус кругового коллайдера
};

// --- Ускорение (нитро) ---
export const BOOST = {
  multiplier: 1.5,       // множитель максимальной скорости при бусте
  drainPerSec: 0.5,      // расход энергии в секунду (полный запас ~2с)
  rechargePerSec: 0.28,  // восстановление энергии в секунду
  minActivate: 0.1,      // минимум энергии для активации
};

export const PROJECTILE = {
  speed: 58,
  range: 85,
  radius: 0.18,
};

export const SCORE = {
  kill: 100,
};
