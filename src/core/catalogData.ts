import type { HullId, HullDef, TurretId, TurretDef } from './catalogTypes';

export const WEAPON_TUNING = {
  railgun: {
    chargeTime: 1.0,
    reloadTime: 2.6,
    damage: 85,
    penetrationFactor: 0.65,
    range: Infinity,
    knockback: 18.0,
    emissiveIdle: 0.15,
    emissiveCharged: 4.5,
    /** Life of the visual beam — one arc layer, fade curve in RailgunBeamFx. */
    beamDuration: 0.84,
    magazine: 1,
    /** Camera trauma on fire (player / bot). */
    fireShakePlayer: 0.48,
    fireShakeBot: 0.14,
    /** Bot trauma applies only while a live player is within this XZ range (units). */
    fireShakeBotRange: 45,
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
    /**
     * Крит: редкие тяжёлые выстрелы копят круто — 4-е попадание подряд
     * гарантированно критическое (0 → .25 → .5 → .75 → 1).
     */
    crit: { step: 0.25, max: 1, multiplier: 1.4 },
  },
  flamethrower: {
    damagePerTick: 5.2,
    tickRate: 0.1,
    range: 22.0,
    coneAngle: Math.PI / 4,
    energyMax: 100,
    consumptionRate: 28,
    rechargeRate: 22,
    knockback: 1.2,
    particleCount: 160,
    spawnRate: 40,
    /** Крит: частые тики копят медленно и с низким потолком (иначе DoT критовал бы всегда). */
    crit: { step: 0.02, max: 0.12, multiplier: 1.5 },
  },
  cannon: {
    damage: 25,
    /** Shell flight speed — the single source of truth (AI lead reads it too). */
    speed: 54,
    shotCooldown: 0.38,
    magazine: 6,
    reloadTime: 2.2,
    range: 75.0,
    knockback: 2.8,
    /** J12: самоотдача у ботов слабее (не «стоять на куске»); было хардкодом 4. */
    botKnockback: 2.0,
    splashRadius: 5.0,
    splashDmg: 12,
    /** Крит: скорострельная автопушка копит за очередь, потолок — 30%. */
    crit: { step: 0.06, max: 0.3, multiplier: 1.5 },
  },
  gauss: {
    damage: 65,
    arcadeDamage: 30,
    lockTime: 1.3,
    reloadTime: 2.2,
    arcadeReloadTime: 1.05,
    range: 110.0,
    arcadeRange: 85.0,
    lockConeAngle: 0.075,
    knockback: 16.0,
    arcadeKnockback: 6.0,
    magazine: 1,
    fireShakePlayer: 0.52,
    fireShakeBot: 0.16,
    beamDuration: 0.7,
    arcadeBeamDuration: 0.28,
    /** Крит: самый тяжёлый выстрел в игре копит быстрее всех, но множитель умеренный. */
    crit: { step: 0.3, max: 1, multiplier: 1.35 },
  },
  isida: {
    /** Тиковый урон по врагу = damagePerSec × tickRate (канон ТО: 30–66 HP/с, здесь M1–M2). */
    damagePerSec: 42,
    /** Лечение союзника в секунду (канон: ~половина урона). */
    healPerSec: 32,
    /** Доля ФАКТИЧЕСКОГО урона, возвращающаяся стрелку как HP (вампирство). */
    vampirism: 0.35,
    tickRate: 0.25,
    /** Дистанция луча/захвата (канон M0–M1: 15.9–18 м). */
    range: 20.0,
    /** Полуугол конуса автозахвата: канон — полный конус 20°. */
    coneHalfAngle: (10 * Math.PI) / 180,
    /** Пауза перестроения луча при захвате/смене цели (тиков нет). */
    acquireTime: 0.3,
    /** Союзник с HP ≥ (max × this) не захватывается — нет резона лечить. */
    healHpFrac: 0.99,
    energyMax: 100,
    /** Расход баллона зависит от режима (канон: атака 142 против 83.3 у.е./с). */
    drainAttack: 30,
    drainHeal: 18,
    /** Зажатый спуск без цели: луч «в холостую» жрёт вдвое меньше боевого. */
    drainIdle: 12,
    rechargeRate: 24,
    knockback: 0,
    /** Частицы потока нанороботов вдоль луча (InstancedMesh). */
    flowCount: 48,
    /** Края дуг по режимам (ядро всегда белое, как у рельсы). */
    colorAttack: 0xff2d6b,
    colorHeal: 0x39e6a8,
    colorIdle: 0x2ee6c0,
    /** Крит: накопитель один на башню — дуга и лечение критуются из него же. */
    crit: { step: 0.03, max: 0.15, multiplier: 1.4 },
  },
};

