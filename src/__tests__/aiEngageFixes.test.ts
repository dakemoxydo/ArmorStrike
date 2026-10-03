// ===== Регрессии хотфикса боевого ИИ (assault-полосы, выход из трапа, CP-полоса) =====
// Три независимых дефекта, закрытых здесь:
//   1. assault шёл в точную позицию игрока (дальность flamer 22 / isida 20 м,
//      prefRange 7 / 8 → всегда упор, ни стрейфа, ни полосы отхода);
//   2. антизастревание было недостижимо: re-pick waypoint затирался целью из
//      фокуса, avoidT обнулялся, throttle никогда не был отрицательным;
//   3. CP-полоса боя считалась от обзора (65 × 0.85 = 55.25 м) вместо
//      реальной дальности оружия бота.
import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { AIController, type AIBody, type AICtx, type AITarget } from '../game/AI';
import { objectiveFightRange } from '../game/aiRoles';
import { BOT_NORMAL } from '../game/match/matchConfig';
import { TURRETS } from '../core/catalog';
import type { TurretId, WeaponType } from '../core/catalog';
import { BotRoster } from '../game/BotRoster';
import { BotAiStage } from '../game/engine/stages/BotAiStage';
import { TankEntity, type TankVisual } from '../game/Tank';
import type { Arena } from '../game/Arena';
import type { CaptureZoneState } from '../game/match/captureLogic';
import type { Collider } from '../game/engine/physics';
import type { FrameContext } from '../game/engine/stages/types';
import type { MatchRuntime } from '../game/match/MatchRuntime';

const DT = 1 / 60;
const BOUNDS = 144;
/** Hull-параметры бота (hunter-подобные): газ вперёд 15, задний ход 9. */
const HULL = { speed: 15, reverseSpeed: 9, turnSpeed: 2.9 };
/**
 * Зафиксированная persona standard: aggro 0.35 → pref = 20 + 2.8 = 22.8, значит
 * фокус на 20 м всегда попадает в полосу отката (22.8 − 5 = 17.8). Без этого
 * random-ish aggro делает ветвление в тестах недетерминированным.
 */
const PERSONA = { aggro: 0.35, react: 0.25, lead: 0.9 };

function makeBody(weapon: WeaponType, x: number, z: number, yaw: number): AIBody {
  return {
    position: new THREE.Vector3(x, 0, z),
    yaw, aimYaw: yaw, turretYaw: 0, fireTimer: 0,
    throttle: 0, steer: 0, boosting: false, speed: 0, alive: true,
    radius: 1.8, health: 100, maxHealth: 100,
    params: { weaponType: weapon },
  };
}

function makeTarget(x: number, z: number): AITarget {
  return {
    position: new THREE.Vector3(x, 0, z),
    alive: true,
    vel: new THREE.Vector3(),
  };
}

function makeCtx(
  player: AITarget, colliders: Collider[], moveHint?: { x: number; z: number },
): AICtx {
  return {
    player,
    bots: [],
    colliders,
    bounds: BOUNDS,
    moveHint: moveHint ?? null,
  };
}

/**
 * Минимальный кинематический шаг по закону TankMotionSystem
 * (`throttle < 0 → throttle * reverseSpeed`, поворот — steer * turnSpeed).
 * Нужен, чтобы `tank.speed` был честным: иначе бот «всю жизнь» выглядит
 * застрявшим и сразу уходит в выход из трапа.
 */
function applyMotion(t: AIBody, dt: number) {
  t.speed = t.throttle >= 0 ? t.throttle * HULL.speed : t.throttle * HULL.reverseSpeed;
  t.yaw += t.steer * HULL.turnSpeed * dt;
  t.position.x += Math.sin(t.yaw) * t.speed * dt;
  t.position.z += Math.cos(t.yaw) * t.speed * dt;
}

function distToPlayer(t: AIBody, player: AITarget): number {
  return Math.hypot(player.position.x - t.position.x, player.position.z - t.position.z);
}

function block(
  id: number, minX: number, maxX: number, minZ: number, maxZ: number,
): Collider {
  return {
    id, minX, maxX, minZ, maxZ, height: 3,
    blocksShots: true, blocksSight: true, destructible: false,
    active: true, kind: 'block',
  };
}

