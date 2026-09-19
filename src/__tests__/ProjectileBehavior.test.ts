import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import { BEHAVIORS } from '../game/engine/ProjectileBehavior';
import type { Shot } from '../game/engine/Projectile';
import type { TankLike } from '../core/types';
import { WEAPON_TUNING } from '../core/catalog';

function makeShot(): Shot {
  return {
    group: new THREE.Group(),
    coreMesh: new THREE.Mesh(),
    glow: new THREE.Sprite(),
    mat: new THREE.MeshStandardMaterial(),
    glowMat: new THREE.SpriteMaterial(),
    dir: new THREE.Vector3(0, 0, 1),
    alive: true,
    traveled: 0,
    maxRange: 0,
    speed: 0,
    weaponType: 'cannon',
    owner: null,
    damage: 0,
    trailT: 0,
    color: new THREE.Color(),
    splashRadius: 0,
    splashDmg: 0,
  };
}

function makeOwner(isPlayer = true, id = 1): TankLike {
  return {
    id,
    name: 'T',
    isPlayer,
    health: 100,
    alive: true,
    radius: 1.5,
    position: new THREE.Vector3(),
    knockback: new THREE.Vector3(),
    yaw: 0,
    takeDamage: () => {},
  };
}

describe('ProjectileBehavior (cannon pool only)', () => {
  it('only cannon is registered (railgun/flamethrower are not projectile weapons)', () => {
    expect(BEHAVIORS.cannon).toBeDefined();
    expect(BEHAVIORS.railgun).toBeUndefined();
    expect(BEHAVIORS.flamethrower).toBeUndefined();
  });

  it('cannon: splash scales with damage and catalog tuning', () => {
    const s = makeShot();
    BEHAVIORS.cannon!.init(s, makeOwner(), 32, 75);
    expect(s.speed).toBe(54);
    expect(s.maxRange).toBe(75);
    expect(s.splashRadius).toBe(5);
    expect(s.splashDmg).toBe(15);
  });

  it('cannon onHitTank даёт knockback и эффекты', () => {
    const s = makeShot();
    const target = makeOwner(false, 2);
    const hitPos = new THREE.Vector3(1, 1, 1);
    const dir = new THREE.Vector3(0, 0, 1);
    const effects = {
      explosion: vi.fn(),
      impact: vi.fn(),
      trailPuff: vi.fn(),
      spawnSmoke: vi.fn(),
    };
    BEHAVIORS.cannon!.onHitTank(s, target, hitPos, dir, {
      colliders: [], tanks: [], effects: effects as any,
      damageSystem: {
        applyDamage: vi.fn(),
        applyKnockback: (t: any, d: any, f: number) => t.knockback.addScaledVector(d, f),
      } as any, onTankHit: vi.fn(),
    }, makeOwner(true));
    expect(effects.explosion).toHaveBeenCalled();
    expect(effects.impact).toHaveBeenCalled();
    // Knockback — из WEAPON_TUNING.cannon.directKnockback, не хардкод.
    expect(WEAPON_TUNING.cannon.directKnockback).toBe(4.0);
    expect(target.knockback.z).toBeCloseTo(WEAPON_TUNING.cannon.directKnockback, 5);
  });

  it('cannon uses a mesh ribbon, not puff trail ticks', () => {
    const s = makeShot();
    expect(BEHAVIORS.cannon!.trailInterval(s)).toBe(Number.POSITIVE_INFINITY);
    const effects = { trailPuff: vi.fn() };
    BEHAVIORS.cannon!.trailEffect(s, new THREE.Vector3(), { effects } as never);
    expect(effects.trailPuff).not.toHaveBeenCalled();
  });
});