export const HULLS: Record<HullId, HullDef> = {
  hunter: {
    id: 'hunter',
    name: 'Хантер',
    maxHealth: 180,
    speed: 12.5,
    reverseSpeed: 8.0,
    turnSpeed: 2.4,
    desc: 'Универсальный средний корпус. Отличное сочетание брони и скорости для любых задач.',
    badge: 'УНИВЕРСАЛ',
    // Эталонный нейтральный корпус: без контр-пиков, от него меряются остальные.
    resist: {},
  },
  viking: {
    id: 'viking',
    name: 'Викинг',
    maxHealth: 150,
    speed: 15.0,
    reverseSpeed: 9.5,
    turnSpeed: 3.0,
    desc: 'Штурмовой низкопрофильный корпус. Высокая скорость и манёвренность для быстрых атак.',
    badge: 'ШТУРМОВОЙ',
    // Навесные экраны держат осколочно-фугасные снаряды, тяжёлый бронебойный
    // (рельса/гаусс) прошивает низкий профиль насквозь.
    resist: { ballistic: 0.10, kinetic: -0.15, thermal: 0.05 },
  },
  mammoth: {
    id: 'mammoth',
    name: 'Мамонт',
    maxHealth: 250,
    speed: 11.5,
    reverseSpeed: 7.5,
    turnSpeed: 2.2,
    desc: 'Сверхтяжёлая монолитная броня. Повышенная прочность при достойной штурмовой скорости.',
    badge: 'ТЯЖЁЛЫЙ',
    // Монолит держит кинетику, фугас его расшатывает, а нано-дуга работает прямо
    // по забронированной площади — по тяжёлому корпусу она больнее.
    resist: { kinetic: 0.15, ballistic: -0.10, thermal: 0.05, nano: -0.10 },
  },
  speedy: {
    id: 'speedy',
    name: 'Speedy',
    maxHealth: 120,
    speed: 18.0,
    reverseSpeed: 11.0,
    turnSpeed: 3.6,
    desc: 'Сверхлёгкий низкопрофильный корпус-перехватчик. Абсолютная скорость и разворот — ценой меньшей брони.',
    badge: 'ПЕРЕХВАТЧИК',
    // Брони нет вовсе: любой снаряд проходит «в мясо», зато обгоревший корпус
    // и нано-луч держат сравнительно хорошо (мало массы — нечему греться).
    resist: { ballistic: -0.05, kinetic: -0.05, thermal: 0.05, nano: 0.05 },
  },
  titan: {
    id: 'titan',
    name: 'Титан',
    maxHealth: 300,
    speed: 10.2,
    reverseSpeed: 6.5,
    turnSpeed: 1.9,
    desc: 'Флагман брони: разнесённые экраны, навесная защита лба и самая большая масса в игре. Несокрушимая огневая точка.',
    badge: 'ФЛАГМАН',
    // Разнесённые экраны + навесная защита гасят и снаряды, и кинетику, и пламя.
    // Единственная реальная уязвимость — нано-дуга: она «обнуляет» всю эту
    // многослойную броню, поэтому Изида и есть контр-пик флагмана (−35%).
    resist: { ballistic: 0.15, kinetic: 0.10, thermal: 0.10, nano: -0.35 },
  },
};