/** Грубый AABB-контакт корпуса (pad = TANK.radius) — клэмп позиции в тесте. */
function insideField(x: number, z: number, colliders: Collider[]): boolean {
  const pad = 1.8;
  return colliders.some(
    (c) => x > c.minX - pad && x < c.maxX + pad && z > c.minZ - pad && z < c.maxZ + pad,
  );
}

/** Шаг с коллизией: упёрся — остаёшься на месте со speed = 0 (зажат в блок). */
function applyMotionBlocked(t: AIBody, dt: number, colliders: Collider[]) {
  const px = t.position.x;
  const pz = t.position.z;
  applyMotion(t, dt);
  if (insideField(t.position.x, t.position.z, colliders)) {
    t.position.x = px;
    t.position.z = pz;
    t.speed = 0;
  }
}

describe('assault: полосы подхода/отхода вместо тарана', () => {
  /** Прогон бота вживую: спавним с дистанции, смотрим профиль дистанции. */
  function runAssault(weapon: WeaponType, seconds: number) {
    const t = makeBody(weapon, 22, 0, Math.atan2(0 - 22, 0 - 0));
    const player = makeTarget(0, 0);
    const ai = new AIController(
      t, BOT_NORMAL.sightRange, TURRETS[weapon as TurretId].range,
      BOT_NORMAL.aimError, { aggro: 0.95, react: 0.1, lead: 0.65 }, 'assault',
    );
    const ctx = makeCtx(player, []);
    const pref = weapon === 'flamethrower' ? 7 : 8;
    let minD = Infinity;
    let maxD = 0;
    let minThrottle = Infinity;
    const dists: number[] = [];
    const frames = Math.round(seconds / DT);
    for (let i = 0; i < frames; i++) {
      ai.update(DT, ctx);
      minThrottle = Math.min(minThrottle, t.throttle);
      const d = distToPlayer(t, player);
      minD = Math.min(minD, d);
      maxD = Math.max(maxD, d);
      dists.push(d);
      applyMotion(t, DT);
    }
    return { minD, maxD, minThrottle, dists, pref, t };
  }

  it('flamethrower-штурм держит дистанцию в своём диапазоне (3…13 м)', () => {
    const r = runAssault('flamethrower', 4);
    // Сблизился (это не «игнорирование цели»)…
    expect(r.minD).toBeLessThan(14);
    // …но не доехал в упор: полоса отхода начинается на pref − retreatBand = 3.
    expect(r.minD).toBeGreaterThanOrEqual(r.pref - 4 - 0.01);
    // Дальность оружия — 22 м: бот не выбирает дистанцию, недоступную для
    // огня (средняя длина прогона в боевом коридоре 7…14 м).
    const mid = r.dists.slice(200).reduce((a, b) => a + b, 0) / (r.dists.length - 200);
    expect(mid).toBeGreaterThan(6);
    expect(mid).toBeLessThan(15);
    // Регресс: газ не залипает на 1 (иначе это таран на полную).
    expect(r.minThrottle).toBeLessThan(0.8);
    expect(r.maxD).toBeLessThan(24);
  });

  it('isida-штурм (pref 8) ведёт себя так же, как остальные роли', () => {
    const r = runAssault('isida', 4);
    expect(r.minD).toBeGreaterThanOrEqual(r.pref - 4 - 0.01);
    expect(r.minD).toBeLessThan(15);
    expect(r.minThrottle).toBeLessThan(0.8);
  });

  it('снайпер по-прежнему держит дальнюю дистанцию (полоса не сломана)', () => {
    const t = makeBody('railgun', 45, 0, Math.atan2(0 - 45, 0 - 0));
    const player = makeTarget(0, 0);
    const ai = new AIController(
      t, BOT_NORMAL.sightRange, TURRETS.railgun.range, BOT_NORMAL.aimError,
      { aggro: 0.22, react: 0.2, lead: 1.15 }, 'sniper',
    );
    const ctx = makeCtx(player, []);
    for (let i = 0; i < 60 * 4; i++) {
      ai.update(DT, ctx);
      applyMotion(t, DT);
    }
    // pref = 34 + 0.22·10 = 36.2 → бот не должен нырнуть в 45 → 15 м.
    expect(distToPlayer(t, player)).toBeGreaterThan(25);
  });

  it('приоритет низкого HP не изменился: укрытие берёт верх над полосами', () => {
    // Укрытие за блоком слева (угроза в 0,0 → точка стояния за x = −14).
    const colliders = [block(1, -20, -14, -4, 4)];
    function steerAtLowHp(health: number): number {
      // 2 м до игрока: у полного HP это полоса отката assault (pref − 4 = 3),
      // направление детерминировано — в отличие от полосы удержания.
      const t = makeBody('flamethrower', 2, 0, 0);
      t.health = health;
      const ai = new AIController(
        t, BOT_NORMAL.sightRange, TURRETS.flamethrower.range, BOT_NORMAL.aimError,
        PERSONA, 'assault',
      );
      ai.update(DT, makeCtx(makeTarget(0, 0), colliders));
      return t.steer;
    }
    // 10% HP < coverHpFracForRole('assault') = 0.35 → курс на укрытие (−X).
    expect(steerAtLowHp(10)).toBeLessThan(-0.9);
    // Контроль: на полном HP бот откатывается от игрока (+X), а не за блок.
    expect(steerAtLowHp(100)).toBeGreaterThan(0.9);
  });
});

