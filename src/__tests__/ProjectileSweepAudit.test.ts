// ===== Снаряды: свип по субшагам (точка удара, broad-phase, стена ↔ танк), трейл, гвард скорости =====
import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import { createDamageSystem } from '../core/DamageSystem';
import { WEAPON_TUNING, TURRETS } from '../core/catalog';
import { PROJECTILE } from '../game/constants';
import { ProjectileManager, type HitContext } from '../game/engine/Projectile';
import { BEHAVIORS, type ProjectileBehavior } from '../game/engine/ProjectileBehavior';
import { IsidaWeapon } from '../game/weapons/IsidaWeapon';
import {
  SHOT_HEIGHT_EPS, pointInCollider, segmentHitT, type Collider,
} from '../game/engine/physics';
import type { TankLike } from '../core/types';
import type { CombatPeer, WeaponContext, WeaponDeps, WeaponOwner } from '../game/weapons/types';

// ---- headless canvas stub: ProjectileManager строит glowTexture() в конструкторе ----
const gradient = { addColorStop: () => {} };
const ctx2d = new Proxy(
  {},
  {
    get(_t, prop) {
      if (prop === 'createRadialGradient' || prop === 'createLinearGradient') {
        return () => gradient;
      }
      return () => {};
    },
    set() {
      return true;
    },
  },
);
(globalThis as Record<string, unknown>).document = {
  createElement: (tag: string) =>
    tag === 'canvas' ? { width: 0, height: 0, getContext: () => ctx2d } : undefined,
};

const TUNE = WEAPON_TUNING.cannon;
const SHOT_Y = 1.6;
/** Высота точки удара о броню (Projectile.update, ветка танка). */
const TANK_HIT_Y = 1.6;
/** Субшаг ровно в один шаг: speed < 0.6 → steps = 1, длина свипа = speed. */
const SUBSTEP_DT = 0.5 / TUNE.speed;

function makeTank(id: number, x: number, z: number, health = 100, radius = 1.5): TankLike {
  const tank = {
    id,
    name: `T${id}`,
    isPlayer: false,
    health,
    alive: true as boolean,
    radius,
    knockback: new THREE.Vector3(),
    position: new THREE.Vector3(x, 0, z),
    yaw: 0,
    takeDamage(this: { health: number; alive: boolean }, d: number) {
      if (!this.alive || d <= 0) return;
      this.health = Math.max(0, this.health - d);
      if (this.health <= 0) this.alive = false;
    },
  };
  return tank as TankLike;
}

function box(
  id: number, minX: number, maxX: number, minZ: number, maxZ: number,
  over: Partial<Collider> = {},
): Collider {
  return {
    id, minX, maxX, minZ, maxZ, height: 4, blocksShots: true, blocksSight: true,
    destructible: false, active: true, kind: 'wall', ...over,
  };
}

function makeCtx(over: Partial<HitContext> = {}) {
  const effects = {
    explosion: vi.fn(),
    impact: vi.fn(),
    trailPuff: vi.fn(),
    muzzle: vi.fn(),
    spawnSmoke: vi.fn(),
  };
  const damageBlock = vi.fn();
  const onTankDamaged = vi.fn();
  const damageSystem = createDamageSystem(
    { damageBlock } as never,
    { onTankDamaged, onBlockDestroyed: vi.fn() },
  );
  const ctx: HitContext = {
    colliders: [],
    tanks: [],
    effects: effects as never,
    damageSystem,
    // Штатная проводка ProjectileStage: реальный HP идёт через applyDamage.
    onTankHit: (t, d, o) => damageSystem.applyDamage(t, d, o),
    ...over,
  };
  return { ctx, effects, damageBlock, onTankDamaged };
}

/**
 * Выстрел так, чтобы ПЕРВЫЙ субшаг стартовал ровно в `from`: fire() сдвигает
 * точку появления на 0.5 м вперёд по направлению выстрела.
 */
function fireFrom(
  mgr: ProjectileManager,
  owner: TankLike,
  from: THREE.Vector3,
  dir: THREE.Vector3,
  range = 1000,
): boolean {
  return mgr.fire(owner, from.clone().addScaledVector(dir, -0.5), dir, TUNE.damage, 'cannon', range);
}

