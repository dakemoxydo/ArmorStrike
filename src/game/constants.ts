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

// --- CONFIGURATIONS FOR WEAPONS ---

export const RAILGUN_CONFIG = {
  chargeTime: 1.1,         // секунды накопления заряда
  reloadTime: 4.8,          // секунды полной перезарядки после выстрела
  damage: 85,               // базовый урон первому объекту
  penetrationFactor: 0.65,  // множитель пробития: D_N = D_(N-1) * 0.65
  range: 120.0,             // максимальная дальность raycast
  knockback: 18.0,          // импульс отбрасывания целей и откат танка
  emissiveIdle: 0.15,       // базовое свечение в покое
  emissiveCharged: 4.5,     // пиковое свечение перед выстрелом
  beamDuration: 0.25,       // длительность видимости луча (сек)
};

export const FLAMETHROWER_CONFIG = {
  damagePerTick: 12,        // урон за один тик воздействия
  tickRate: 0.1,            // интервал между тиками урона (100мс)
  range: 22.0,              // максимальная дальность поражения
  coneAngle: Math.PI / 4,   // угол конуса поражения (~45 градусов)
  energyMax: 100,           // максимальный запас топлива
  consumptionRate: 28,      // расход топлива в сек
  rechargeRate: 22,         // восстановление топлива в сек
  knockback: 1.2,           // импульс прижимая/отталкивания
  particleCount: 160,       // размер пула InstancedMesh частиц
  spawnRate: 40,            // количество спавна частиц в сек
};

export const CANNON_CONFIG = {
  damage: 32,
  shotCooldown: 0.28,
  magazine: 10,
  reloadTime: 1.8,
  range: 75.0,
  knockback: 5.5,
  splashRadius: 5.0,
  splashDmg: 16,
};

// --- Типы корпусов ---
export type HullId = 'hunter' | 'viking' | 'mammoth';

export interface HullDef {
  id: HullId;
  name: string;
  maxHealth: number;
  speed: number;
  reverseSpeed: number;
  turnSpeed: number;
  desc: string;
  badge: string;
}

export const HULLS: Record<HullId, HullDef> = {
  hunter: {
    id: 'hunter',
    name: 'Хантер',
    maxHealth: 100,
    speed: 15.5,
    reverseSpeed: 9.5,
    turnSpeed: 2.9,
    desc: 'Универсальный средний корпус. Отличное сочетание брони и скорости для любых задач.',
    badge: 'Средняя броня',
  },
  viking: {
    id: 'viking',
    name: 'Викинг',
    maxHealth: 80,
    speed: 19.5,
    reverseSpeed: 12.0,
    turnSpeed: 3.6,
    desc: 'Штурмовой низкопрофильный корпус. Высокая скорость и манёвренность для быстрых атак.',
    badge: 'Высокая скорость',
  },
  mammoth: {
    id: 'mammoth',
    name: 'Мамонт',
    maxHealth: 160,
    speed: 11.0,
    reverseSpeed: 7.0,
    turnSpeed: 2.1,
    desc: 'Сверхтяжёлая монолитная броня. Пониженная мобильность компенсируется огромным запасом прочности.',
    badge: 'Макс. броня',
  },
};

// --- Типы башен (оружия) ---
export type TurretId = 'railgun' | 'flamethrower' | 'cannon';

export interface TurretDef {
  id: TurretId;
  name: string;
  weaponType: 'railgun' | 'flamethrower' | 'cannon';
  damage: number;
  shotCooldown: number;
  magazine: number;
  fullReload: number;
  turretSpeed: number;
  recoil: number;
  range: number;
  desc: string;
  badge: string;
}

export const TURRETS: Record<TurretId, TurretDef> = {
  railgun: {
    id: 'railgun',
    name: 'Рельсотрон',
    weaponType: 'railgun',
    damage: RAILGUN_CONFIG.damage,
    shotCooldown: 0, // управляется FSM заряда
    magazine: 1,
    fullReload: RAILGUN_CONFIG.reloadTime,
    turretSpeed: 9.0,
    recoil: RAILGUN_CONFIG.knockback,
    range: RAILGUN_CONFIG.range,
    desc: 'Hitscan-орудие с накоплением заряда и сквозным пробитием нескольких целей.',
    badge: 'Снайперское',
  },
  flamethrower: {
    id: 'flamethrower',
    name: 'Огнемёт «Firebird»',
    weaponType: 'flamethrower',
    damage: FLAMETHROWER_CONFIG.damagePerTick,
    shotCooldown: 0, // непрерывное удерживание
    magazine: FLAMETHROWER_CONFIG.energyMax,
    fullReload: 0, // непрерывная регенерация энергии
    turretSpeed: 11.5,
    recoil: FLAMETHROWER_CONFIG.knockback,
    range: FLAMETHROWER_CONFIG.range,
    desc: 'Выпускает раскалённый конус пламени. Непрерывный тиковый урон по геометрии конуса.',
    badge: 'Пламенный конус',
  },
  cannon: {
    id: 'cannon',
    name: 'Пушка «Смоки»',
    weaponType: 'cannon',
    damage: CANNON_CONFIG.damage,
    shotCooldown: CANNON_CONFIG.shotCooldown,
    magazine: CANNON_CONFIG.magazine,
    fullReload: CANNON_CONFIG.reloadTime,
    turretSpeed: 10.5,
    recoil: CANNON_CONFIG.knockback,
    range: CANNON_CONFIG.range,
    desc: 'Скорострельная крупнокалиберная автопушка с фугасным поражением площади.',
    badge: 'Скорострельная',
  },
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

export const COLORS = {
  player: 0x2ee6c0,
  playerAccent: 0xfff2c9,
  bots: [0xff4d3d, 0xff9433, 0xff3d77, 0xffc93d, 0xb44dff],
};