describe('выход из трапа: отрицательный throttle + обход по waypoint', () => {
  /**
   * Плотный кластер: блок по курсу (проба 4.2 м) и оба боковых ±60° завалены —
   * это и есть «бот упирается в ящик между собой и игроком».
   */
  function wedgedField(): Collider[] {
    return [
      block(1, -8, 8, 4, 9),     // прямо по курсу
      block(2, -30, -8, -4, 14), // слева
      block(3, 8, 30, -4, 14),   // справа
    ];
  }

  it('застрявший бот получает ОТРИЦАТЕЛЬНЫЙ throttle и держит его ~0.9 с', () => {
    const colliders = wedgedField();
    const t = makeBody('cannon', 0, 0, 0); // курс +Z — в блок
    // Фокус виден (LOS открыт ниже кластера) и на 15.6 м → полоса отката:
    // газ 0.7 постоянно (плюс обход 0.7), т.е. бот реально упирается.
    const player = makeTarget(12, -10);
    const ai = new AIController(
      t, BOT_NORMAL.sightRange, TURRETS.cannon.range, BOT_NORMAL.aimError, PERSONA,
    );
    const ctx = makeCtx(player, colliders);

    let firstReverse = -1;
    let heldFrames = 0;
    for (let i = 0; i < 150; i++) {
      ai.update(DT, ctx);
      // Бот зажат в блок: скорость всегда 0, позиция не меняется.
      t.speed = 0;
      if (t.throttle < 0) {
        if (firstReverse < 0) firstReverse = i;
        heldFrames++;
      }
    }
    // Регресс на баг: раньше throttle был ≥ 0 всегда (мин. 0 / 0.18 / 0.7).
    expect(firstReverse).toBeGreaterThanOrEqual(0);
    // Порог срабатывания — 1.1 с застревания (≈ кадр 67).
    expect(firstReverse).toBeGreaterThanOrEqual(60);
    expect(firstReverse).toBeLessThan(90);
    // Газ назад держится, а не сбрасывается на следующем кадре.
    expect(heldFrames).toBeGreaterThan(40);
  });

  it('выход из трапа реально откатывает бота от блока (livelock пробит)', () => {
    const colliders = wedgedField();
    const t = makeBody('cannon', 0, 0, 0);
    const player = makeTarget(12, -10);
    const ai = new AIController(
      t, BOT_NORMAL.sightRange, TURRETS.cannon.range, BOT_NORMAL.aimError, PERSONA,
    );
    const ctx = makeCtx(player, colliders);

    let started = false;
    const pinned = new THREE.Vector3();
    let maxTravel = 0;
    for (let i = 0; i < 200; i++) {
      ai.update(DT, ctx);
      // Пока бот упирается в блок — контакт (speed 0); на газу назад
      // движение настоящее: кинематика TankMotionSystem по throttle < 0.
      if (t.throttle < 0) applyMotionBlocked(t, DT, colliders);
      else t.speed = 0;
      if (t.throttle < 0) {
        if (!started) { started = true; pinned.copy(t.position); }
        maxTravel = Math.max(maxTravel, t.position.distanceTo(pinned));
      }
    }
    // Регресс на старый код: газ назад появился и физически увёл бота из
    // контакта (раньше throttle был ≥ 0 — бот оставался прижатым навсегда).
    expect(started).toBe(true);
    expect(maxTravel).toBeGreaterThan(0.5);
  });

  it('обход по waypoint: фокус за блоком, путь к waypoint открыт → рулим в waypoint', () => {
    const t = makeBody('cannon', 0, 0, 0);
    const player = makeTarget(20, 0);
    const ai = new AIController(
      t, BOT_NORMAL.sightRange, TURRETS.cannon.range, BOT_NORMAL.aimError, PERSONA,
    );
    // Waypoint сбоку-сзади: LOS открыт (единственный блок — за фокусом).
    const internals = ai as unknown as { waypoint: THREE.Vector2 };
    internals.waypoint.set(-20, 0);
    ai.update(DT, makeCtx(player, [])); // фокус виден → engage
    // Игрок нырнул за блок (LOS порван). Дистанция 14 < pref − 5 = 17.8, так
    // что без обхода старая ветка дала бы ОТКАТ (курс на −Z, руль +1);
    // обход даёт руль на −X к waypoint. Знак руля — однозначное различие.
    // Блок на 7 м — дальше пробы ИИ (4.2 + клиренс 2.2), обход не мешает.
    const colliders = [block(1, -6, 6, 7, 11)];
    player.position.set(0, 0, 14);
    const ctx = makeCtx(player, colliders);
    for (let i = 0; i < 5; i++) {
      ai.update(DT, ctx);
      expect(t.steer).toBeLessThan(-0.9);
    }
  });

  it('waypoint за блоком — fallback на цель (обход не выдумывается)', () => {
    const t = makeBody('cannon', 0, 0, 0);
    const player = makeTarget(20, 0);
    const ai = new AIController(
      t, BOT_NORMAL.sightRange, TURRETS.cannon.range, BOT_NORMAL.aimError, PERSONA,
    );
    const internals = ai as unknown as { waypoint: THREE.Vector2 };
    internals.waypoint.set(-20, 0);
    ai.update(DT, makeCtx(player, [])); // фокус виден → engage
    // Фокус за блоком и waypoint сбоку-сзади тоже за блоком: обхода нет →
    // старая ветка «в фокус» (14 м → откат, курс на −Z, руль +1).
    const colliders = [
      block(1, -6, 6, 7, 11),
      block(2, -12, -8, -4, 4),
    ];
    player.position.set(0, 0, 14);
    const ctx = makeCtx(player, colliders);
    for (let i = 0; i < 5; i++) {
      ai.update(DT, ctx);
      expect(t.steer).toBeGreaterThan(0.9);
    }
  });

  it('одиночный патрульный бот едет к своей точке и не получает задний ход', () => {
    const t = makeBody('cannon', 0, 0, 0);
    const player = makeTarget(150, 0); // за обзором (65), но в LOD-радиусе
    const ai = new AIController(
      t, BOT_NORMAL.sightRange, TURRETS.cannon.range, BOT_NORMAL.aimError, PERSONA,
    );
    const ctx = makeCtx(player, []);
    const internals = ai as unknown as { waypoint: THREE.Vector2 };
    internals.waypoint.set(0, 30);

    const throttles: number[] = [];
    for (let i = 0; i < 180; i++) {
      ai.update(DT, ctx);
      throttles.push(t.throttle);
      applyMotion(t, DT);
    }
    // Регресс: патрульный бот не ломается — waypoint единственная цель,
    // газ ≥ 0, базовый патрульный газ 0.85, движение к точке.
    expect(Math.min(...throttles)).toBeGreaterThanOrEqual(0);
    expect(throttles[0]).toBeCloseTo(0.85, 5);
    expect(t.position.z).toBeGreaterThan(5);
  });
});