/** Единственная видимая группа в сцене — свежевыпущенный снаряд. */
function firedGroup(scene: THREE.Scene): THREE.Object3D {
  const g = scene.children.find((c) => c.visible);
  if (!g) throw new Error('в сцене нет видимого снаряда');
  return g;
}

/** Смена behaviour пула на время прогона (BEHAVIORS — мутабельный реестр). */
function withCannonPatch(
  patch: (orig: ProjectileBehavior) => Partial<ProjectileBehavior>,
  fn: () => void,
) {
  const orig = BEHAVIORS.cannon!;
  BEHAVIORS.cannon = { ...orig, ...patch(orig) };
  try {
    fn();
  } finally {
    BEHAVIORS.cannon = orig;
  }
}

/** t входа свипа в надутый круг танка (t.radius + PROJECTILE.radius). */
function tankEntryT(from: THREE.Vector3, to: THREE.Vector3, tank: TankLike): number {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const a = dx * dx + dz * dz;
  const fx = from.x - tank.position.x;
  const fz = from.z - tank.position.z;
  const rr = (tank.radius + PROJECTILE.radius) ** 2;
  const c0 = fx * fx + fz * fz - rr;
  if (c0 <= 0) return 0;
  const b = 2 * (fx * dx + fz * dz);
  const disc = b * b - 4 * a * c0;
  if (disc < 0) return -1;
  const t = (-b - Math.sqrt(disc)) / (2 * a);
  return t >= 0 && t <= 1 ? t : -1;
}

describe('B1: точка попадания в стену = пересечение свипа, а не начало субшага', () => {
  it('взрыв стоит НА грани коллайдера, сплаш считается от неё же', () => {
    const scene = new THREE.Scene();
    const mgr = new ProjectileManager(scene);
    const owner = makeTank(1, 0, -5);
    // Стена: грань minZ = 10. Субшаг 9.8 → 10.3 пересекает её на t = 0.4.
    const wall = box(1, -5, 5, 10, 12);
    // Танк в 3.0 м от ИСТИННОЙ точки попадания — ровно спад сплаша.
    const enemy = makeTank(2, 0, 13);
    const { ctx, effects } = makeCtx({ colliders: [wall], tanks: [owner, enemy] });

    expect(Math.ceil(TUNE.speed * SUBSTEP_DT / 0.6)).toBe(1);
    fireFrom(mgr, owner, new THREE.Vector3(0, SHOT_Y, 9.8), new THREE.Vector3(0, 0, 1));
    mgr.update(SUBSTEP_DT, ctx);

    expect(effects.explosion).toHaveBeenCalledTimes(1);
    const boom = new THREE.Vector3().copy(effects.explosion.mock.calls[0][0]);
    // Грань стены, а не 9.8 (начало субшага — старый баг).
    expect(boom.z).toBeCloseTo(wall.minZ, 9);
    expect(boom.z).toBeGreaterThan(9.9);

    // Сплаш от точки на грани: falloff = 1 − 3/5 = 0.4 → round(splashDmg × 0.4).
    const falloff = 1 - 3 / TUNE.splashRadius;
    expect(enemy.health).toBeCloseTo(100 - Math.round(TUNE.splashDmg * falloff), 9);
    // Со старым центром (9.8) урон был бы на единицу меньше — это и был «5.6 м».
    expect(Math.round(TUNE.splashDmg * (1 - 3.2 / TUNE.splashRadius)))
      .toBeLessThan(Math.round(TUNE.splashDmg * falloff));
  });

  it('дискретное касание без пересечения (снаряд у кромки) — удар в начало субшага', () => {
    const scene = new THREE.Scene();
    const mgr = new ProjectileManager(scene);
    const owner = makeTank(1, 0, -5);
    // Грань стены 10.0; надутый бокс начинается на 10 − 0.18 = 9.82.
    const wall = box(1, -5, 5, 10, 12);
    const { ctx, effects } = makeCtx({ colliders: [wall], tanks: [owner] });

    // (1) Свип пересёк грань: 9.7 → 10.2, t = (10.0 − 9.7) / 0.5 = 0.6.
    fireFrom(mgr, owner, new THREE.Vector3(0, SHOT_Y, 9.7), new THREE.Vector3(0, 0, 1));
    mgr.update(SUBSTEP_DT, ctx);
    expect(effects.explosion).toHaveBeenCalledTimes(1);
    expect(new THREE.Vector3().copy(effects.explosion.mock.calls[0][0]).z)
      .toBeCloseTo(wall.minZ, 9);

    // (2) Пересечения точного бокса нет (9.85 → 9.95, оба ниже грани 10.0),
    // но конец внутри надутого: сработал только точечный тест → фолбэк в
    // начало субшага (старое поведение).
    mgr.clear();
    effects.explosion.mockClear();
    fireFrom(mgr, owner, new THREE.Vector3(0, SHOT_Y, 9.85), new THREE.Vector3(0, 0, 1));
    mgr.update(0.1 / TUNE.speed, ctx);
    expect(effects.explosion).toHaveBeenCalledTimes(1);
    expect(new THREE.Vector3().copy(effects.explosion.mock.calls[0][0]).z).toBeCloseTo(9.85, 9);

    // (3) Старт внутри самого коллайдера (снаряд рождён дулом в стене) —
    // segmentHitT честно даёт t = 0, точка = начало субшага.
    mgr.clear();
    effects.explosion.mockClear();
    fireFrom(mgr, owner, new THREE.Vector3(0, SHOT_Y, 10.05), new THREE.Vector3(0, 0, 1));
    mgr.update(0.1 / TUNE.speed, ctx);
    expect(effects.explosion).toHaveBeenCalledTimes(1);
    expect(new THREE.Vector3().copy(effects.explosion.mock.calls[0][0]).z)
      .toBeCloseTo(10.05, 9);
  });
});

