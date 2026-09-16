import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { TankAnimationSystem } from '../game/engine/systems/TankAnimationSystem';
import { TankEntity } from '../game/Tank';
import type { AnimBody } from '../game/tank/simPorts';
import { SUSPENSION_TUNING } from '../game/tuning';

function createMockAnimTank(overrides: Partial<AnimBody> = {}): AnimBody {
  const hull = new THREE.Group();
  const turret = new THREE.Group();
  const barrelGroup = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial());

  return {
    id: 1,
    alive: true,
    boostActive: false,
    deathT: 0,
    speed: 0,
    steer: 0,
    yaw: 0,
    turretYaw: 0,
    knockback: new THREE.Vector3(),
    params: { speed: 12, turnSpeed: 2.5 },
    health: 100,
    maxHealth: 100,
    position: new THREE.Vector3(),
    fx: {
      barrelKick: 0,
      hitFlash: 0,
      healFlash: 0,
      smokeAcc: 0,
      pitch: 0,
      pitchVel: 0,
      roll: 0,
      rollVel: 0,
      prevSpeed: 0,
    },
    visual: {
      hull,
      turret,
      barrelGroup,
      bodyMats: [],
      bodyBaseColors: [],
      ring,
      trackTex: new THREE.CanvasTexture({} as HTMLCanvasElement),
    },
    ...overrides,
  };
}

describe('TankAnimationSystem - Suspension Dynamics', () => {
  it('tilts nose up (pitch < 0) during forward acceleration', () => {
    const tank = createMockAnimTank({ speed: 0 });
    tank.fx.prevSpeed = 0;

    // First frame: tank suddenly accelerates to 10 m/s
    tank.speed = 10;
    TankAnimationSystem.update([tank], 0.05);

    // Pitch should be negative (nose up, rear squatting)
    expect(tank.fx.pitch).toBeLessThan(0);
    expect(tank.visual.hull!.rotation.x).toBe(tank.fx.pitch);
  });

  it('dips nose down (pitch > 0) during braking / deceleration', () => {
    const tank = createMockAnimTank({ speed: 10 });
    tank.fx.prevSpeed = 10;

    // Tank suddenly brakes to 0 m/s
    tank.speed = 0;
    TankAnimationSystem.update([tank], 0.05);

    // Pitch should be positive (nose dipping down)
    expect(tank.fx.pitch).toBeGreaterThan(0);
    expect(tank.visual.hull!.rotation.x).toBe(tank.fx.pitch);
  });

  it('damps suspension oscillations back to rest over time when stopped', () => {
    const tank = createMockAnimTank({ speed: 0 });
    tank.fx.prevSpeed = 0;
    tank.fx.pitch = 0.05; // Initial displacement
    tank.fx.pitchVel = 0;

    // Simulate 1.5 seconds of settling at 60 FPS
    for (let i = 0; i < 90; i++) {
      TankAnimationSystem.update([tank], 0.016);
    }

    // Should have damped close to 0
    expect(Math.abs(tank.fx.pitch!)).toBeLessThan(0.002);
    expect(Math.abs(tank.fx.pitchVel!)).toBeLessThan(0.01);
  });

  it('leans outward (roll > 0) when turning right at speed', () => {
    const tank = createMockAnimTank({ speed: 10, steer: 1 }); // steer > 0 is turn right
    tank.fx.prevSpeed = 10;

    TankAnimationSystem.update([tank], 0.05);

    // Roll should be positive (leaning to the left / outside of turn)
    expect(tank.fx.roll).toBeGreaterThan(0);
    expect(tank.visual.hull!.rotation.z).toBe(tank.fx.roll);
  });

  it('leans outward (roll < 0) when turning left at speed', () => {
    const tank = createMockAnimTank({ speed: 10, steer: -1 }); // steer < 0 is turn left
    tank.fx.prevSpeed = 10;

    TankAnimationSystem.update([tank], 0.05);

    // Roll should be negative (leaning to the right / outside of turn)
    expect(tank.fx.roll).toBeLessThan(0);
    expect(tank.visual.hull!.rotation.z).toBe(tank.fx.roll);
  });

  it('does not produce centrifugal roll when turning on the spot (speed = 0)', () => {
    const tank = createMockAnimTank({ speed: 0, steer: 1 });
    tank.fx.prevSpeed = 0;

    TankAnimationSystem.update([tank], 0.05);

    expect(tank.fx.roll).toBeCloseTo(0, 5);
  });

  it('reacts to knockback impulse with hull flinch', () => {
    const tank = createMockAnimTank({ yaw: 0 });
    // Hit from the front (knockback pushes backward along -Z)
    tank.knockback!.set(0, 0, -5);

    TankAnimationSystem.update([tank], 0.016);

    // localZ = -5, so pitchVel receives -(-5) * flinchScale > 0
    expect(tank.fx.pitchVel).toBeGreaterThan(0);
  });

  it('safely handles missing hull without exceptions', () => {
    const tank = createMockAnimTank();
    delete (tank.visual as { hull?: THREE.Group }).hull;

    expect(() => {
      TankAnimationSystem.update([tank], 0.016);
    }).not.toThrow();
  });

  it('settles hull smoothly when dead', () => {
    const tank = createMockAnimTank({ alive: false });
    tank.visual.hull!.rotation.x = 0.05;
    tank.visual.hull!.rotation.z = -0.04;

    TankAnimationSystem.update([tank], 0.2);

    expect(tank.visual.hull!.rotation.x).toBeLessThan(0.05);
  });
});

