import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import { BEHAVIORS } from '../game/engine/ProjectileBehavior';
import type { Shot } from '../game/engine/Projectile';
import type { TankEntity } from '../game/Tank';

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

function makeOwner(isPlayer = true): TankEntity {
  return {
    isPlayer,
    position: new THREE.Vector3(),
    knockback: new THREE.Vector3(),
  } as unknown as TankEntity;
}

describe('ProjectileBehavior.init', () => {
  it('railgun: hitscan-like speed, no splash', () => {
    const s = makeShot();
    BEHAVIORS.railgun.init(s, makeOwner(true), 85, 120);
    expect(s.speed).toBe(72);
    expect(s.maxRange).toBe(120);
    expect(s.splashRadius).toBe(0);
    expect(s.splashDmg).toBe(0);
  });

  it('flamethrower: короткая дистанция и разброс направления', () => {
    const s = makeShot();
    const before = s.dir.clone();
    BEHAVIORS.flamethrower.init(s, makeOwner(), 12);
    expect(s.maxRange).toBe(22);
    expect(s.speed).toBe(30);
    expect(s.dir.length()).toBeCloseTo(1, 5);
    // с высокой вероятностью dir чуть смещён (не гарантируем ≠, только normalize)
    void before;
  });

  it('cannon: splash = half damage rounded', () => {
    const s = makeShot();
    BEHAVIORS.cannon.init(s, makeOwner(), 32, 75);
    expect(s.speed).toBe(48);
    expect(s.maxRange).toBe(75);
    expect(s.splashRadius).toBe(5);
    expect(s.splashDmg).toBe(16);
  });

  it('cannon onHitTank даёт knockback и эффекты', () => {
    const s = makeShot();
    const target = makeOwner(false);
    const hitPos = new THREE.Vector3(1, 1, 1);
    const dir = new THREE.Vector3(0, 0, 1);
    const effects = {
      explosion: vi.fn(),
      impact: vi.fn(),
      trailPuff: vi.fn(),
      spawnSmoke: vi.fn(),
    };
    BEHAVIORS.cannon.onHitTank(s, target, hitPos, dir, {
      colliders: [], tanks: [], arena: {} as any, effects: effects as any,
      damageSystem: {
        applyDamage: vi.fn(),
        applyKnockback: (t: any, d: any, f: number) => t.knockback.addScaledVector(d, f),
      } as any, onTankHit: vi.fn(),
    }, makeOwner(true));
    expect(effects.explosion).toHaveBeenCalled();
    expect(effects.impact).toHaveBeenCalled();
    expect(target.knockback.z).toBeCloseTo(4, 5);
  });

  it('trailInterval различается по типу', () => {
    const s = makeShot();
    expect(BEHAVIORS.railgun.trailInterval(s)).toBeLessThan(BEHAVIORS.cannon.trailInterval(s));
  });
});
