// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { PhysicsSystem } from '../game/engine/systems/PhysicsSystem';
import { PlayerController } from '../game/PlayerController';
import { CameraRig } from '../game/CameraRig';
import { updateTurretAndFire } from '../game/aiAimFire';
import { CannonWeapon } from '../game/weapons/CannonWeapon';
import { FlamethrowerWeapon } from '../game/weapons/FlamethrowerWeapon';
import { WEAPON_TUNING } from '../core/catalog';
import type { Collider } from '../game/engine/physics';
import type { WeaponOwner, WeaponDeps } from '../game/weapons/types';

describe('Critical Audit Fixes', () => {
  describe('PhysicsSystem.resolveCollisions — multi-tank displacement accumulation', () => {
    it('accumulates separation across 3 tanks without wiping previous pair displacement', () => {
      // Three tanks clustered at x = 0, 1, 2
      const a = { alive: true, radius: 1.5, position: { x: 0, z: 0 }, yaw: 0 };
      const b = { alive: true, radius: 1.5, position: { x: 1.0, z: 0 }, yaw: 0 };
      const c = { alive: true, radius: 1.5, position: { x: 2.0, z: 0 }, yaw: 0 };
      const tanks = [a, b, c] as unknown as Parameters<typeof PhysicsSystem.resolveCollisions>[0];

      PhysicsSystem.resolveCollisions(tanks, []);

      // a should be pushed left of b, and c should be pushed right of b
      expect(a.position.x).toBeLessThan(0);
      expect(c.position.x).toBeGreaterThan(2.0);
      // Distance between a and b must have increased
      expect(b.position.x - a.position.x).toBeGreaterThan(1.0);
      // Distance between b and c must have increased
      expect(c.position.x - b.position.x).toBeGreaterThan(1.0);
    });
  });

  describe('PlayerController — pointer lock re-acquisition click', () => {
    it('does not fire when acquiring pointer lock (prevents dry-fire / railgun charge)', () => {
      const pc = new PlayerController();
      const dom = document.createElement('div');
      pc.attach(dom);
      pc.enabled = true;

      // Pointer lock is false initially
      const mockEvent = { button: 0 } as MouseEvent;
      (pc as unknown as { onMouseDown: (e: MouseEvent) => void }).onMouseDown(mockEvent);

      const tank = { throttle: 0, steer: 0, boosting: false, aimYaw: 0 };
      const wantsFire = pc.update(tank as never);
      expect(wantsFire).toBe(false);

      // Now simulate pointer lock acquired
      (pc as unknown as { locked: boolean }).locked = true;
      (pc as unknown as { onMouseDown: (e: MouseEvent) => void }).onMouseDown(mockEvent);
      expect(pc.update(tank as never)).toBe(true);

      pc.detach();
    });

    it('clears reloadRequested on window blur', () => {
      const pc = new PlayerController();
      pc.enabled = true;
      (pc as unknown as { reloadRequested: boolean }).reloadRequested = true;

      (pc as unknown as { onBlur: () => void }).onBlur();
      expect((pc as unknown as { reloadRequested: boolean }).reloadRequested).toBe(false);
    });
  });

  describe('Weapon onRespawn & onOwnerDeath lifecycle', () => {
    it('CannonWeapon.onRespawn restores ammo and cancels active full reload', () => {
      const owner = {
        id: 1,
        isPlayer: true,
        alive: true,
        fireTimer: 0,
        params: { damage: 32 },
        visual: { muzzle: new THREE.Object3D(), barrelGroup: new THREE.Group() },
        muzzleWorld: (out: THREE.Vector3) => out.set(0, 0, 0),
        aimDir: (out: THREE.Vector3) => out.set(0, 0, 1),
        onFired: vi.fn(),
      } as unknown as WeaponOwner;
      const deps: WeaponDeps = {
        scene: new THREE.Scene(),
        effects: { muzzle: vi.fn(), addShake: vi.fn() } as never,
        audio: { shoot: vi.fn() } as never,
        damageSystem: {} as never,
        projectiles: { fire: () => true } as never,
        lights: {} as never,
      };
      const cannon = new CannonWeapon(owner, deps);
      // Fire 1 shot so ammo < magazine, then request reload
      cannon.setFire(true);
      expect(cannon.getAmmoState().ammo).toBe(WEAPON_TUNING.cannon.magazine - 1);
      cannon.requestReload();
      expect(cannon.getAmmoState().reloading).toBe(true);

      // Simulate respawn
      cannon.onRespawn();
      const state = cannon.getAmmoState();
      expect(state.ammo).toBe(WEAPON_TUNING.cannon.magazine);
      expect(state.reloading).toBe(false);
    });

    it('FlamethrowerWeapon.onOwnerDeath stops audio loop and clears pool', () => {
      const owner = {
        id: 2,
        isPlayer: false,
        alive: true,
        fireTimer: 0,
        params: { damage: 14 },
        visual: { muzzle: new THREE.Object3D(), barrelGroup: new THREE.Group() },
        muzzleWorld: (out: THREE.Vector3) => out.set(0, 0, 0),
        aimDir: (out: THREE.Vector3) => out.set(0, 0, 1),
        onFired: vi.fn(),
      } as unknown as WeaponOwner;
      const stopFlameLoop = vi.fn();
      const deps: WeaponDeps = {
        scene: new THREE.Scene(),
        effects: {} as never,
        audio: { startFlameLoop: vi.fn(), stopFlameLoop } as never,
        damageSystem: {} as never,
        projectiles: {} as never,
        lights: { off: vi.fn() } as never,
      };
      const flamer = new FlamethrowerWeapon(owner, deps);
      flamer.setFire(true);
      expect((flamer as unknown as { isFiring: boolean }).isFiring).toBe(true);

      flamer.onOwnerDeath();
      expect((flamer as unknown as { isFiring: boolean }).isFiring).toBe(false);
      expect(stopFlameLoop).toHaveBeenCalled();

      // onRespawn restores energy
      (flamer as unknown as { energy: number }).energy = 5;
      flamer.onRespawn();
      expect((flamer as unknown as { energy: number }).energy).toBe(WEAPON_TUNING.flamethrower.energyMax);

      flamer.dispose();
    });
  });

  describe('CameraRig.avoidObstacles — nearest collider resolution', () => {
    it('picks the nearest collider even when a farther collider comes first in the array', () => {
      const cam = new THREE.PerspectiveCamera();
      const rig = new CameraRig(cam);

      const headX = 0;
      const headZ = 0;
      const dx = 0;
      const dz = -10;
      const dy = 2;

      // Collider 1 is farther away at z = -8
      const farCollider: Collider = {
        id: 1, minX: -5, maxX: 5, minZ: -9, maxZ: -8, height: 3, kind: 'wall', active: true,
        blocksShots: true, blocksSight: true, destructible: false,
      };
      // Collider 2 is closer at z = -3
      const nearCollider: Collider = {
        id: 2, minX: -5, maxX: 5, minZ: -3.5, maxZ: -3, height: 3, kind: 'wall', active: true,
        blocksShots: true, blocksSight: true, destructible: false,
      };

      // Array has farCollider FIRST
      const colliders = [farCollider, nearCollider];
      const result = rig.avoidObstacles(headX, headZ, dx, dz, dy, colliders);

      // Camera distance dz must be clamped by the NEAR collider (|dz| < 3.5), not the far one
      expect(Math.abs(result.dz)).toBeLessThan(3.5);
    });
  });

  describe('aiAimFire — ally behind shooter line of fire', () => {
    it('allows bot to shoot enemy ahead when ally is touching bot from behind', () => {
      const shooter = {
        position: { x: 0, z: 0 },
        yaw: 0,
        turretYaw: 0,
        aimYaw: 0,
        fireTimer: 0,
        radius: 1.5,
        params: { weaponType: 'cannon' },
      };
      const target = {
        alive: true,
        position: { x: 0, z: 20 },
        vel: { x: 0, z: 0 },
      };
      const allyBehind = {
        alive: true,
        position: { x: 0, z: -1.8 },
        radius: 1.5,
      };

      const aiState = {
        aimNoise: 0,
        aimNoiseT: 1,
        reactT: 0,
        scanT: 0,
        wantsFire: false,
      };

      const persona = {
        lead: 1.0,
      };

      updateTurretAndFire(
        aiState,
        0.016,
        true, // engage
        true, // canSee
        20,   // dist
        30,   // fireRange
        0,    // aimError
        persona as never,
        shooter as never,
        target as never,
        [allyBehind as never],
      );

      // Bot should want to fire because ally is behind, not in front
      expect(aiState.wantsFire).toBe(true);
    });
  });
});
