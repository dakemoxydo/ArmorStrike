import { describe, it, expect } from 'vitest';
import {
  railgunShouldStartCharge,
  railgunShouldCancelCharge,
  type RailgunTriggerState,
} from '../game/weapons/railgunFireLogic';

describe('railgunShouldStartCharge (C3 bot re-fire)', () => {
  it('starts charge in IDLE when fire held (level-trigger, not edge-only)', () => {
    expect(railgunShouldStartCharge(true, 'IDLE', true, true)).toBe(true);
  });

  it('does not start while charging or cooling down', () => {
    expect(railgunShouldStartCharge(true, 'CHARGING', true, true)).toBe(false);
    expect(railgunShouldStartCharge(true, 'COOLDOWN', true, true)).toBe(false);
  });

  it('does not start when fire released, owner dead, or fire not ready', () => {
    expect(railgunShouldStartCharge(false, 'IDLE', true, true)).toBe(false);
    expect(railgunShouldStartCharge(true, 'IDLE', false, true)).toBe(false);
    // M18: respect owner fireTimer gate (Tank.canFire base contract).
    expect(railgunShouldStartCharge(true, 'IDLE', true, false)).toBe(false);
  });

  it('regression: held fire after cooldown still arms (old rising-edge failed this)', () => {
    // Simulate AI: active stays true across COOLDOWN → IDLE
    let state: RailgunTriggerState = 'COOLDOWN';
    const active = true; // held every frame
    expect(railgunShouldStartCharge(active, state, true, true)).toBe(false);
    state = 'IDLE'; // cooldown finished
    expect(railgunShouldStartCharge(active, state, true, true)).toBe(true);
  });
});

describe('railgunShouldCancelCharge (M18 cancel-on-release)', () => {
  it('player releasing fire mid-charge cancels', () => {
    expect(railgunShouldCancelCharge(false, 'CHARGING', true)).toBe(true);
  });

  it('holding fire never cancels', () => {
    expect(railgunShouldCancelCharge(true, 'CHARGING', true)).toBe(false);
  });

  it('bots never cancel (wantsFire flickers frame-to-frame; charge commits)', () => {
    expect(railgunShouldCancelCharge(false, 'CHARGING', false)).toBe(false);
  });

  it('no cancel outside CHARGING', () => {
    expect(railgunShouldCancelCharge(false, 'IDLE', true)).toBe(false);
    expect(railgunShouldCancelCharge(false, 'COOLDOWN', true)).toBe(false);
  });
});
