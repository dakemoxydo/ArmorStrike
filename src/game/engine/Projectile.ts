import * as THREE from 'three';
import { PROJECTILE } from '../constants';
import type { Collider } from './physics';
import { SHOT_HEIGHT_EPS, pointInCollider, segmentHitT, segmentHitsCircleT } from './physics';
import type { EffectsPort } from '../ports/EffectsPort';
import type { DamageSystem, TankLike } from '../../core/types';
import type { WeaponType } from '../../core/catalog';
import { WEAPON_TUNING } from '../../core/catalog';
import { glowTexture } from '../textures';
import { BEHAVIORS } from './ProjectileBehavior';
import { applySplashHit, isFriendlyPair } from './applyHit';

export interface HitContext {
  colliders: Collider[];
  tanks: TankLike[];
  effects: EffectsPort;
  damageSystem: DamageSystem;
  onTankHit: (target: TankLike, dmg: number, owner: TankLike) => void;
}

export interface Shot {
  group: THREE.Group;
  coreMesh: THREE.Mesh;
  glow: THREE.Sprite;
  mat: THREE.MeshStandardMaterial;
  glowMat: THREE.SpriteMaterial;
  /** Additive tapered ribbon behind the bolt. Optional on test doubles. */
  trailMesh?: THREE.Mesh;
  trailMat?: THREE.MeshBasicMaterial;
  dir: THREE.Vector3;
  alive: boolean;
  traveled: number;
  maxRange: number;
  speed: number;
  weaponType: WeaponType;
  owner: TankLike | null;
  damage: number;
  trailT: number;
  color: THREE.Color;
  splashRadius: number;
  splashDmg: number;
}

const POOL_SIZE = 42;
const tmp = new THREE.Vector3();
const hitPosA = new THREE.Vector3();
const hitPosB = new THREE.Vector3();
const expPos = new THREE.Vector3();

function doSplash(hitPos: THREE.Vector3, ctx: HitContext, s: Shot, exclude?: TankLike) {
  if (s.splashRadius <= 0 || !s.owner) return;
  for (const t of ctx.tanks) {
    if (!t.alive || t === s.owner || t === exclude) continue;
    if (isFriendlyPair(s.owner, t)) continue;
    const dx = t.position.x - hitPos.x;
    const dz = t.position.z - hitPos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist > s.splashRadius) continue;
    const falloff = 1 - dist / s.splashRadius;
    const dmg = Math.round(s.splashDmg * falloff);
    if (dmg > 0) {
      // Порядок «толчок+эффект → урон» (как у прямого попадания, см. Projectile
      // update): applySplashHit пропускает и толчок, и эффект через
      // combatAllowsImpulse, а тот снимается `!target.alive`. С уроном первым
      // сплаш, убивший цель, не давал ни отдачи, ни парка — результат зависел от
      // 1 HP. applyDamage(0) внутри helper'а — no-op, HP вычитает onTankHit.
      applySplashHit(ctx.damageSystem, t, 0, s.owner, hitPos, WEAPON_TUNING.cannon.splashKnockback * falloff,
        (p) => ctx.effects.impact(p, 0xffcc44));
      ctx.onTankHit(t, dmg, s.owner);
    }
  }
}

function despawn(s: Shot) {
  s.alive = false;
  s.owner = null;
  s.group.visible = false;
}

export class ProjectileManager {
  private shots: Shot[] = [];
  /** Round-robin cursor for O(1) free-slot lookup (replaces Array.find). */
  private cursor = 0;
  private readonly scene: THREE.Scene;
  private readonly capGeo: THREE.BufferGeometry;
  private readonly trailGeo: THREE.BufferGeometry;
  private readonly glowTex: THREE.Texture;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.capGeo = new THREE.CapsuleGeometry(PROJECTILE.radius, 1.15, 4, 10);
    this.capGeo.rotateX(Math.PI / 2);
    // Tapered ribbon: lookAt aims -Z forward, so +Z is the wake.
    this.trailGeo = new THREE.CylinderGeometry(0.10, 0.28, 8.4, 6);
    this.trailGeo.rotateX(Math.PI / 2);
    this.glowTex = glowTexture();

