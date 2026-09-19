import * as THREE from 'three';
import { PROJECTILE } from '../constants';
import type { Collider } from './physics';
import { SHOT_HEIGHT_EPS, pointInCollider, segmentHitsCircleT, segmentHitsCollider } from './physics';
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
      ctx.onTankHit(t, dmg, s.owner);
      applySplashHit(ctx.damageSystem, t, 0, s.owner, hitPos, WEAPON_TUNING.cannon.splashKnockback * falloff,
        (p) => ctx.effects.impact(p, 0xffcc44));
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

      beh.onFlight(s, dt);

      for (let i = 0; i < steps && !dead; i++) {
        const px = pos.x;
        const pz = pos.z;
        pos.addScaledVector(s.dir, stepLen);
        s.traveled += stepLen;

        for (const c of ctx.colliders) {
          if (!c.active || !c.blocksShots) continue;
          // Высотный гейт — единый SHOT_HEIGHT_EPS (канон с railgunBlockers).
          if (pos.y > c.height + SHOT_HEIGHT_EPS) continue;
          // F5: свип сегментом пред-шаг→шаг, а не только точка после шага.
          // Ловит и «привидельное» прохождение тонкой опоры (0.7 м city), и
          // снаряд, рождённый дулом внутри коллайдера (первый сэмпл i=0 стартует
          // из spawn-точки). Точка+радиус — как раньше (не сужаем до 0).
          if (
            !pointInCollider(pos.x, pos.z, c, PROJECTILE.radius)
            && !segmentHitsCollider(px, pz, pos.x, pos.z, c)
          ) continue;

          hitPosA.set(px, pos.y, pz);
          beh.onCollideWall(s, hitPosA, ctx);
          if (s.splashRadius > 0) doSplash(hitPosA, ctx, s);

          if (c.destructible && !s.owner?.isRemote) {
            hitPosA.y = Math.min(c.height * 0.5, 2);
            ctx.damageSystem.damageBlock(c.id, s.damage, hitPosA);
          }
          despawn(s);
          dead = true;
          break;
        }
        if (dead) break;

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
