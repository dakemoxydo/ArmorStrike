import * as THREE from 'three';
import { COLORS } from '../../core/constants';
import type { Shot, HitContext } from './Projectile';
import type { TankEntity } from '../Tank';
import { applyHit } from './applyHit';

export interface ProjectileBehavior {
  init(s: Shot, owner: TankEntity, damage: number, customRange?: number): void;
  onFlight(s: Shot, dt: number): void;
  onCollideWall(s: Shot, hitPos: THREE.Vector3, ctx: HitContext): void;
  onHitTank(s: Shot, target: TankEntity, hitPos: THREE.Vector3, dir: THREE.Vector3, ctx: HitContext, owner: TankEntity | null): void;
  onExpire(s: Shot, pos: THREE.Vector3, ctx: HitContext): void;
  trailEffect(s: Shot, pos: THREE.Vector3, ctx: HitContext): void;
  trailInterval(s: Shot): number;
}

const railgun: ProjectileBehavior = {
  init(s, owner, _damage, customRange) {
    s.speed = 72;
    s.maxRange = customRange ?? 85;
    s.color.setHex(owner.isPlayer ? COLORS.player : 0xff3366);
    s.glow.scale.setScalar(1.7);
    s.coreMesh.scale.set(0.8, 0.8, 1.8);
    s.splashRadius = 0;
    s.splashDmg = 0;
  },
  onFlight() {},
  onCollideWall(_, hitPos, ctx) {
    ctx.effects.impact(hitPos, 0x8fffe8);
  },
  onHitTank(_, target, hitPos, dir, ctx, owner) {
    applyHit(ctx.damageSystem, target, 0, owner ?? target, dir, 2.8,
      (p) => ctx.effects.impact(p, 0x8fffe8), hitPos);
  },
  onExpire(_, pos, ctx) {
    ctx.effects.trailPuff(pos, new THREE.Color(0x8fffe8));
  },
  trailEffect(_, pos, ctx) {
    ctx.effects.trailPuff(pos, new THREE.Color(0x8fffe8));
  },
  trailInterval() { return 0.025; },
};

const flamethrower: ProjectileBehavior = {
  init(s, _owner, _damage, customRange) {
    s.dir.x += (Math.random() - 0.5) * 0.13;
    s.dir.z += (Math.random() - 0.5) * 0.13;
    s.dir.y += (Math.random() - 0.5) * 0.04;
    s.dir.normalize();
    s.speed = 30;
    s.maxRange = customRange ?? 22;
    s.color.setHex(0xff5500);
    s.glow.scale.setScalar(3.0);
    s.coreMesh.scale.set(2.0, 2.0, 1.2);
    s.splashRadius = 0;
    s.splashDmg = 0;
  },
  onFlight(s, _dt) {
    const growth = 1.0 + (s.traveled / s.maxRange) * 2.5;
    s.glow.scale.setScalar(2.8 * growth);
    s.glowMat.opacity = 0.75 * (1 - s.traveled / s.maxRange);
  },
  onCollideWall(_, hitPos, ctx) {
    ctx.effects.spawnSmoke(hitPos, 3, 1.5, true);
    ctx.effects.impact(hitPos, 0xff6600);
  },
  onHitTank(_, target, hitPos, dir, ctx, owner) {
    applyHit(ctx.damageSystem, target, 0, owner ?? target, dir, 0.5,
      (p) => {
        ctx.effects.spawnSmoke(p, 2, 0.8, false);
        ctx.effects.impact(p, 0xff5500);
      }, hitPos);
  },
  onExpire(_, pos, ctx) {
    ctx.effects.spawnSmoke(pos, 1, 0.7, false);
  },
  trailEffect(_, pos, ctx) {
    ctx.effects.trailPuff(pos, new THREE.Color(0xff6600));
  },
  trailInterval() { return 0.03; },
};

const cannon: ProjectileBehavior = {
  init(s, _owner, damage, customRange) {
    s.speed = 48;
    s.maxRange = customRange ?? 75;
    s.color.setHex(0xffb020);
    s.glow.scale.setScalar(2.2);
    s.coreMesh.scale.set(1.3, 1.3, 1.4);
    s.splashRadius = 5.0;
    s.splashDmg = Math.round(damage * 0.5);
  },
  onFlight() {},
  onCollideWall(_, hitPos, ctx) {
    ctx.effects.explosion(hitPos, 0xffb020, 1.2);
    ctx.effects.impact(hitPos, 0xffcc44);
  },
  onHitTank(_, target, hitPos, dir, ctx, owner) {
    applyHit(ctx.damageSystem, target, 0, owner ?? target, dir, 4.0,
      (p) => {
        ctx.effects.explosion(p, 0xffb020, 1.3);
        ctx.effects.impact(p, 0xffcc44);
      }, hitPos);
  },
  onExpire(_, pos, ctx) {
    ctx.effects.explosion(pos, 0xffb020, 0.8);
  },
  trailEffect(_, pos, ctx) {
    ctx.effects.trailPuff(pos, new THREE.Color(0xffb020));
  },
  trailInterval() { return 0.04; },
};

export const BEHAVIORS: Record<string, ProjectileBehavior> = {
  railgun, flamethrower, cannon,
};
