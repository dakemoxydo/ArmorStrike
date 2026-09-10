import { describe, it, expect } from 'vitest';
import { TimeScale } from '../game/effects/TimeScale';

describe('TimeScale', () => {
  it('slow-mo decays back to real time', () => {
    const ts = new TimeScale();
    ts.killSlowMo(0.5, 0.4);
    expect(ts.update(0.1)).toBeLessThan(0.1);
    expect(ts.update(10)).toBeCloseTo(10, 6);
    expect(ts.current).toBe(1);
  });

  it('reset clears freeze/slow-mo (L-2: no slow-mo leak into next round)', () => {
    const ts = new TimeScale();
    ts.hitStop(5);
    ts.killSlowMo(5, 0.4);
    ts.reset();
    expect(ts.update(0.016)).toBeCloseTo(0.016, 6);
    expect(ts.current).toBe(1);
  });
});