describe('objectiveFightRange: полоса CP от дальности оружия', () => {
  it('числа совпадают с min(дальность оружия, обзор) × 1.05', () => {
    const sight = BOT_NORMAL.sightRange;
    expect(objectiveFightRange('flamethrower', sight)).toBeCloseTo(22 * 1.05, 6);
    expect(objectiveFightRange('isida', sight)).toBeCloseTo(20 * 1.05, 6);
    expect(objectiveFightRange('cannon', sight)).toBeCloseTo(65 * 1.05, 6);
    expect(objectiveFightRange('gauss', sight)).toBeCloseTo(65 * 1.05, 6);
    expect(objectiveFightRange('railgun', sight)).toBeCloseTo(65 * 1.05, 6);
    // Старая полоса была 65 × 0.85 = 55.25 для всех.
    expect(sight * 0.85).toBeCloseTo(55.25, 6);
  });

  it('ближний бой (assault) уже дальнобойного (cannon)', () => {
    const sight = BOT_NORMAL.sightRange;
    expect(objectiveFightRange('flamethrower', sight))
      .toBeLessThan(objectiveFightRange('cannon', sight));
    expect(objectiveFightRange('isida', sight))
      .toBeLessThan(objectiveFightRange('cannon', sight));
    // Ровно совпадает с гейтом ближнего боя в AIController (fireRange × 1.05).
    expect(objectiveFightRange('flamethrower', sight))
      .toBeCloseTo(TURRETS.flamethrower.range * 1.05, 6);
  });
});

