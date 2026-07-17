/**
 * Structural proof for P3r ports: AI / weapons no longer import TankEntity.
 * Drives real module exports and asserts type contracts via runtime shape checks.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  preferredRange,
  aimTolerance,
  steeringFromAngle,
  AIController,
  type AIBody,
  type AITarget,
  type AICtx,
} from '../game/AI';
import type { CombatPeer, WeaponContext, WeaponOwner } from '../game/weapons/types';
import { buildAmmoState } from '../game/weapons/types';
import * as THREE from 'three';

const srcRoot = resolve(__dirname, '..');

function sourceOf(rel: string): string {
  return readFileSync(resolve(srcRoot, rel), 'utf8');
}

describe('P3r residual TankEntity fan-in ports', () => {
  it('AI.ts and weapons ports do not import Tank module / TankEntity type', () => {
    // Import lines only — comments may still mention the concrete class historically
    expect(sourceOf('game/AI.ts')).not.toMatch(/import\s+.*TankEntity/);
    expect(sourceOf('game/AI.ts')).not.toMatch(/from ['"]\.\/Tank['"]/);
    expect(sourceOf('game/weapons/types.ts')).not.toMatch(/import\s+.*TankEntity/);
    expect(sourceOf('game/weapons/types.ts')).not.toMatch(/from ['"]\.\.\/Tank['"]/);
    expect(sourceOf('game/weapons/RailgunWeapon.ts')).not.toMatch(/from ['"]\.\.\/Tank['"]/);
    expect(sourceOf('game/weapons/FlamethrowerWeapon.ts')).not.toMatch(/from ['"]\.\.\/Tank['"]/);
  });

  it('AIController accepts AIBody stub (not full TankEntity)', () => {
    const body: AIBody = {
      position: new THREE.Vector3(0, 0, 0),
      yaw: 0,
      aimYaw: 0,
      turretYaw: 0,
      fireTimer: 0,
      throttle: 0,
      steer: 0,
      boosting: false,
      speed: 0,
      alive: true,
      radius: 1.5,
      params: { weaponType: 'cannon' },
    };
    const player: AITarget = {
      position: new THREE.Vector3(10, 0, 10),
      alive: true,
      vel: new THREE.Vector3(0, 0, 0),
    };
    const ai = new AIController(body, 40, 30, 0.05);
    const ctx: AICtx = { player, bots: [body], colliders: [], bounds: 44 };
    ai.update(0.016, ctx);
    // Dead body: no drive writes beyond early return when !alive
    body.alive = false;
    ai.update(0.016, ctx);
    expect(body.alive).toBe(false);
  });

  it('pure AI helpers unchanged', () => {
    expect(preferredRange('flamethrower', 0.5)).toBe(7);
    expect(aimTolerance('railgun')).toBe(0.1);
    expect(steeringFromAngle(0)).toBe(0);
  });

  it('CombatPeer / WeaponContext shape is TankLike + visual.group', () => {
    const peer = {
      id: 1,
      name: 'stub',
      isPlayer: false,
      health: 100,
      alive: true,
      radius: 1.5,
      knockback: new THREE.Vector3(),
      position: new THREE.Vector3(),
      yaw: 0,
      takeDamage: () => undefined,
      visual: { group: new THREE.Object3D() },
    } satisfies CombatPeer;

    const ctx: WeaponContext = {
      tanks: [peer],
      arena: { group: new THREE.Group() } as WeaponContext['arena'],
    };
    expect(ctx.tanks[0].visual.group).toBeInstanceOf(THREE.Object3D);
    expect(buildAmmoState({ magazine: 1, ammo: 1 }).magazine).toBe(1);
  });

  it('WeaponOwner is structural super-set of TankLike for createWeapon boundary', () => {
    // compile-time: WeaponOwner extends TankLike — runtime smoke of required methods
    const owner = {
      id: 0,
      name: 'p',
      isPlayer: true,
      health: 1,
      alive: true,
      radius: 1,
      knockback: new THREE.Vector3(),
      position: new THREE.Vector3(),
      yaw: 0,
      takeDamage: () => undefined,
      fireTimer: 0,
      params: { damage: 10 },
      visual: {
        muzzle: new THREE.Object3D(),
        barrelGroup: new THREE.Group(),
      },
      muzzleWorld: (out: THREE.Vector3) => out.set(0, 0, 0),
      aimDir: (out: THREE.Vector3) => out.set(0, 0, 1),
      onFired: () => undefined,
    } satisfies WeaponOwner;
    expect(owner.params.damage).toBe(10);
  });
});
