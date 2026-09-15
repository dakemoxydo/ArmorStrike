// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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

    // F4: трение — exp(−K·dt), идентично на любом FPS; раньше ×0.86 на тик.
    it('wall friction is frame-rate independent', () => {
      const wall: Collider = {
        id: 1, minX: 10, maxX: 20, minZ: -10, maxZ: 10, height: 4, kind: 'wall',
        active: true, blocksShots: true, blocksSight: true, destructible: false,
      };
      const mk = () =>
        ({ alive: true, radius: 1.5, position: { x: 9.5, z: 0 }, yaw: 0, speed: 100 }) as never;
      const typeTanks = (t: never) =>
        [t] as unknown as Parameters<typeof PhysicsSystem.resolveCollisions>[0];

      // Шаг на 60 fps ≈ прежнему ×0.86 за кадр.
      const a = mk();
      PhysicsSystem.resolveCollisions(typeTanks(a), [wall], 1 / 60);
      expect((a as { speed: number }).speed).toBeCloseTo(100 * 0.86, 1);

      // Секунда скольжения вдоль стены: 60×(1/60) и 30×(1/30) дают один финал.
      const b = mk();
      const c = mk();
      for (let i = 0; i < 60; i++) {
        (b as { position: { x: number } }).position.x = 9.5;
        PhysicsSystem.resolveCollisions(typeTanks(b), [wall], 1 / 60);
      }
      for (let i = 0; i < 30; i++) {
        (c as { position: { x: number } }).position.x = 9.5;
        PhysicsSystem.resolveCollisions(typeTanks(c), [wall], 1 / 30);
      }
      const sb = (b as { speed: number }).speed;
      const sc = (c as { speed: number }).speed;
      expect(sb).toBeGreaterThan(0);
      expect(sc).toBeGreaterThan(0);
      expect(Math.abs(Math.log(sb) - Math.log(sc))).toBeLessThan(0.05); // ≤5 % расхождение
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

  describe('GameLoop match-end release (A7)', () => {
    it('releases trigger and keeps weapon FX fading when leaving "playing"', () => {
      const src = readFileSync(resolve(__dirname, '../game/GameLoop.ts'), 'utf8');
      // Переход playing→over: спуск отпускается у всех танков…
      expect(src).toMatch(/wasCombatLive\s*&&\s*!combatLive\s*&&\s*sim\.run\.mode\s*!==\s*'playing'/);
      expect(src).toMatch(/for \(const t of sim\.tanks\) t\.weapon\?\.setFire\(false\)/);
      // …и оружие досинтегривает фейды в 'over' (иначе лучи/muzzle замирают).
      expect(src).toMatch(/t\.weapon\?\.update\(dt, wctx\)/);
    });
  });

  describe('FlamethrowerWeapon team filter (C6)', () => {
    it('does not push/smoke allies, still burns enemies', () => {
      const mkTank = (id: number, team: string | null, z: number) => ({
        id,
        name: `T${id}`,
        isPlayer: false,
        alive: true,
        health: 100,
        radius: 1.8,
        teamId: team,
        position: new THREE.Vector3(0, 0, z),
        yaw: 0,
        params: { damage: 14 },
        visual: { muzzle: new THREE.Object3D(), barrelGroup: new THREE.Group() },
        muzzleWorld: (out: THREE.Vector3) => out.set(0, 0, 0),
        aimDir: (out: THREE.Vector3) => out.set(0, 0, 1),
        onFired: vi.fn(),
      });
      const owner = mkTank(1, 'alpha', 0) as unknown as WeaponOwner;
      const ally = mkTank(2, 'alpha', 4);
      const enemy = mkTank(3, 'bravo', 5);
      const applyDamage = vi.fn();
      const applyKnockback = vi.fn();
      const spawnSmoke = vi.fn();
      const deps: WeaponDeps = {
        scene: new THREE.Scene(),
        effects: { spawnSmoke } as never,
        audio: { startFlameLoop: vi.fn(), stopFlameLoop: vi.fn() } as never,
        damageSystem: { applyDamage, applyKnockback } as never,
        projectiles: {} as never,
        lights: { set: vi.fn(), off: vi.fn() } as never,
      };
      const flamer = new FlamethrowerWeapon(owner, deps);
      flamer.setFire(true);
      // Один damage-tick: конус вдоль +Z накрывает обоих.
      flamer.update(WEAPON_TUNING.flamethrower.tickRate + 1e-3, {
        tanks: [owner, ally, enemy],
      } as never);

      expect(applyDamage).toHaveBeenCalledTimes(1);
      expect(applyDamage.mock.calls[0][0]).toBe(enemy);
      expect(applyKnockback).toHaveBeenCalledTimes(1);
      expect(spawnSmoke).toHaveBeenCalledTimes(1);

      flamer.dispose();
    });

    it('does not burn enemies through solid obstacles (losClear)', () => {
      const mkTank = (id: number, z: number) => ({
        id,
        name: `T${id}`,
        isPlayer: false,
        alive: true,
        health: 100,
        radius: 1.8,
        teamId: null,
        position: new THREE.Vector3(0, 0, z),
        yaw: 0,
        params: { damage: 14 },
        visual: { muzzle: new THREE.Object3D(), barrelGroup: new THREE.Group() },
        muzzleWorld: (out: THREE.Vector3) => out.set(0, 0, 0),
        aimDir: (out: THREE.Vector3) => out.set(0, 0, 1),
        onFired: vi.fn(),
      });
      const owner = mkTank(1, 0) as unknown as WeaponOwner;
      const enemy = mkTank(2, 5);
      const applyDamage = vi.fn();
      const deps: WeaponDeps = {
        scene: new THREE.Scene(),
        effects: { spawnSmoke: vi.fn() } as never,
        audio: { startFlameLoop: vi.fn(), stopFlameLoop: vi.fn() } as never,
        damageSystem: { applyDamage, applyKnockback: vi.fn() } as never,
        projectiles: {} as never,
        lights: { set: vi.fn(), off: vi.fn() } as never,
      };
      const blocker: Collider = {
        id: 99,
        minX: -5, maxX: 5,
        minZ: 2, maxZ: 3,
        height: 4,
        blocksShots: true,
        blocksSight: true,
        destructible: false,
        active: true,
        kind: 'wall',
      };
      const flamer = new FlamethrowerWeapon(owner, deps);
      flamer.setFire(true);
      // При наличии стены между (0,0,0) и (0,0,5) урон блокируется
      flamer.update(WEAPON_TUNING.flamethrower.tickRate + 1e-3, {
        tanks: [owner, enemy],
        colliders: [blocker],
      } as never);

      expect(applyDamage).not.toHaveBeenCalled();

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

    // F3: конвенция «только живая видимая геометрия» — как у физики/LOS/снарядов.
    it('ignores destroyed (active=false) colliders', () => {
      const cam = new THREE.PerspectiveCamera();
      const rig = new CameraRig(cam);
      const wreck: Collider = {
        id: 3, minX: -5, maxX: 5, minZ: -3.5, maxZ: -3, height: 3, kind: 'block', active: false,
        blocksShots: true, blocksSight: true, destructible: true,
      };
      const result = rig.avoidObstacles(0, 0, 0, -10, 2, [wreck]);
      expect(result.dz).toBe(-10);
    });

    it('ignores non-LOS props (lamps/billboards) and drivable ramps', () => {
      const cam = new THREE.PerspectiveCamera();
      const rig = new CameraRig(cam);
      const lamp: Collider = {
        id: 4, minX: -0.4, maxX: 0.4, minZ: -3.4, maxZ: -2.6, height: 5.5, kind: 'block', active: true,
        blocksShots: false, blocksSight: false, destructible: false,
      };
      const ramp: Collider = {
        id: 5, minX: -3, maxX: 3, minZ: -5, maxZ: -2, height: 6, kind: 'ramp', active: true,
        blocksShots: false, blocksSight: false, destructible: false,
      };
      expect(rig.avoidObstacles(0, 0, 0, -10, 2, [lamp, ramp]).dz).toBe(-10);
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