describe('B2: сплаш/добивающий тик не теряют толчок и эффект', () => {
  it('сплаш, убивший цель, всё равно толкает и даёт impact', () => {
    const scene = new THREE.Scene();
    const mgr = new ProjectileManager(scene);
    const owner = makeTank(1, 0, -5);
    const wall = box(1, -5, 5, 10, 12);
    // В 3.0 м от точки попадания, сбоку от траектории: прямого попадания нет,
    // только сплаш. HP ниже сплаш-урона → цель гибнет от сплаша.
    const splashDmg = Math.round(TUNE.splashDmg * (1 - 3 / TUNE.splashRadius));
    const enemy = makeTank(2, 3, 10, splashDmg - 1);
    const { ctx, effects } = makeCtx({ colliders: [wall], tanks: [owner, enemy] });

    fireFrom(mgr, owner, new THREE.Vector3(0, SHOT_Y, 9.8), new THREE.Vector3(0, 0, 1));
    mgr.update(SUBSTEP_DT, ctx);

    expect(enemy.alive).toBe(false);
    expect(enemy.health).toBe(0);
    // Регресс: раньше combatAllowsImpulse видел !alive и гасил и толчок, и эффект.
    expect(enemy.knockback.length()).toBeGreaterThan(0);
    // Толчок направлен ОТ эпицентра (+X от точки 0,0,10).
    expect(enemy.knockback.x).toBeGreaterThan(0);
    expect(effects.impact.mock.calls.some((c) => c[0] === enemy.position)).toBe(true);
  });

  it('сплаш на 1 HP выше порога даёт тот же толчок и эффект (нет «ступеньки по 1 HP»)', () => {
    const scene = new THREE.Scene();
    const mgr = new ProjectileManager(scene);
    const owner = makeTank(1, 0, -5);
    const wall = box(1, -5, 5, 10, 12);
    const splashDmg = Math.round(TUNE.splashDmg * (1 - 3 / TUNE.splashRadius));
    const run = (lethal: boolean) => {
      const enemy = makeTank(2, 3, 10, lethal ? splashDmg - 1 : splashDmg + 1);
      const { ctx, effects } = makeCtx({ colliders: [wall], tanks: [owner, enemy] });
      mgr.clear();
      fireFrom(mgr, owner, new THREE.Vector3(0, SHOT_Y, 9.8), new THREE.Vector3(0, 0, 1));
      mgr.update(SUBSTEP_DT, ctx);
      return {
        alive: enemy.alive,
        knock: enemy.knockback.length(),
        impact: effects.impact.mock.calls.some((c) => c[0] === enemy.position),
      };
    };
    const lethal = run(true);
    const survived = run(false);
    expect(lethal.alive).toBe(false);
    expect(survived.alive).toBe(true);
    expect(lethal.knock).toBeCloseTo(survived.knock, 9);
    expect(lethal.impact).toBe(survived.impact);
    expect(lethal.knock).toBeGreaterThan(0);
  });
});

