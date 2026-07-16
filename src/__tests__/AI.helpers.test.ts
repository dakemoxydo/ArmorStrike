import { describe, it, expect } from 'vitest';
import { preferredRange, aimTolerance, steeringFromAngle } from '../game/AI';

describe('AI pure helpers', () => {
  it('preferredRange: огнемёт ближний, рельсотрон дальний, пушка средняя', () => {
    expect(preferredRange('flamethrower', 0)).toBe(7);
    expect(preferredRange('flamethrower', 1)).toBe(7);
    expect(preferredRange('railgun', 0)).toBe(34);
    expect(preferredRange('railgun', 1)).toBe(44);
    expect(preferredRange('cannon', 0)).toBe(20);
    expect(preferredRange('cannon', 1)).toBe(28);
  });

  it('aimTolerance: рельсотрон самый точный', () => {
    expect(aimTolerance('railgun')).toBeLessThan(aimTolerance('cannon'));
    expect(aimTolerance('cannon')).toBeLessThan(aimTolerance('flamethrower'));
  });

  it('steeringFromAngle: clamp к [-1, 1]', () => {
    expect(steeringFromAngle(0)).toBe(0);
    expect(steeringFromAngle(10)).toBe(1);
    expect(steeringFromAngle(-10)).toBe(-1);
    expect(steeringFromAngle(0.1)).toBeCloseTo(0.24, 5);
  });
});