    for (let i = 0; i < POOL_SIZE; i++) {
      const mat = new THREE.MeshStandardMaterial({
        color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 3.5,
        roughness: 0.3, metalness: 0,
      });
      const coreMesh = new THREE.Mesh(this.capGeo, mat);
      const glowMat = new THREE.SpriteMaterial({
        map: this.glowTex, transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending, opacity: 0.85,
      });
      const glow = new THREE.Sprite(glowMat);
      glow.scale.setScalar(1.7);
      const trailMat = new THREE.MeshBasicMaterial({
        color: 0xffb020,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      });
      const trailMesh = new THREE.Mesh(this.trailGeo, trailMat);
      trailMesh.position.z = 4.1;
      const group = new THREE.Group();
      group.add(coreMesh);
      group.add(glow);
      group.add(trailMesh);
      group.visible = false;
      scene.add(group);

      this.shots.push({
        group, coreMesh, glow, mat, glowMat, trailMesh, trailMat,
        dir: new THREE.Vector3(), alive: false, traveled: 0,
        // speed is owned by the weapon behavior (set in init() on fire);
        // pooled slots are never in flight before init, so 0 is safe.
        maxRange: PROJECTILE.range, speed: 0,
        weaponType: 'cannon', owner: null, damage: 0, trailT: 0,
        color: new THREE.Color(), splashRadius: 0, splashDmg: 0,
      });
    }
  }

  /**
   * Acquire a pooled slot and launch. Returns false when the pool is fully
   * occupied (caller decides whether to consume ammo/FX — a silent dry-fire
   * used to eat a magazine round plus recoil with no projectile).
   */
  fire(
    owner: TankLike, origin: THREE.Vector3, dir: THREE.Vector3,
    damage: number, weaponType: WeaponType = 'cannon', customRange?: number,
  ): boolean {
    // Round-robin search for a free slot (avoids O(n) Array.find on every shot).
    let s: Shot | undefined;
    for (let i = 0; i < POOL_SIZE; i++) {
      const idx = (this.cursor + i) % POOL_SIZE;
      if (!this.shots[idx].alive) {
        s = this.shots[idx];
        this.cursor = (idx + 1) % POOL_SIZE;
        break;
      }
    }
    if (!s) return false;
    const beh = BEHAVIORS[weaponType];
    if (!beh) return false;

    s.alive = true;
    s.owner = owner;
    s.damage = damage;
    s.traveled = 0;
    s.weaponType = weaponType;
    s.dir.copy(dir).normalize();
    // B5: слот пула живёт между выстрелами. Без сброса первый же trailEffect
    // писал в trailT = trailInterval(), а у пушки это Infinity → `Infinity - dt`
    // остаётся Infinity, и весь блок трейла замирал навсегда на слоте.
    s.trailT = 0;

    beh.init(s, owner, damage, customRange);

    s.group.position.copy(origin).addScaledVector(s.dir, 0.5);
    s.group.lookAt(tmp.copy(s.group.position).add(s.dir));
    s.mat.emissive.copy(s.color);
    s.mat.color.copy(s.color);
    s.glowMat.color.copy(s.color);
    if (s.trailMat) s.trailMat.color.copy(s.color);
    s.group.visible = true;
    return true;
  }

  update(dt: number, ctx: HitContext) {
    for (const s of this.shots) {
      if (!s.alive) continue;

      const beh = BEHAVIORS[s.weaponType];
      if (!beh) {
        despawn(s);
        continue;
      }
      const speed = s.speed * dt;
      const steps = Math.max(1, Math.ceil(speed / 0.6));
      const stepLen = speed / steps;
      const pos = s.group.position;
      let dead = false;

      // B6: гвард не-положительного сдвига. Слоты пула создаются со speed = 0
      // (его ставит behaviour в init()), и любое поведение, забывшее это
      // сделать, давало stepLen = 0 → traveled не растёт → снаряд не деспавнится
      // и держит слот до вечности (42 утечки — пул мёртв). При dt < 0 снаряд
      // уезжал бы назад тем же шагом. dt == 0 (hit-stop) — норма: только стоп.
      if (!(speed > 0)) {
        if (dt > 0) despawn(s);
        continue;
      }

      beh.onFlight(s, dt);

      for (let i = 0; i < steps && !dead; i++) {
        const px = pos.x;
        const pz = pos.z;
        pos.addScaledVector(s.dir, stepLen);
        s.traveled += stepLen;

        // B3: broad-phase «снаряд ↔ коллайдеры». AABB свипа (px,pz)→(pos)
        // считается один раз на субшаг, дальше — четыре дешёвых сравнения
        // вместо точного свипа по каждому коллайдеру карты (124–201 на карту).
        // Запас PROJECTILE.radius обязателен: ниже точечный тест бьёт и по
        // надутому боксу, и без надува broad-phase отсёк бы валидные попадания.
        const r = PROJECTILE.radius;
        const sweepMinX = px < pos.x ? px : pos.x;
        const sweepMaxX = px > pos.x ? px : pos.x;
        const sweepMinZ = pz < pos.z ? pz : pos.z;
        const sweepMaxZ = pz > pos.z ? pz : pos.z;

        // B1/B4: ближайшая по свипу стена (не «первая в массиве» и не «любая»).
        let wall: Collider | null = null;
        let wallT = 0;
        for (const c of ctx.colliders) {
          if (!c.active || !c.blocksShots) continue;
          // Высотный гейт — единый SHOT_HEIGHT_EPS (канон с railgunBlockers).
          if (pos.y > c.height + SHOT_HEIGHT_EPS) continue;
          if (
            sweepMaxX < c.minX - r || sweepMinX > c.maxX + r
            || sweepMaxZ < c.minZ - r || sweepMinZ > c.maxZ + r
          ) continue;
          // F5: свип сегментом пред-шаг→шаг, а не только точка после шага.
          // Ловит и «привидельное» прохождение тонкой опоры (0.7 м city), и
          // снаряд, рождённый дулом внутри коллайдера (первый сэмпл i=0 стартует
          // из spawn-точки). Точка+радиус — как раньше (не сужаем до 0).
          // Свип проверяем ПЕРВЫМ: конец почти всегда оказывается внутри
          // надутого бокса, и проверка точкой первой давала бы t = 0 (старый баг).
          let t = segmentHitT(px, pz, pos.x, pos.z, c);
          if (t < 0) {
            // Пересечения нет — остаётся дискретный тест «конец уже на грань
            // или внутрь». Параметра у него нет, поэтому удар приписываем к
            // началу субшага (t = 0): это и есть честная нижняя оценка, и
            // ровно то поведение, что было до этого фикса.
            if (!pointInCollider(pos.x, pos.z, c, r)) continue;
            t = 0;
          }
          if (!wall || t < wallT) {
            wall = c;
            wallT = t;
          }
        }

        let bestTank: (typeof ctx.tanks)[number] | null = null;
        let bestT = Infinity;
        for (const t of ctx.tanks) {
          if (!t.alive || t === s.owner) continue;
          if (s.owner && isFriendlyPair(s.owner, t)) continue;
          // C5: ближайшая по траектории цель, а не первая в ростере (в DM
          // игрок — нулевой элемент, и снаряд «из-за спины» бота попадал в него).
          const tHit = segmentHitsCircleT(px, pz, pos.x, pos.z, t.position.x, t.position.z, t.radius + PROJECTILE.radius);
          if (tHit >= 0 && tHit < bestT) {
            bestT = tHit;
            bestTank = t;
          }
        }

        // B4: стена не перебивает корпус, до которого снаряд не дошёл ещё.
        // resolveCircle держит танк на ≥ radius от стены, а по нему снаряд
        // «попадает» за 0.18 м до грани — оба события жили в одном субшаге, и
        // прижатый к стене танк всегда проигрывал стене. При равных t приоритет
        // у стены (сплошная геометрия важнее мягкого корпуса).
        if (wall && wallT <= bestT) {
          // B1: точка удара — пересечение с гранью, а не начало субшага: взрыв,
          // сплаш и damageBlock уезжали назад к стрелку (до 0.6 м = stepLen).
          hitPosA.set(
            px + (pos.x - px) * wallT,
            pos.y,
            pz + (pos.z - pz) * wallT,
          );
          beh.onCollideWall(s, hitPosA, ctx);
          if (s.splashRadius > 0) doSplash(hitPosA, ctx, s);

          if (wall.destructible && !s.owner?.isRemote) {
            hitPosA.y = Math.min(wall.height * 0.5, 2);
            ctx.damageSystem.damageBlock(wall.id, s.damage, hitPosA);
          }
          despawn(s);
          dead = true;
          break;
        }

        if (bestTank) {
          const sx = px + (pos.x - px) * bestT;
          const sz = pz + (pos.z - pz) * bestT;
          hitPosB.set(sx, 1.6, sz);
          beh.onHitTank(s, bestTank, hitPosB, s.dir, ctx, s.owner);
          if (s.splashRadius > 0) doSplash(hitPosB, ctx, s, bestTank);

          ctx.onTankHit(bestTank, s.damage, s.owner!);
          despawn(s);
          dead = true;
        }
        if (dead) break;

        if (s.traveled >= s.maxRange) {
          expPos.copy(pos);
          beh.onExpire(s, expPos, ctx);
          if (s.splashRadius > 0) doSplash(expPos, ctx, s);
          despawn(s);
          dead = true;
        }
      }

      if (!dead) {
        s.trailT -= dt;
        if (s.trailT <= 0) {
          beh.trailEffect(s, pos, ctx);
          s.trailT = beh.trailInterval(s);
        }
      }
    }
  }

  clear() {
    for (const s of this.shots) despawn(s);
  }

  /** Remove pool from scene and free GPU resources (game dispose). */
  dispose() {
    this.clear();
    for (const s of this.shots) {
      this.scene.remove(s.group);
      s.mat.dispose();
      s.glowMat.dispose();
      s.trailMat?.dispose();
    }
    this.shots = [];
    this.capGeo.dispose();
    this.trailGeo.dispose();
    // glowTex is a markShared cache singleton (textures/shared.ts) — the cache
    // owns it for the process lifetime, so it is NOT disposed here.
  }
}