// ===== Интеграция: BotAiStage выбирает moveHint по оружию бота =====
function makeVisual(): TankVisual {
  const group = new THREE.Group();
  const muzzle = new THREE.Object3D();
  group.add(muzzle);
  return {
    group, hull: new THREE.Group(), turret: new THREE.Group(),
    barrelGroup: new THREE.Group(), muzzle, ring: new THREE.Mesh(),
    bodyMats: [], bodyBaseColors: [],
    trackTex: null as unknown as THREE.CanvasTexture,
  };
}

const PARAMS = {
  maxHealth: 100, speed: 15, reverseSpeed: 9, turnSpeed: 2.9,
  turretSpeed: 9, damage: 32, shotCooldown: 0.336,
  weaponType: 'cannon' as WeaponType, range: 75,
};

function makeStage(
  bot: TankEntity, turretId: TurretId,
): { stage: BotAiStage; spy: ReturnType<typeof vi.fn> } {
  const roster = new BotRoster();
  const ai = new AIController(
    bot, BOT_NORMAL.sightRange, TURRETS[turretId].range, BOT_NORMAL.aimError,
  );
  roster.bots.push({ tank: bot, ai, objectiveDuty: true });
  const zones: CaptureZoneState[] = [{
    id: 'A', x: 0, z: 0, radius: 20,
    owner: null, progress: 0, actor: null, contested: false,
  }];
  const arena = { colliders: [], half: 150 } as unknown as Arena;
  const match = {
    mode: 'capture_point', getCaptureZones: () => zones,
  } as unknown as MatchRuntime;
  const spy = vi.spyOn(ai, 'update').mockImplementation(() => {});
  return { stage: new BotAiStage(roster, arena, match), spy };
}

function stageCtx(player: TankEntity, tanks: TankEntity[]): FrameContext {
  return {
    dt: 0.016,
    emit: vi.fn(),
    player,
    tanks,
    deathT: { value: -1 },
    prevReloading: { value: false },
  };
}

describe('BotAiStage: полоса objective считается от оружия бота', () => {
  it('огнемёт-бот в 40 м идёт на захват; пушечный — дерётся (старая полоса 55 м)', () => {
    function hintFor(turretId: TurretId): { x: number; z: number } | null {
      const bot = new TankEntity('BOT', false, { ...PARAMS, weaponType: turretId }, makeVisual());
      bot.teamId = 'alpha';
      bot.turretId = turretId;
      const player = new TankEntity('ВЫ', true, PARAMS, makeVisual());
      player.teamId = 'bravo';
      player.position.set(40, 0, 0);
      const { stage, spy } = makeStage(bot, turretId);
      stage.update(stageCtx(player, [player, bot]));
      expect(spy).toHaveBeenCalledTimes(1);
      return spy.mock.calls[0][1].moveHint;
    }
    // Враг в 40 м и НЕ у точки (зона r=20, ez=40 > 32) → для flamer это не бой.
    expect(hintFor('flamethrower')).toEqual({ x: 0, z: 0 });
    // Пушка (полоса 68.25) считает 40 м боем — бросает точку.
    expect(hintFor('cannon')).toBeNull();
  });

  it('ctx для ai.update переиспользуется (нет литерала на бот на кадр)', () => {
    const bot = new TankEntity('BOT', false, PARAMS, makeVisual());
    bot.teamId = 'alpha';
    bot.turretId = 'cannon';
    const player = new TankEntity('ВЫ', true, PARAMS, makeVisual());
    player.teamId = 'bravo';
    player.position.set(40, 0, 0);
    const { stage, spy } = makeStage(bot, 'cannon');
    const ctx = stageCtx(player, [player, bot]);
    stage.update(ctx);
    stage.update(ctx);
    expect(spy.mock.calls[0][1]).toBe(spy.mock.calls[1][1]);
  });
});
