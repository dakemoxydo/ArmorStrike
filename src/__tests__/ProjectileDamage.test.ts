/**
 * C2 regression: cannon tank-hit pipeline must reduce HP via applyDamage.
 * Shipped composition (ProjectileBehavior.onHitTank + ProjectileStage.onTankHit):
 *   applyHit(..., dmg=0) → knockback/VFX only
 *   onTankHit → damageSystem.applyDamage(target, s.damage, owner)
 * Old bug: onTankHit called combat.onTankDamaged (hooks only) → 0 HP change.
 */
import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import { createDamageSystem } from '../core/DamageSystem';
import { applyHit, applySplashHit } from '../game/engine/applyHit';
import type { TankLike } from '../core/types';

function makeTank(over: Partial<TankLike> & { health?: number; id?: number } = {}): TankLike & {
  health: number;
  alive: boolean;
  id: number;
} {
  const tank = {
    id: over.id ?? 1,
    name: 'T',
    isPlayer: false,
    health: over.health ?? 100,
    alive: true as boolean,
    radius: 1.5,
    knockback: new THREE.Vector3(),
    position: new THREE.Vector3(0, 0, 10),
    yaw: 0,
    takeDamage(this: { health: number; alive: boolean }, d: number) {
      if (!this.alive || d <= 0) return;
      this.health -= d;
      if (this.health <= 0) {
        this.health = 0;
        this.alive = false;
      }
    },
    ...over,
  };
  return tank as any;
}

/** Mirrors ProjectileStage.onTankHit after C2 fix. */
function onTankHitFixed(
  damageSystem: ReturnType<typeof createDamageSystem>,
  target: TankLike,
  dmg: number,
  owner: TankLike,
) {
  damageSystem.applyDamage(target, dmg, owner);
}

/** Old buggy ProjectileStage wiring. */
function onTankHitBuggy(
  onTankDamaged: (t: TankLike, d: number, o: TankLike) => void,
  target: TankLike,
  dmg: number,
  owner: TankLike,
) {
  onTankDamaged(target, dmg, owner);
}

/** Mirrors ProjectileBehavior.cannon.onHitTank + Projectile.update tank branch. */
function resolveCannonDirectHit(
  damageSystem: ReturnType<typeof createDamageSystem>,
  target: TankLike,
  owner: TankLike,
  shotDamage: number,
  onTankHit: (t: TankLike, d: number, o: TankLike) => void,
) {
  const hitPos = new THREE.Vector3(0, 1.6, 5);
  const dir = new THREE.Vector3(0, 0, 1);
  const effect = vi.fn();
  // knockback/VFX path with dmg=0 (shipped ProjectileBehavior)
  applyHit(damageSystem, target, 0, owner, dir, 4.0, effect, hitPos);
  // real damage path (must be applyDamage, not hook-only)
  onTankHit(target, shotDamage, owner);
}

describe('cannon tank-hit damage pipeline (C2)', () => {
  it('fixed wiring: direct hit reduces HP by shot damage exactly once', () => {
    const target = makeTank({ id: 2, health: 100 });
    const owner = makeTank({ id: 1 });
    const onTankDamaged = vi.fn();
    const ds = createDamageSystem({ damageBlock: () => null } as any, {
      onTankDamaged,
      onBlockDestroyed: vi.fn(),
    });

    resolveCannonDirectHit(ds, target, owner, 32, (t, d, o) => onTankHitFixed(ds, t, d, o));

    expect(target.health).toBe(68);
    expect(onTankDamaged).toHaveBeenCalledTimes(1);
    expect(onTankDamaged).toHaveBeenCalledWith(target, 32, owner);
    expect(target.knockback.z).toBeCloseTo(4, 5);
  });

  it('buggy wiring: hook-only onTankHit leaves HP unchanged (root-cause document)', () => {
    const target = makeTank({ id: 2, health: 100 });
    const owner = makeTank({ id: 1 });
    const presentationOnly = vi.fn();
    const ds = createDamageSystem({ damageBlock: () => null } as any, {
      onTankDamaged: vi.fn(),
      onBlockDestroyed: vi.fn(),
    });

    resolveCannonDirectHit(ds, target, owner, 32, (t, d, o) =>
      onTankHitBuggy(presentationOnly, t, d, o),
    );

    expect(target.health).toBe(100);
    expect(presentationOnly).toHaveBeenCalledWith(target, 32, owner);
  });

  it('splash: applyDamage on splash dmg + applySplashHit(0) applies HP once without double hooks', () => {
    const target = makeTank({ id: 3, health: 100, position: new THREE.Vector3(2, 0, 5) });
    const owner = makeTank({ id: 1 });
    const onTankDamaged = vi.fn();
    const ds = createDamageSystem({ damageBlock: () => null } as any, {
      onTankDamaged,
      onBlockDestroyed: vi.fn(),
    });
    const center = new THREE.Vector3(0, 1.6, 5);
    const splashDmg = 16;

    // Shipped doSplash composition after C2
    onTankHitFixed(ds, target, splashDmg, owner);
    applySplashHit(ds, target, 0, owner, center, 2.5, vi.fn());

    expect(target.health).toBe(84);
    expect(onTankDamaged).toHaveBeenCalledTimes(1);
  });
});
