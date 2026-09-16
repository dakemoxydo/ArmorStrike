import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { TankFxSystem } from '../game/engine/systems/TankFxSystem';
import type { FxBody } from '../game/tank/simPorts';
import type { EffectsPort } from '../game/ports/EffectsPort';

function createMockFxTank(overrides: Partial<FxBody> = {}): FxBody {
  return {
    alive: true,
    health: 100,
    maxHealth: 100,
    position: new THREE.Vector3(0, 0, 0),
    speed: 0,
    yaw: 0,
    steer: 0,
    boostActive: false,
    params: { speed: 12, turnSpeed: 2.4 },
    fx: { smokeAcc: 0, dustAcc: 0, trackDist: 0 },
    ...overrides,
  };
}

describe('TankFxSystem - Tracks and Driving Dust', () => {
  it('spawns pair of track marks (left & right) when traveling past distance threshold', () => {
    const trackMark = vi.fn();
    const tankDust = vi.fn();
    const effects = { trackMark, tankDust } as unknown as EffectsPort;

    const tank = createMockFxTank({ speed: 10, yaw: 0 });

    // Step 0.05s: dist = 10 * 0.05 = 0.5 m (< 0.75 threshold) -> no marks yet
    TankFxSystem.update([tank], effects, 0.05);
    expect(trackMark).not.toHaveBeenCalled();

    // Step 0.05s: dist = 0.5 + 0.5 = 1.0 m (>= 0.75) -> spawns 2 marks (L & R)
    TankFxSystem.update([tank], effects, 0.05);
    expect(trackMark).toHaveBeenCalledTimes(2);

    // Left track is offset at -X (yaw = 0 -> cosY = 1, sinY = 0)
    const [leftPos, leftYaw] = trackMark.mock.calls[0] as [THREE.Vector3, number];
    expect(leftPos.x).toBeCloseTo(-1.42, 2);
    expect(leftPos.z).toBeCloseTo(0, 2);
    expect(leftYaw).toBe(0);

    // Right track is offset at +X
    const [rightPos] = trackMark.mock.calls[1] as [THREE.Vector3, number];
    expect(rightPos.x).toBeCloseTo(1.42, 2);
    expect(rightPos.z).toBeCloseTo(0, 2);
  });

  it('spawns dual track marks and dust when pivoting on the spot (speed = 0, steer != 0)', () => {
    const trackMark = vi.fn();
    const tankDust = vi.fn();
    const effects = { trackMark, tankDust } as unknown as EffectsPort;

    const tank = createMockFxTank({ speed: 0, steer: 1.0 });

    // Pivot in place: leftSpeed = steer * turnSpeed * trackHalfWidth = 1.0 * 2.4 * 1.42 = 3.408 m/s
    // 0.3s -> trackDist = 3.408 * 0.3 = 1.02 m >= 0.75 m
    TankFxSystem.update([tank], effects, 0.3);

    expect(trackMark).toHaveBeenCalledTimes(2);
    // Skidding mark intensity is heavier (0.9)
    const [, , , , intensity] = trackMark.mock.calls[0] as [unknown, unknown, unknown, unknown, number];
    expect(intensity).toBe(0.9);

    // Dust should also emit from steering pivot
    expect(tankDust).toHaveBeenCalled();
  });

  it('does not emit track marks or dust when stationary (speed = 0, steer = 0)', () => {
    const trackMark = vi.fn();
    const tankDust = vi.fn();
    const effects = { trackMark, tankDust } as unknown as EffectsPort;

    const tank = createMockFxTank({ speed: 0, steer: 0 });
    TankFxSystem.update([tank], effects, 0.5);

    expect(trackMark).not.toHaveBeenCalled();
    expect(tankDust).not.toHaveBeenCalled();
  });

  it('boosts dust scale and kick velocity when boostActive is true', () => {
    const trackMark = vi.fn();
    const tankDust = vi.fn();
    const effects = { trackMark, tankDust } as unknown as EffectsPort;

    const tank = createMockFxTank({ speed: 12, boostActive: true });
    TankFxSystem.update([tank], effects, 0.15);

    expect(tankDust).toHaveBeenCalled();
    const [, vel, scale] = tankDust.mock.calls[0] as [THREE.Vector3, THREE.Vector3, number];

    // Boosted scale > 0.8
    expect(scale).toBeGreaterThan(0.8);
    // Boosted kick velocity
    expect(Math.abs(vel.z)).toBeGreaterThan(2.5);
  });

  it('ignores dead tanks completely', () => {
    const trackMark = vi.fn();
    const tankDust = vi.fn();
    const effects = { trackMark, tankDust } as unknown as EffectsPort;

    const tank = createMockFxTank({ alive: false, speed: 12 });
    TankFxSystem.update([tank], effects, 0.5);

    expect(trackMark).not.toHaveBeenCalled();
    expect(tankDust).not.toHaveBeenCalled();
  });
});
