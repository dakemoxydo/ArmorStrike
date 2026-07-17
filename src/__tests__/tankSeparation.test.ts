import { describe, it, expect } from 'vitest';
import { separateTankPair } from '../game/engine/tankSeparation';

describe('separateTankPair (M10)', () => {
  it('separates overlapping tanks to sum of radii', () => {
    const a = { x: 0, z: 0 };
    const b = { x: 1, z: 0 };
    const r = 1.8;
    separateTankPair(a, b, r, r);
    const d = Math.hypot(b.x - a.x, b.z - a.z);
    expect(d).toBeCloseTo(r + r, 5);
  });

  it('near-coincident tanks do not explode beyond maxPush*2', () => {
    const a = { x: 0, z: 0 };
    const b = { x: 0.001, z: 0 };
    separateTankPair(a, b, 1.8, 1.8, 2.5);
    const d = Math.hypot(b.x - a.x, b.z - a.z);
    // max half-push 2.5 each side → separation increase capped
    expect(d).toBeLessThan(6);
    expect(d).toBeGreaterThan(0.5);
  });

  it('no-op when already separated', () => {
    const a = { x: 0, z: 0 };
    const b = { x: 10, z: 0 };
    expect(separateTankPair(a, b, 1.8, 1.8)).toBe(false);
    expect(a.x).toBe(0);
    expect(b.x).toBe(10);
  });
});