export const TURRETS: Record<TurretId, TurretDef> = {
  railgun: {
    id: 'railgun',
    name: 'Рельсотрон',
    weaponType: 'railgun',
    damageType: 'kinetic',
    damage: WEAPON_TUNING.railgun.damage,
    shotCooldown: 0,
    magazine: WEAPON_TUNING.railgun.magazine,
    fullReload: WEAPON_TUNING.railgun.reloadTime,
    turretSpeed: 7.5,
    recoil: WEAPON_TUNING.railgun.knockback,
    range: WEAPON_TUNING.railgun.range,
    // УВН тяжёлой снайперской пары: умеренные углы, медленный довод ствола.
    elevationAngle: (22 * Math.PI) / 180, // ≈ +22°
    depressionAngle: (14 * Math.PI) / 180, // ≈ −14°
    pitchSpeed: 6.0,
    desc: 'Hitscan-орудие с накоплением заряда и сквозным пробитием нескольких целей.',
    badge: 'СНАЙПЕР',
  },
  flamethrower: {
    id: 'flamethrower',
    name: 'Огнемёт «Firebird»',
    weaponType: 'flamethrower',
    damageType: 'thermal',
    damage: WEAPON_TUNING.flamethrower.damagePerTick,
    shotCooldown: 0,
    magazine: WEAPON_TUNING.flamethrower.energyMax,
    fullReload: 0,
    turretSpeed: 8.5,
    recoil: WEAPON_TUNING.flamethrower.knockback,
    range: WEAPON_TUNING.flamethrower.range,
    // Огнемёт: ближний бой, широкий сектор, быстрый довод лёгких стволов-насадок.
    elevationAngle: (30 * Math.PI) / 180, // ≈ +30°
    depressionAngle: (20 * Math.PI) / 180, // ≈ −20°
    pitchSpeed: 10.0,
    desc: 'Выпускает раскалённый конус пламени. Непрерывный тиковый урон по геометрии конуса.',
    badge: 'ОГНЕМЁТ',
  },
  cannon: {
    id: 'cannon',
    name: 'Пушка «Смоки»',
    weaponType: 'cannon',
    damageType: 'ballistic',
    damage: WEAPON_TUNING.cannon.damage,
    shotCooldown: WEAPON_TUNING.cannon.shotCooldown,
    magazine: WEAPON_TUNING.cannon.magazine,
    fullReload: WEAPON_TUNING.cannon.reloadTime,
    turretSpeed: 8.0,
    recoil: WEAPON_TUNING.cannon.knockback,
    range: WEAPON_TUNING.cannon.range,
    // Автопушка: базовые углы из черновика (~+22°/−14°), бодрый довод ствола.
    elevationAngle: (22 * Math.PI) / 180, // ≈ +22°
    depressionAngle: (14 * Math.PI) / 180, // ≈ −14°
    pitchSpeed: 8.0,
    desc: 'Скорострельная крупнокалиберная автопушка с фугасным поражением площади.',
    badge: 'АВТОМАТ',
  },
  gauss: {
    id: 'gauss',
    name: 'Пушка «Гаусс»',
    weaponType: 'gauss',
    damageType: 'kinetic',
    damage: WEAPON_TUNING.gauss.damage,
    shotCooldown: 0,
    magazine: WEAPON_TUNING.gauss.magazine,
    fullReload: WEAPON_TUNING.gauss.reloadTime,
    turretSpeed: 6.5,
    recoil: WEAPON_TUNING.gauss.knockback,
    range: WEAPON_TUNING.gauss.range,
    // Гаусс: самый тяжёлый ствол — узкий сектор, медленный довод (снайпер).
    elevationAngle: (18 * Math.PI) / 180, // ≈ +18°
    depressionAngle: (12 * Math.PI) / 180, // ≈ −12°
    pitchSpeed: 5.0,
    desc: 'Электромагнитная пушка: беглый огонь навскидку при клике и сокрушительный снайперский залп с автозахватом при удержании.',
    badge: 'СНАЙПЕР',
  },
  isida: {
    id: 'isida',
    name: 'Башня «Изида»',
    weaponType: 'isida',
    damageType: 'nano',
    // Тиковый урон (damagePerSec × tickRate): через TankParams.damage идёт
    // волновой scale у ботов (resolveWeaponDamage), как у огнемёта.
    damage: Math.round(WEAPON_TUNING.isida.damagePerSec * WEAPON_TUNING.isida.tickRate),
    shotCooldown: 0,
    magazine: WEAPON_TUNING.isida.energyMax,
    fullReload: 0,
    turretSpeed: 7.5,
    recoil: WEAPON_TUNING.isida.knockback,
    range: WEAPON_TUNING.isida.range,
    // «Изида»: лёгкая нано-башня, самый широкий сектор и быстрый довод
    // (луч должен успевать за целью на ближней-средней дистанции).
    elevationAngle: (32 * Math.PI) / 180, // ≈ +32°
    depressionAngle: (22 * Math.PI) / 180, // ≈ −22°
    pitchSpeed: 9.5,
    desc: 'Нано-дуга непрерывного действия: точит броню врага и лечит стрелка (вампирство), в командных режимах ремонтирует союзников. Баллон энергии.',
    badge: 'НАНОЛУЧ',
  },
};

export const HULL_IDS = Object.keys(HULLS) as HullId[];
export const TURRET_IDS = Object.keys(TURRETS) as TurretId[];
