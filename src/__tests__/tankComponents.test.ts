/**
 * Structural proof: TankEntity stores domain state in components and
 * projects the same values through flat port fields (no gameplay change).
 */
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { TankEntity } from '../game/Tank';
import type { TankParams, TankVisual } from '../game/tank/types';

function makeVisual(): TankVisual {
  const group = new THREE.Group();
  return {
    group,
    hull: new THREE.Group(),
    turret: new THREE.Group(),
    barrelGroup: new THREE.Group(),
    muzzle: new THREE.Object3D(),
    ring: new THREE.Mesh(),
    bodyMats: [],
    trackTex: null as unknown as THREE.CanvasTexture,
  };
}

const PARAMS: TankParams = {
  maxHealth: 100,
  speed: 15,
  reverseSpeed: 9,
  turnSpeed: 2.5,
  turretSpeed: 3,
  damage: 40,
  shotCooldown: 0.28,
};

describe('TankEntity component composition', () => {
  it('projects motion/combat/buffs through flat fields', () => {
    const t = new TankEntity('T', true, PARAMS, makeVisual());

    t.yaw = 1.25;
    expect(t.motion.yaw).toBe(1.25);
    expect(t.yaw).toBe(1.25);

    t.health = 77;
    expect(t.combat.health).toBe(77);

    t.reloadSpeedMul = 1.5;
    expect(t.buffs.reloadSpeedMul).toBe(1.5);

    t.knockback.set(3, 0, 4);
    expect(t.motion.knockback.x).toBe(3);
    expect(t.knockback.z).toBe(4);
  });

  it('takeDamage writes combat + fx + clears motion on death', () => {
    const t = new TankEntity('T', true, PARAMS, makeVisual());
    t.throttle = 1;
    t.steer = 0.5;
    t.takeDamage(200, 9);
    expect(t.combat.alive).toBe(false);
    expect(t.combat.health).toBe(0);
    expect(t.combat.lastAttackerId).toBe(9);
    expect(t.fx.hitFlash).toBe(1);
    expect(t.motion.throttle).toBe(0);
    expect(t.motion.steer).toBe(0);
  });
});
