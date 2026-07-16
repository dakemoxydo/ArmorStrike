// ===== Каталог корпусов и башен (чистые доменные данные, без Three.js) =====
// Единый источник истины для HULLS/TURRETS и связанных типов.
// Не импортирует ничего из game/* — чтобы избежать цикла core → game.

export type WeaponType = 'railgun' | 'flamethrower' | 'cannon';

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
    damage: 85,
    shotCooldown: 0, // управляется FSM заряда
    magazine: 1,
    fullReload: 4.8,
    turretSpeed: 9.0,
    recoil: 18,
    range: 120.0,
    desc: 'Hitscan-орудие с накоплением заряда и сквозным пробитием нескольких целей.',
    badge: 'Снайперское',
  },
  flamethrower: {
    id: 'flamethrower',
    name: 'Огнемёт «Firebird»',
    weaponType: 'flamethrower',
    damage: 12,
    shotCooldown: 0, // непрерывное удерживание
    magazine: 100,
    fullReload: 0, // непрерывная регенерация энергии
    turretSpeed: 11.5,
    recoil: 1.2,
    range: 22.0,
    desc: 'Выпускает раскалённый конус пламени. Непрерывный тиковый урон по геометрии конуса.',
    badge: 'Пламенный конус',
  },
  cannon: {
    id: 'cannon',
    name: 'Пушка «Смоки»',
    weaponType: 'cannon',
    damage: 32,
    shotCooldown: 0.28,
    magazine: 10,
    fullReload: 1.8,
    turretSpeed: 10.5,
    recoil: 5.5,
    range: 75.0,
    desc: 'Скорострельная крупнокалиберная автопушка с фугасным поражением площади.',
    badge: 'Скорострельная',
  },
};

/** Идентификаторы корпусов/башен как массивы (для итерации и спавна ботов). */
export const HULL_IDS = Object.keys(HULLS) as HullId[];
export const TURRET_IDS = Object.keys(TURRETS) as TurretId[];

/**
 * Единый источник боевого баланса оружия (раньше дублировался в
 * game/constants.ts как RAILGUN_CONFIG / FLAMETHROWER_CONFIG / CANNON_CONFIG
 * и частично в TURRETS выше). Оружейные классы читают отсюда.
 */
export const WEAPON_TUNING = {
  railgun: {
    chargeTime: 1.1,
    reloadTime: 4.8,
    damage: 85,
    penetrationFactor: 0.65,
    range: 120.0,
    knockback: 18.0,
    emissiveIdle: 0.15,
    emissiveCharged: 4.5,
    beamDuration: 0.25,
  },
  flamethrower: {
    damagePerTick: 12,
    tickRate: 0.1,
    range: 22.0,
    coneAngle: Math.PI / 4,
    energyMax: 100,
    consumptionRate: 28,
    rechargeRate: 22,
    knockback: 1.2,
    particleCount: 160,
    spawnRate: 40,
  },
  cannon: {
    damage: 32,
    shotCooldown: 0.28,
    magazine: 10,
    reloadTime: 1.8,
    range: 75.0,
    knockback: 5.5,
    splashRadius: 5.0,
    splashDmg: 16,
  },
};
