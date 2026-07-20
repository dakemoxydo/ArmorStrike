// ===== Глобальные настройки игры =====
export const ARENA = {
  size: 300,         // ширина/длина арены (city/village используют всю; factory — центр)
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

/**
 * AI-only knobs (Normal tier). Combat HP/damage/speed come from createTankEntity
 * healthScale/damageScale at spawn — not from this helper.
 * `wave` kept for spawnBot compatibility until match roster (P1) replaces scaling.
 */
export const botAiForWave = (wave: number) => ({
  sightRange: 46,
  // Normal: mild skill ramp for legacy spawn path; P1 may pin a fixed tier.
  aimError: Math.max(0.05, 0.14 - wave * 0.012),
});

/** @deprecated alias — use botAiForWave (only sightRange/aimError are consumed). */
export const botStatsForWave = botAiForWave;

export const PROJECTILE = {
  speed: 58,
  range: 85,
  radius: 0.18,
};

export const SCORE = {
  kill: 100,
};
