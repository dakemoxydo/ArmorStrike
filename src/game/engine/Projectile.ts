import * as THREE from 'three';
import { PROJECTILE } from '../constants';
import type { Collider } from './physics';
import { pointInCollider, segmentHitsCircle } from './physics';
import type { EffectsPort } from '../ports/EffectsPort';
import type { DamageSystem, TankLike } from '../../core/types';
import type { WeaponType } from '../../core/catalog';
import { glowTexture } from '../textures';
import { BEHAVIORS } from './ProjectileBehavior';
import { applySplashHit } from './applyHit';

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
    const dx = t.position.x - hitPos.x;
    const dz = t.position.z - hitPos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist > s.splashRadius) continue;
    const falloff = 1 - dist / s.splashRadius;
    const dmg = Math.round(s.splashDmg * falloff);
    if (dmg > 0) {
      ctx.onTankHit(t, dmg, s.owner);
      applySplashHit(ctx.damageSystem, t, 0, s.owner, hitPos, 2.5 * falloff,
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

  constructor(scene: THREE.Scene) {
    const capGeo = new THREE.CapsuleGeometry(PROJECTILE.radius, 1.15, 4, 10);
    capGeo.rotateX(Math.PI / 2);
    const gTex = glowTexture();

    for (let i = 0; i < POOL_SIZE; i++) {
      const mat = new THREE.MeshStandardMaterial({
        color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 3.5,
        roughness: 0.3, metalness: 0,
      });
      const coreMesh = new THREE.Mesh(capGeo, mat);
      const glowMat = new THREE.SpriteMaterial({
        map: gTex, transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending, opacity: 0.85,
      });
      const glow = new THREE.Sprite(glowMat);
      glow.scale.setScalar(1.7);
      const group = new THREE.Group();
      group.add(coreMesh);
      group.add(glow);
      group.visible = false;
      scene.add(group);

      this.shots.push({
        group, coreMesh, glow, mat, glowMat,
        dir: new THREE.Vector3(), alive: false, traveled: 0,
        maxRange: PROJECTILE.range, speed: PROJECTILE.speed,
        weaponType: 'cannon', owner: null, damage: 0, trailT: 0,
        color: new THREE.Color(), splashRadius: 0, splashDmg: 0,
      });
    }
  }

  fire(
    owner: TankLike, origin: THREE.Vector3, dir: THREE.Vector3,
    damage: number, weaponType: WeaponType = 'cannon', customRange?: number,
  ) {
    const s = this.shots.find((x) => !x.alive);
    if (!s) return;
    const beh = BEHAVIORS[weaponType];
    if (!beh) return;

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
    s.group.visible = true;
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
          if (!pointInCollider(pos.x, pos.z, c, PROJECTILE.radius)) continue;
          if (pos.y > c.height + PROJECTILE.radius) continue;

          hitPosA.set(px, pos.y, pz);
          beh.onCollideWall(s, hitPosA, ctx);
          if (s.splashRadius > 0) doSplash(hitPosA, ctx, s);

          if (c.destructible) {
            hitPosA.y = Math.min(c.height * 0.5, 2);
            ctx.damageSystem.damageBlock(c.id, s.damage, hitPosA);
          }
          despawn(s);
          dead = true;
          break;
        }
        if (dead) break;

        for (const t of ctx.tanks) {
          if (!t.alive || t === s.owner) continue;
          if (!segmentHitsCircle(px, pz, pos.x, pos.z, t.position.x, t.position.z, t.radius + PROJECTILE.radius)) continue;

          hitPosB.set(pos.x, 1.6, pos.z);
          beh.onHitTank(s, t, hitPosB, s.dir, ctx, s.owner);
          if (s.splashRadius > 0) doSplash(hitPosB, ctx, s, t);

          ctx.onTankHit(t, s.damage, s.owner!);
          despawn(s);
          dead = true;
          break;
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
}
