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
    /** Life of the visual beam — one arc layer, fade curve in RailgunBeamFx. */
    beamDuration: 0.42,
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
    /** Visual beam delay after hitscan resolve (seconds) — weight/anticipation. */
    tracerDelay: 0.025,
    /** M20: speed (units/s) at which the beam front runs from muzzle to terminus. */
    beamFrontSpeed: 2400,
    /** M21: contact charge balls at the muzzle (RailgunChargeBalls / chargeBallRadii). */
    chargeBalls: {
      /** Electric ball radius at charge start (grows to contactRadius ∝ p²). */
      electricStart: 0.05,
      /** White "air" ball radius at charge start (collapses to contactRadius ∝ 1−(1−p)²). */
      airStart: 0.9,
      /** Both radii meet here at p = 1 — the "contact" frame is the fire frame. */
      contactRadius: 0.3,
      /** Air pop expands to this radius while fading after the shot. */
      airPopRadius: 0.75,
      /** Release animation duration (s): spark collapses, air pops. */
      releaseDuration: 0.09,
    },
    /** Per-pierce impact colors [1st, 2nd, 3rd+]. Bright → dim for penetration feedback. */
    pierceColors: [0x8fffe8, 0x6fe8ff, 0x4ecfe0] as const,
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
    /** Shell flight speed — the single source of truth (AI lead reads it too). */
    speed: 48,
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
    badge: 'УНИВЕРСАЛ',
  },
  viking: {
    id: 'viking',
    name: 'Викинг',
    maxHealth: 80,
    speed: 19.5,
    reverseSpeed: 12.0,
    turnSpeed: 3.6,
    desc: 'Штурмовой низкопрофильный корпус. Высокая скорость и манёвренность для быстрых атак.',
    badge: 'ШТУРМОВОЙ',
  },
  mammoth: {
    id: 'mammoth',
    name: 'Мамонт',
    maxHealth: 160,
    speed: 11.0,
    reverseSpeed: 7.0,
    turnSpeed: 2.1,
    desc: 'Сверхтяжёлая монолитная броня. Пониженная мобильность компенсируется огромным запасом прочности.',
    badge: 'ТЯЖЁЛЫЙ',
  },
  speedy: {
    id: 'speedy',
    name: 'Speedy',
    maxHealth: 70,
    speed: 23.5,
    reverseSpeed: 14.5,
    turnSpeed: 4.4,
    desc: 'Сверхлёгкий низкопрофильный корпус-перехватчик. Абсолютная скорость и разворот — ценой почти полного отсутствия брони.',
    badge: 'ПЕРЕХВАТЧИК',
  },
  titan: {
    id: 'titan',
    name: 'Титан',
    maxHealth: 190,
    speed: 9.5,
    reverseSpeed: 6.0,
    turnSpeed: 1.8,
    desc: 'Флагман брони: разнесённые экраны, навесная защита лба и самая большая масса в игре. Скорость и разворот — самые низкие в каталоге.',
    badge: 'ФЛАГМАН',
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
    badge: 'СНАЙПЕР',
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
    badge: 'ОГНЕМЁТ',
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
    badge: 'АВТОМАТ',
  },
};

export const HULL_IDS = Object.keys(HULLS) as HullId[];
export const TURRET_IDS = Object.keys(TURRETS) as TurretId[];