describe('B3: broad-phase не меняет попадания, но отсекает большую часть массива', () => {
  /** Сетка 12×10 блоков + «инфраструктура» (неактивные/низкие/не блокирующие). */
  function grid(): Collider[] {
    const out: Collider[] = [];
    let id = 1;
    for (let ix = 0; ix < 12; ix++) {
      for (let iz = 0; iz < 10; iz++) {
        const x = -33 + ix * 6;
        const z = -27 + iz * 6;
        out.push(box(id++, x - 1, x + 1, z - 1, z + 1));
        if (ix % 4 === 0) {
          out.push(box(id++, x - 1, x + 1, z - 1, z + 1, { blocksShots: false, blocksSight: false }));
        }
        if (iz % 5 === 0) out.push(box(id++, x - 1, x + 1, z + 2, z + 3, { active: false }));
        if (iz % 5 === 1) out.push(box(id++, x + 2, x + 3, z - 1, z + 1, { height: 0.2 }));
      }
    }
    return out;
  }

  /**
   * Узкая фаза «как в коде»: та же приёмка (свип, иначе точка+радиус) и тот
   * же выбор ближайшего t. Возвращает коллайдер и параметр удара.
   */
  function referenceHit(
    px: number, pz: number, bx: number, bz: number, colliders: Collider[],
  ): { c: Collider; t: number } | null {
    let bestC: Collider | null = null;
    let bestT = 0;
    for (const c of colliders) {
      if (!c.active || !c.blocksShots) continue;
      if (SHOT_Y > c.height + SHOT_HEIGHT_EPS) continue;
      let t = segmentHitT(px, pz, bx, bz, c);
      if (t < 0) {
        if (!pointInCollider(bx, bz, c, PROJECTILE.radius)) continue;
        t = 0;
      }
      if (!bestC || t < bestT) {
        bestC = c;
        bestT = t;
      }
    }
    return bestC ? { c: bestC, t: bestT } : null;
  }

  it('свипы через грань: удар на грани коллайдера, а не в начале субшага', () => {
    const scene = new THREE.Scene();
    const mgr = new ProjectileManager(scene);
    const owner = makeTank(1, -60, -60);
    const colliders = grid();
    const { ctx, effects } = makeCtx({ colliders, tanks: [owner] });

    // Каждый 3-й блок (чтобы рядом ничего не перехватывало), каждая из 4 граней,
    // выстрел с отступом 0.4 м и смещением 0.3 м вдоль грани.
    const solids = colliders.filter((c) => c.blocksShots && c.active && c.height >= 2.5);
    expect(solids.length).toBeGreaterThan(20);
    type Face = { inward: THREE.Vector3; p: THREE.Vector3; axis: 'x' | 'z' };
    const faces: Face[] = [];
    solids.forEach((c, idx) => {
      if (idx % 3 !== 0) return;
      const mx = (c.minX + c.maxX) / 2;
      const mz = (c.minZ + c.maxZ) / 2;
      faces.push({ inward: new THREE.Vector3(0, 0, 1), p: new THREE.Vector3(mx, 0, c.minZ), axis: 'z' });
      faces.push({ inward: new THREE.Vector3(0, 0, -1), p: new THREE.Vector3(mx, 0, c.maxZ), axis: 'z' });
      faces.push({ inward: new THREE.Vector3(1, 0, 0), p: new THREE.Vector3(c.minX, 0, mz), axis: 'x' });
      faces.push({ inward: new THREE.Vector3(-1, 0, 0), p: new THREE.Vector3(c.maxX, 0, mz), axis: 'x' });
    });
    expect(faces.length).toBeGreaterThan(20);

    let checked = 0;
    for (const f of faces) {
      const tangent = new THREE.Vector3(-f.inward.z, 0, f.inward.x);
      // Старт СНАружи на 0.4 м от грани + 0.3 м вдоль грани (не по центру).
      const from = f.p.clone().addScaledVector(f.inward, -0.4).addScaledVector(tangent, 0.3);
      from.y = SHOT_Y;
      const dir = f.inward.clone().addScaledVector(tangent, 0.25).normalize();
      const to = from.clone().addScaledVector(dir, TUNE.speed * SUBSTEP_DT);

      const ref = referenceHit(from.x, from.z, to.x, to.z, colliders);
      expect(ref).not.toBeNull();
      expect(ref!.t).toBeGreaterThan(0);

      mgr.clear();
      effects.explosion.mockClear();
      fireFrom(mgr, owner, from, dir);
      mgr.update(SUBSTEP_DT, ctx);

      expect(effects.explosion).toHaveBeenCalledTimes(1);
      const p = new THREE.Vector3().copy(effects.explosion.mock.calls[0][0]);
      expect(p.x).toBeCloseTo(from.x + (to.x - from.x) * ref!.t, 9);
      expect(p.z).toBeCloseTo(from.z + (to.z - from.z) * ref!.t, 9);
      // Координата вдоль нормали — ровно на грани коллайдера.
      const hit = f.axis === 'z' ? p.z : p.x;
      expect(hit).toBeCloseTo(f.axis === 'z' ? f.p.z : f.p.x, 9);
      // И это НЕ начало субшага (старый баг ставил удар в px,pz).
      expect(Math.abs(hit - (f.axis === 'z' ? from.z : from.x))).toBeGreaterThan(0.05);
      checked++;
    }
    expect(checked).toBe(faces.length);
  });

  it('120 случайных свипов: вердикт совпадает с узкой фазой, broad-phase отсекает большинство', () => {
    const scene = new THREE.Scene();
    const mgr = new ProjectileManager(scene);
    const owner = makeTank(1, -60, -60);
    const colliders = grid();
    expect(colliders.length).toBeGreaterThan(120);
    const { ctx, effects } = makeCtx({ colliders, tanks: [owner] });

    const speed = TUNE.speed * SUBSTEP_DT;
    expect(Math.ceil(speed / 0.6)).toBe(1);

    // Детерминированное «равномерное» распределение (hash от индекса — без
    // накопления float-ошибки, в отличие от LCG на больших множителях).
    const u = (i: number, salt: number) => {
      const v = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
      return v - Math.floor(v);
    };
    let hits = 0;
    let broadRejected = 0;
    for (let i = 0; i < 120; i++) {
      const ang = u(i, 1) * Math.PI * 2;
      const dir = new THREE.Vector3(Math.cos(ang), 0, Math.sin(ang));
      const from = new THREE.Vector3(-33 + u(i, 2) * 66, SHOT_Y, -27 + u(i, 3) * 54);
      const to = from.clone().addScaledVector(dir, speed);

      const ref = referenceHit(from.x, from.z, to.x, to.z, colliders);
      // Broad-phase (тот же предикат, что в Projectile.update) не может отсечь
      // коллайдер, который узкая фаза приняла бы.
      const r = PROJECTILE.radius;
      const bpMinX = Math.min(from.x, to.x) - r;
      const bpMaxX = Math.max(from.x, to.x) + r;
      const bpMinZ = Math.min(from.z, to.z) - r;
      const bpMaxZ = Math.max(from.z, to.z) + r;
      for (const c of colliders) {
        if (bpMaxX < c.minX || bpMinX > c.maxX || bpMaxZ < c.minZ || bpMinZ > c.maxZ) {
          broadRejected++;
          expect(referenceHit(from.x, from.z, to.x, to.z, [c])).toBeNull();
        }
      }

      mgr.clear();
      effects.explosion.mockClear();
      fireFrom(mgr, owner, from, dir);
      mgr.update(SUBSTEP_DT, ctx);

      if (!ref) {
        expect(effects.explosion).not.toHaveBeenCalled();
      } else {
        hits++;
        expect(effects.explosion).toHaveBeenCalledTimes(1);
        const p = new THREE.Vector3().copy(effects.explosion.mock.calls[0][0]);
        expect(p.x).toBeCloseTo(from.x + (to.x - from.x) * ref.t, 9);
        expect(p.z).toBeCloseTo(from.z + (to.z - from.z) * ref.t, 9);
      }
    }
    // Сетка 12×10 и свип 0.5 м: часть свипов проходит мимо, часть пересекает —
    // обе ветви поведения покрыты.
    expect(hits).toBeGreaterThan(5);
    expect(hits).toBeLessThan(120);
    // Broad-phase отсёк подавляющее большинство коллайдеров — иначе он не имеет
    // смысла (пришлось бы платить точный свип по всем 200+).
    expect(broadRejected).toBeGreaterThan(120 * colliders.length * 0.9);
  });
});