describe('TankEntity - Chassis Recoil Impulse', () => {
  function createTestTank(): TankEntity {
    const visual = {
      group: new THREE.Group(),
      hull: new THREE.Group(),
      turret: new THREE.Group(),
      barrelGroup: new THREE.Group(),
      muzzle: new THREE.Object3D(),
      ring: new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial()),
      bodyMats: [],
      bodyBaseColors: [],
      trackTex: new THREE.CanvasTexture({} as HTMLCanvasElement),
    };
    return new TankEntity('Tester', true, {
      maxHealth: 150,
      speed: 12,
      reverseSpeed: 8,
      turnSpeed: 2.2,
      turretSpeed: 3.0,
      damage: 25,
      shotCooldown: 0.8,
    }, visual);
  }

  it('kicks nose up (pitchVel < 0) when firing forward (turretYaw = 0)', () => {
    const tank = createTestTank();
    tank.turretYaw = 0;

    tank.onFired(10);

    expect(tank.fx.pitchVel).toBeCloseTo(-10 * SUSPENSION_TUNING.recoilPitchScale, 5);
    expect(tank.fx.rollVel).toBeCloseTo(0, 5);
  });

  it('dips nose down (pitchVel > 0) when firing backward (turretYaw = PI)', () => {
    const tank = createTestTank();
    tank.turretYaw = Math.PI;

    tank.onFired(10);

    // cos(PI) = -1, so -(-1) * recoil * scale > 0
    expect(tank.fx.pitchVel).toBeCloseTo(10 * SUSPENSION_TUNING.recoilPitchScale, 5);
    expect(tank.fx.rollVel).toBeCloseTo(0, 5);
  });

  it('rolls chassis outward when firing broadside (turretYaw = PI / 2)', () => {
    const tank = createTestTank();
    tank.turretYaw = Math.PI / 2;

    tank.onFired(10);

    // cos(PI/2) = 0, sin(PI/2) = 1 -> rollVel > 0
    expect(tank.fx.pitchVel).toBeCloseTo(0, 5);
    expect(tank.fx.rollVel).toBeCloseTo(10 * SUSPENSION_TUNING.recoilRollScale, 5);
  });

  it('rolls chassis opposite outward when firing left broadside (turretYaw = -PI / 2)', () => {
    const tank = createTestTank();
    tank.turretYaw = -Math.PI / 2;

    tank.onFired(10);

    // sin(-PI/2) = -1 -> rollVel < 0
    expect(tank.fx.pitchVel).toBeCloseTo(0, 5);
    expect(tank.fx.rollVel).toBeCloseTo(-10 * SUSPENSION_TUNING.recoilRollScale, 5);
  });
});
