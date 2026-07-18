import * as THREE from 'three';
import { WEAPON_TUNING, type WeaponType } from '../../core/catalog';
import type { Shot, HitContext } from './Projectile';
import type { TankLike } from '../../core/types';
import { applyHit } from './applyHit';

export interface ProjectileBehavior {
  init(s: Shot, owner: TankLike, damage: number, customRange?: number): void;
  onFlight(s: Shot, dt: number): void;
  onCollideWall(s: Shot, hitPos: THREE.Vector3, ctx: HitContext): void;
  onHitTank(s: Shot, target: TankLike, hitPos: THREE.Vector3, dir: THREE.Vector3, ctx: HitContext, owner: TankLike | null): void;
  onExpire(s: Shot, pos: THREE.Vector3, ctx: HitContext): void;
  trailEffect(s: Shot, pos: THREE.Vector3, ctx: HitContext): void;
  trailInterval(s: Shot): number;
}

/**
 * Projectile-pool behaviors. Only cannon uses the projectile pool;
 * railgun (hitscan) and flamethrower (cone) have dedicated weapon classes.
 */
const cannon: ProjectileBehavior = {
  init(s, _owner, damage, customRange) {
    const tune = WEAPON_TUNING.cannon;
    s.speed = 48;
    s.maxRange = customRange ?? tune.range;
    s.color.setHex(0xffb020);
    s.glow.scale.setScalar(2.2);
    s.coreMesh.scale.set(1.3, 1.3, 1.4);
    s.splashRadius = tune.splashRadius;
    // Доля splash от полного урона (16/32 при дефолтном damage) — масштабируется с damage.
    s.splashDmg = Math.round(damage * (tune.splashDmg / tune.damage));
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
    ctx.effects.trailPuff(pos, CANNON_TRAIL_COLOR);
  },
  trailInterval() { return 0.04; },
};

const CANNON_TRAIL_COLOR = new THREE.Color(0xffb020);

export const BEHAVIORS: Partial<Record<WeaponType, ProjectileBehavior>> = {
  cannon,
};