describe('B4: в одном субшаге обрабатывается ближайшее событие (стена ≠ приоритет)', () => {
  it('танк, задетый раньше грани стены, получает урон — стена не перехватывает', () => {
    const scene = new THREE.Scene();
    const mgr = new ProjectileManager(scene);
    const owner = makeTank(1, 0, -5);
    // Стена с x-гранью ровно на траектории снаряда (сканирование боковой грани).
    const wall = box(1, -1, 1, 10, 12, { destructible: true });
    // Танк вплотную к боковой грани стены (дистанция центра = radius) и на
    // уровне её входа: надутый круг (1.68) начинается ДО грани стены.
    const enemy = makeTank(2, 2.5, 10.4);
    const { ctx, effects, damageBlock } = makeCtx({ colliders: [wall], tanks: [owner, enemy] });

    const speed = TUNE.speed * SUBSTEP_DT;
    const from = new THREE.Vector3(1, SHOT_Y, 9.5);
    const dir = new THREE.Vector3(0, 0, 1);
    const to = from.clone().addScaledVector(dir, speed);
    // Предпосылка сцены: танк реально задет раньше грани стены.
    const tT = tankEntryT(from, to, enemy);
    const wallT = segmentHitT(from.x, from.z, to.x, to.z, wall);
    expect(tT).toBeGreaterThan(0);
    expect(tT).toBeLessThan(wallT);

    fireFrom(mgr, owner, from, dir);
    mgr.update(SUBSTEP_DT, ctx);

    // Прямое попадание целиком, стена не тронута.
    expect(enemy.health).toBeCloseTo(100 - TUNE.damage, 9);
    expect(enemy.knockback.z).toBeCloseTo(TUNE.directKnockback, 5);
    expect(damageBlock).not.toHaveBeenCalled();
    const boom = new THREE.Vector3().copy(effects.explosion.mock.calls[0][0]);
    expect(boom.z).toBeCloseTo(from.z + speed * tT, 9);
    expect(boom.y).toBeCloseTo(TANK_HIT_Y, 9);
  });

  it('стена вплотную к стрелку по-прежнему блокирует (граница приоритета не сдвинута)', () => {
    const scene = new THREE.Scene();
    const mgr = new ProjectileManager(scene);
    const owner = makeTank(1, 0, -5);
    const wall = box(1, -5, 5, 10, 12);
    // Танк ЗА стеной и дальше радиуса сплаша (6 м > 5) — ни прямого касания,
    // ни сплаша быть не должно.
    const enemy = makeTank(2, 0, 16);
    const { ctx, effects, damageBlock } = makeCtx({ colliders: [wall], tanks: [owner, enemy] });

    fireFrom(mgr, owner, new THREE.Vector3(0, SHOT_Y, 9.8), new THREE.Vector3(0, 0, 1));
    mgr.update(SUBSTEP_DT, ctx);

    expect(damageBlock).not.toHaveBeenCalled();
    expect(new THREE.Vector3().copy(effects.explosion.mock.calls[0][0]).z).toBeCloseTo(10, 9);
    expect(enemy.health).toBe(100);
  });
});

