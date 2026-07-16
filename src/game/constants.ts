// ===== Глобальные настройки игры =====
export const ARENA = {
  size: 150,         // ширина/длина территории завода
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

export const botStatsForWave = (wave: number) => ({
  maxHealth: 55 + (wave - 1) * 12,
  damage: 10 + wave,
  speed: Math.min(13.5, 10.5 + wave * 0.5),
  reverseSpeed: 7,
  turnSpeed: 2.3,
  turretSpeed: 3.4 + wave * 0.25,
  shotCooldown: Math.max(1.0, 1.65 - wave * 0.08),
  sightRange: 46,
  fireRange: 40,
  aimError: Math.max(0.05, 0.14 - wave * 0.012),
});

export const botsForWave = (wave: number) => Math.min(2 + wave, 5);

export const PROJECTILE = {
  speed: 58,
  range: 85,
  radius: 0.18,
};

export const SCORE = {
  kill: 100,
  waveBonus: (wave: number) => 150 + wave * 50,
};
