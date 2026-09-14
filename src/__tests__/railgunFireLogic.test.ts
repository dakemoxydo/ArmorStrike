import { describe, it, expect } from 'vitest';
import {
  railgunShouldStartCharge,
  chargeBallRadii,
  type RailgunTriggerState,
  type ChargeBallConfig,
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

describe('M20 un-cancellable trigger', () => {
  it('railgunShouldCancelCharge is gone (start-logic is the only gate)', () => {
    // The cancel path was removed: nothing to import, nothing to call. A
    // charge begun in IDLE always runs to firing; release is a no-op (tested
    // at the weapon level in RailgunWeaponTrigger.test.ts).
    expect(railgunShouldStartCharge(true, 'CHARGING', true, true)).toBe(false);
  });
});

const BALL_CFG: ChargeBallConfig = {
  electricStart: 0.05,
  airStart: 0.9,
  contactRadius: 0.3,
};

describe('chargeBallRadii (M21 contact-ball geometry)', () => {
  it('starts wide air / tiny electric, converges to contactRadius at full charge', () => {
    const a = chargeBallRadii(0, BALL_CFG);
    expect(a.electric).toBeCloseTo(BALL_CFG.electricStart, 5);
    expect(a.air).toBeCloseTo(BALL_CFG.airStart, 5);

    const full = chargeBallRadii(1, BALL_CFG);
    expect(full.electric).toBeCloseTo(BALL_CFG.contactRadius, 5);
    expect(full.air).toBeCloseTo(BALL_CFG.contactRadius, 5);
  });

  it('electric grows (p²) while air shrinks monotonically toward contact', () => {
    let prevElectric = 0;
    let prevAir = Infinity;
    for (let p = 0; p <= 1.0001; p += 0.1) {
      const { electric, air } = chargeBallRadii(p, BALL_CFG);
      expect(electric).toBeGreaterThanOrEqual(prevElectric);
      expect(air).toBeLessThanOrEqual(prevAir);
      // Air never dips below the meeting point; electric never overshoots.
      expect(electric).toBeLessThanOrEqual(BALL_CFG.contactRadius + 1e-9);
      expect(air).toBeGreaterThanOrEqual(BALL_CFG.contactRadius - 1e-9);
      prevElectric = electric;
      prevAir = air;
    }
  });

  it('air collapses fastest early (concave), so contact only happens at p=1', () => {
    // At half charge, most of the air travel is done but electric is barely
    // grown — the two are far apart until the very last fraction.
    const mid = chargeBallRadii(0.5, BALL_CFG);
    expect(mid.air - mid.electric).toBeGreaterThan(0.1);
    // The final 10% closes most of the remaining gap (slow creep → snap).
    const at90 = chargeBallRadii(0.9, BALL_CFG);
    expect(at90.air - at90.electric).toBeLessThan(mid.air - mid.electric);
  });

  it('clamps out-of-range progress (dt overshoot never inverts the balls)', () => {
    for (const p of [-1, 2, 99]) {
      const { electric, air } = chargeBallRadii(p, BALL_CFG);
      expect(electric).toBeGreaterThanOrEqual(BALL_CFG.electricStart - 1e-9);
      expect(electric).toBeLessThanOrEqual(BALL_CFG.contactRadius + 1e-9);
      expect(air).toBeGreaterThanOrEqual(BALL_CFG.contactRadius - 1e-9);
      expect(air).toBeLessThanOrEqual(BALL_CFG.airStart + 1e-9);
    }
  });
});