describe('B5: trailT сбрасывается на выстреле — трейл живёт дольше одного выстрела', () => {
  /**
   * Заполняет пул целиком (первый выстрел занимает слот 0, после N выстрелов
   * round-robin курсор возвращается на 0), проворачивает один кадр, освобождает
   * пул и стреляет ПОВТОРНО в тот же слот 0.
   */
  function refillThenReuseSlot(
    mgr: ProjectileManager, ctx: HitContext, owner: TankLike,
    from: THREE.Vector3, dir: THREE.Vector3,
  ): number {
    let pool = 0;
    while (fireFrom(mgr, owner, from, dir)) {
      expect(pool).toBeLessThan(200);
      pool++;
    }
    expect(pool).toBeGreaterThan(0);
    expect(fireFrom(mgr, owner, from, dir)).toBe(false); // пул полон
    mgr.update(1 / 60, ctx);
    mgr.clear();
    expect(fireFrom(mgr, owner, from, dir)).toBe(true); // курсор на 0 → слот 0
    return pool;
  }

  it('слот не залипает на Infinity от прошлого выстрела (интервал пушки)', () => {
    const trailEffect = vi.fn();
    // Штатный интервал пушки — Infinity: без сброса trailT первый же тик писал
    // Infinity, а `Infinity - dt > 0` — вечно, и весь блок трейла замирал.
    withCannonPatch(() => ({ trailEffect, trailInterval: () => Number.POSITIVE_INFINITY }), () => {
      const scene = new THREE.Scene();
      const mgr = new ProjectileManager(scene);
      const owner = makeTank(1, 0, -5);
      const { ctx } = makeCtx({ tanks: [owner] });
      const from = new THREE.Vector3(0, SHOT_Y, 0);
      const dir = new THREE.Vector3(0, 0, 1);

      const pool = refillThenReuseSlot(mgr, ctx, owner, from, dir);
      trailEffect.mockClear();
      // Повторный выстрел в тот же слот обязан снова проскочить блок трейла.
      for (let i = 0; i < 30; i++) mgr.update(1 / 60, ctx);
      expect(trailEffect).toHaveBeenCalledTimes(1);
      expect(pool).toBeGreaterThan(0);
    });
  });

  it('конечный интервал: трейл тикает многократно и в первом, и в повторном выстреле', () => {
    const trailEffect = vi.fn();
    withCannonPatch(() => ({ trailEffect, trailInterval: () => 0.25 }), () => {
      const scene = new THREE.Scene();
      const mgr = new ProjectileManager(scene);
      const owner = makeTank(1, 0, -5);
      const { ctx } = makeCtx({ tanks: [owner] });
      const from = new THREE.Vector3(0, SHOT_Y, 0);
      const dir = new THREE.Vector3(0, 0, 1);

      // Первый выстрел в слот 0: 1 с полёта / 0.25 с интервал → 4 тика.
      expect(fireFrom(mgr, owner, from, dir)).toBe(true);
      for (let i = 0; i < 60; i++) mgr.update(1 / 60, ctx);
      const firstShot = trailEffect.mock.calls.length;
      expect(firstShot).toBeGreaterThanOrEqual(3);

      // Повторный выстрел в тот же слот тикает так же (trailT сброшен в fire()).
      refillThenReuseSlot(mgr, ctx, owner, from, dir);
      trailEffect.mockClear();
      for (let i = 0; i < 60; i++) mgr.update(1 / 60, ctx);
      expect(trailEffect.mock.calls.length).toBeGreaterThanOrEqual(3);
    });
  });
});

