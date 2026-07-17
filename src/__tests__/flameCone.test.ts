import { describe, it, expect } from 'vitest';
import { inFlameConeXZ } from '../game/weapons/flameCone';

const HALF = Math.PI / 8; // coneAngle π/4 / 2
const RANGE = 22;

describe('inFlameConeXZ (M7)', () => {
  it('hits target straight ahead at mid range', () => {
    expect(inFlameConeXZ(0, 0, 0, 1, 0, 10, RANGE, HALF)).toBe(true);
  });

  it('hits point-blank target in front (elevated muzzle was failing 3D angle)', () => {
    // Target almost under muzzle on XZ — planar cone accepts; 3D pitch would reject.
    expect(inFlameConeXZ(0, 0, 0, 1, 0, 2, RANGE, HALF)).toBe(true);
    expect(inFlameConeXZ(0, 0, 0, 1, 0, 0.5, RANGE, HALF)).toBe(true);
  });

  it('rejects target behind or far outside cone', () => {
    expect(inFlameConeXZ(0, 0, 0, 1, 0, -5, RANGE, HALF)).toBe(false);
    expect(inFlameConeXZ(0, 0, 0, 1, 20, 0, RANGE, HALF)).toBe(false);
  });

  it('rejects beyond range', () => {
    expect(inFlameConeXZ(0, 0, 0, 1, 0, 30, RANGE, HALF)).toBe(false);
  });
});
