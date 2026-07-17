import { describe, it, expect } from 'vitest';
import { railgunShouldStartCharge } from '../game/weapons/railgunFireLogic';

describe('railgunShouldStartCharge (C3 bot re-fire)', () => {
  it('starts charge in IDLE when fire held (level-trigger, not edge-only)', () => {
    expect(railgunShouldStartCharge(true, 'IDLE', true)).toBe(true);
  });

  it('does not start while charging / cooldown / firing', () => {
    expect(railgunShouldStartCharge(true, 'CHARGING', true)).toBe(false);
    expect(railgunShouldStartCharge(true, 'COOLDOWN', true)).toBe(false);
    expect(railgunShouldStartCharge(true, 'FIRING', true)).toBe(false);
  });

  it('does not start when fire released or owner dead', () => {
    expect(railgunShouldStartCharge(false, 'IDLE', true)).toBe(false);
    expect(railgunShouldStartCharge(true, 'IDLE', false)).toBe(false);
  });

  it('regression: held fire after cooldown still arms (old rising-edge failed this)', () => {
    // Simulate AI: active stays true across COOLDOWN → IDLE
    let state: 'IDLE' | 'CHARGING' | 'FIRING' | 'COOLDOWN' = 'COOLDOWN';
    const active = true; // held every frame
    expect(railgunShouldStartCharge(active, state, true)).toBe(false);
    state = 'IDLE'; // cooldown finished
    expect(railgunShouldStartCharge(active, state, true)).toBe(true);
  });
});