describe('B6: гвард скорости — слот пула не удерживается вечно', () => {
  it('поведение, забывшее про speed: выстрел деспавнится и освобождает слот', () => {
    withCannonPatch((orig) => ({
      init(s, owner, damage, range) {
        orig.init(s, owner, damage, range);
        s.speed = 0;
      },
    }), () => {
      const scene = new THREE.Scene();
      const mgr = new ProjectileManager(scene);
      const owner = makeTank(1, 0, -5);
      const { ctx } = makeCtx({ tanks: [owner] });
      const from = new THREE.Vector3(0, SHOT_Y, 0);
      const dir = new THREE.Vector3(0, 0, 1);

      let fired = 0;
      while (fireFrom(mgr, owner, from, dir)) {
        fired++;
        expect(fired).toBeLessThan(200); // страховка от бесконечного цикла
      }
      expect(fired).toBeGreaterThan(0);
      expect(fireFrom(mgr, owner, from, dir)).toBe(false); // пул полон

      mgr.update(1 / 60, ctx);
      expect(fireFrom(mgr, owner, from, dir)).toBe(true); // слоты освободились
    });
  });

  it('dt ≤ 0: снаряд не уезжает назад и не деспавнится (hit-stop)', () => {
    const scene = new THREE.Scene();
    const mgr = new ProjectileManager(scene);
    const owner = makeTank(1, 0, -5);
    const { ctx } = makeCtx({ tanks: [owner] });
    fireFrom(mgr, owner, new THREE.Vector3(0, SHOT_Y, 0), new THREE.Vector3(0, 0, 1));
    const g = firedGroup(scene);
    const z0 = g.position.z;

    mgr.update(-0.1, ctx);
    expect(g.position.z).toBeCloseTo(z0, 12);
    expect(g.visible).toBe(true);

    mgr.update(0, ctx);
    expect(g.position.z).toBeCloseTo(z0, 12);
    expect(g.visible).toBe(true);

    mgr.update(1 / 60, ctx);
    expect(g.position.z).toBeGreaterThan(z0);
  });
});

