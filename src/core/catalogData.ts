import type { HullId, HullDef, TurretId, TurretDef } from './catalogTypes';

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
    /** Body beam fade (core shorter, glow slightly longer in RailgunBeamFx). */
    beamDuration: 0.32,
    magazine: 1,
    /** Camera trauma on fire (player / bot). */
    fireShakePlayer: 0.48,
    fireShakeBot: 0.14,
    /** Peak micro-shake while charging (player only). */
    chargeShakePeak: 0.055,
    /** FOV tighten at full charge (degrees, player). */
    chargeFovTighten: 2.8,
    /** FOV punch on fire (degrees, player). */
    fireFovPunch: 5.5,
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

export const TURRETS: Record<TurretId, TurretDef> = {
  railgun: {
    id: 'railgun',
    name: 'Рельсотрон',
    weaponType: 'railgun',
    damage: WEAPON_TUNING.railgun.damage,
    shotCooldown: 0,
    magazine: WEAPON_TUNING.railgun.magazine,
    fullReload: WEAPON_TUNING.railgun.reloadTime,
    turretSpeed: 9.0,
    recoil: WEAPON_TUNING.railgun.knockback,
    range: WEAPON_TUNING.railgun.range,
    desc: 'Hitscan-орудие с накоплением заряда и сквозным пробитием нескольких целей.',
    badge: 'Снайперское',
  },
  flamethrower: {
    id: 'flamethrower',
    name: 'Огнемёт «Firebird»',
    weaponType: 'flamethrower',
    damage: WEAPON_TUNING.flamethrower.damagePerTick,
    shotCooldown: 0,
    magazine: WEAPON_TUNING.flamethrower.energyMax,
    fullReload: 0,
    turretSpeed: 11.5,
    recoil: WEAPON_TUNING.flamethrower.knockback,
    range: WEAPON_TUNING.flamethrower.range,
    desc: 'Выпускает раскалённый конус пламени. Непрерывный тиковый урон по геометрии конуса.',
    badge: 'Пламенный конус',
  },
  cannon: {
    id: 'cannon',
    name: 'Пушка «Смоки»',
    weaponType: 'cannon',
    damage: WEAPON_TUNING.cannon.damage,
    shotCooldown: WEAPON_TUNING.cannon.shotCooldown,
    magazine: WEAPON_TUNING.cannon.magazine,
    fullReload: WEAPON_TUNING.cannon.reloadTime,
    turretSpeed: 10.5,
    recoil: WEAPON_TUNING.cannon.knockback,
    range: WEAPON_TUNING.cannon.range,
    desc: 'Скорострельная крупнокалиберная автопушка с фугасным поражением площади.',
    badge: 'Скорострельная',
  },
};

export const HULL_IDS = Object.keys(HULLS) as HullId[];
export const TURRET_IDS = Object.keys(TURRETS) as TurretId[];
