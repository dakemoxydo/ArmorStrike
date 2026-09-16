import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { TankAnimationSystem } from '../game/engine/systems/TankAnimationSystem';
import type { AnimBody } from '../game/tank/simPorts';

function createMockAnimBody(overrides: Partial<AnimBody> = {}): AnimBody {
  const texLeft = new THREE.CanvasTexture({} as HTMLCanvasElement);
  const texRight = new THREE.CanvasTexture({} as HTMLCanvasElement);
  texLeft.offset = new THREE.Vector2(0, 0);
  texRight.offset = new THREE.Vector2(0, 0);

  const bodyMat = new THREE.MeshStandardMaterial();
  const ring = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial());

  return {
    id: 1,
    alive: true,
    boostActive: false,
    deathT: 0,
    speed: 0,
    steer: 0,
    params: { speed: 12, turnSpeed: 2.5 },
    health: 100,
    maxHealth: 100,
    position: new THREE.Vector3(),
    fx: {
      barrelKick: 0,
      hitFlash: 0,
      healFlash: 0,
      smokeAcc: 0,
    },
    visual: {
      barrelGroup: new THREE.Group(),
      turret: new THREE.Group(),
      bodyMats: [bodyMat],
      bodyBaseColors: [bodyMat.color.getHex()],
      ring,
      trackTex: texLeft,
      trackLeftTex: texLeft,
      trackRightTex: texRight,
    },
    ...overrides,
  };
}

describe('TankAnimationSystem - Track Animation', () => {
  it('scrolls both tracks forward when moving straight forward', () => {
    const tank = createMockAnimBody({ speed: 10, steer: 0 });
    TankAnimationSystem.update([tank], 0.1);

    // Moving forward increases offset.y (top track rolls forward towards hull front)
    expect(tank.visual.trackLeftTex!.offset.y).toBeGreaterThan(0);
    expect(tank.visual.trackRightTex!.offset.y).toBeGreaterThan(0);
    // 10 m/s for 0.1 s = 1.0 m / 0.22 m linkLen = ~4.545 links
    expect(tank.visual.trackLeftTex!.offset.y).toBeCloseTo(1.0 / 0.22, 3);
    // When moving straight, both tracks scroll at the exact same rate
    expect(tank.visual.trackLeftTex!.offset.y).toBeCloseTo(tank.visual.trackRightTex!.offset.y, 5);
  });

  it('scrolls both tracks backward when moving in reverse', () => {
    const tank = createMockAnimBody({ speed: -6, steer: 0 });
    TankAnimationSystem.update([tank], 0.1);

    expect(tank.visual.trackLeftTex!.offset.y).toBeLessThan(0);
    expect(tank.visual.trackRightTex!.offset.y).toBeLessThan(0);
    expect(tank.visual.trackLeftTex!.offset.y).toBeCloseTo(-0.6 / 0.22, 3);
    expect(tank.visual.trackLeftTex!.offset.y).toBeCloseTo(tank.visual.trackRightTex!.offset.y, 5);
  });

  it('scrolls tracks in opposite directions when turning in place (pivot right)', () => {
    // In-place turn to the right: steer > 0, speed = 0
    const tank = createMockAnimBody({ speed: 0, steer: 1 });
    TankAnimationSystem.update([tank], 0.1);

    // Left track rolls forward, right track rolls backward
    expect(tank.visual.trackLeftTex!.offset.y).toBeGreaterThan(0);
    expect(tank.visual.trackRightTex!.offset.y).toBeLessThan(0);
    expect(Math.abs(tank.visual.trackLeftTex!.offset.y)).toBeCloseTo(
      Math.abs(tank.visual.trackRightTex!.offset.y),
      5,
    );
  });

  it('scrolls tracks in opposite directions when turning in place (pivot left)', () => {
    // In-place turn to the left: steer < 0, speed = 0
    const tank = createMockAnimBody({ speed: 0, steer: -1 });
    TankAnimationSystem.update([tank], 0.1);

    // Left track rolls backward, right track rolls forward
    expect(tank.visual.trackLeftTex!.offset.y).toBeLessThan(0);
    expect(tank.visual.trackRightTex!.offset.y).toBeGreaterThan(0);
    expect(Math.abs(tank.visual.trackLeftTex!.offset.y)).toBeCloseTo(
      Math.abs(tank.visual.trackRightTex!.offset.y),
      5,
    );
  });

  it('drives outer track faster than inner track during curved movement', () => {
    // Moving forward while steering right
    const tank = createMockAnimBody({ speed: 8, steer: 0.5 });
    TankAnimationSystem.update([tank], 0.1);

    // Outer (left) track moves faster forward (larger positive offset delta)
    expect(tank.visual.trackLeftTex!.offset.y).toBeGreaterThan(tank.visual.trackRightTex!.offset.y);
  });

  it('does not scroll tracks when tank is dead', () => {
    const tank = createMockAnimBody({ alive: false, speed: 10, steer: 1 });
    TankAnimationSystem.update([tank], 0.1);

    expect(tank.visual.trackLeftTex!.offset.y).toBe(0);
    expect(tank.visual.trackRightTex!.offset.y).toBe(0);
  });
});