describe('B7: segmentHitT отдаёт tmin как есть', () => {
  it('старт внутри AABB → ровно 0 (никакой «защитной» ветки)', () => {
    const c = box(1, -1, 1, 10, 12);
    expect(segmentHitT(0, 10.5, 0, 13, c)).toBe(0);
    // Диагональный вход — параметр точный, без обрезки.
    expect(segmentHitT(0, 0, 1, 10, c)).toBeCloseTo(1, 12);
    expect(segmentHitT(0, 0, 1, 1, c)).toBe(-1);
  });
});

describe('B2 (изида): добивающий тик луча не теряет толчок и дым', () => {
  function makeIsidaOwner(): WeaponOwner {
    const owner = {
      id: 1,
      name: 'T1',
      isPlayer: true,
      alive: true,
      health: 100,
      radius: 1.5,
      fireTimer: 0,
      params: { damage: TURRETS.isida.damage, maxHealth: 100 },
      visual: { muzzle: new THREE.Object3D(), barrelGroup: new THREE.Group() },
      knockback: new THREE.Vector3(),
      position: new THREE.Vector3(),
      yaw: 0,
      muzzleWorld: (out: THREE.Vector3) => out.set(0, 1, 2),
      aimDir: (out: THREE.Vector3) => out.set(0, 0, 1),
      onFired: vi.fn(),
      takeDamage: vi.fn(),
    };
    return owner as unknown as WeaponOwner;
  }

  function makeBeamTarget(health: number): CombatPeer {
    const t = {
      id: 2,
      name: 'P2',
      isPlayer: false,
      alive: true,
      health,
      maxHealth: 100,
      radius: 1.5,
      knockback: new THREE.Vector3(),
      position: new THREE.Vector3(0, 0, 10),
      yaw: 0,
      visual: { group: new THREE.Group() },
      takeDamage: vi.fn(function (this: { health: number; alive: boolean }, d: number) {
        if (!this.alive || d <= 0) return;
        this.health = Math.max(0, this.health - d);
        if (this.health <= 0) this.alive = false;
      }),
    };
    return t as unknown as CombatPeer;
  }

  it('смертельный тик оставляет эффект (дым), как и тик до него', () => {
    const trailPuff = vi.fn();
    const onTankDamaged = vi.fn();
    const damageSystem = createDamageSystem(
      { damageBlock: () => null } as never,
      { onTankDamaged, onBlockDestroyed: vi.fn() },
    );
    const deps: WeaponDeps = {
      scene: new THREE.Scene(),
      effects: {
        muzzle: vi.fn(), impact: vi.fn(), trailPuff, spawnSmoke: vi.fn(),
        explosion: vi.fn(), addShake: vi.fn(),
      } as never,
      audio: {} as never,
      damageSystem,
      projectiles: {} as never,
      lights: {} as never,
    };
    const owner = makeIsidaOwner();
    const weapon = new IsidaWeapon(owner, deps);
    const enemy = makeBeamTarget(1000);
    const c: WeaponContext = { tanks: [enemy], colliders: [] };

    weapon.setFire(true);
    for (let i = 0; i < 10; i++) weapon.update(0.1, c);
    expect(weapon.getBeamMode()).toBe('attack');

    // Добивающий тик: HP ниже тикового урона.
    enemy.health = 1;
    let guard = 0;
    while (enemy.alive && guard++ < 20) {
      trailPuff.mockClear();
      weapon.update(0.1, c);
      if (enemy.alive) continue;
      // Регресс: раньше applyHit(dmg) бил по мёртвой цели и эффект терялся.
      expect(trailPuff).toHaveBeenCalled();
      break;
    }
    expect(enemy.alive).toBe(false);
    expect(enemy.health).toBe(0);
    expect(guard).toBeLessThan(20);
    // Тик урона не задваивается: applyHit(0) — no-op, HP снимает один applyDamage.
    const deals = onTankDamaged.mock.calls.filter((call) => call[0] === enemy);
    expect(deals.length).toBeGreaterThan(0);
    weapon.dispose();
  });
});