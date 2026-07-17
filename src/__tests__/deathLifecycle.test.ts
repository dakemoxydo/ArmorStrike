import { describe, it, expect } from 'vitest';
import {
  shouldAutoPauseOnInterrupt,
  applyPlayerDeathState,
  applyGameOverInputState,
} from '../game/deathLifecycle';

describe('deathLifecycle (C1 death softlock)', () => {
  it('auto-pauses only while playing, unpaused, and not in death cam', () => {
    expect(shouldAutoPauseOnInterrupt('playing', false, -1)).toBe(true);
    expect(shouldAutoPauseOnInterrupt('playing', true, -1)).toBe(false);
    expect(shouldAutoPauseOnInterrupt('playing', false, 0)).toBe(false);
    expect(shouldAutoPauseOnInterrupt('playing', false, 1.5)).toBe(false);
    expect(shouldAutoPauseOnInterrupt('over', false, -1)).toBe(false);
    expect(shouldAutoPauseOnInterrupt('menu', false, -1)).toBe(false);
    expect(shouldAutoPauseOnInterrupt('garage', false, -1)).toBe(false);
  });

  it('player death arms timer, clears pause, disables input (order-safe for releaseLock)', () => {
    const st = { deathT: -1, paused: true, inputEnabled: true };
    applyPlayerDeathState(st);
    expect(st.deathT).toBe(0);
    expect(st.paused).toBe(false);
    expect(st.inputEnabled).toBe(false);
    // After death, lock-lost must not auto-pause
    expect(shouldAutoPauseOnInterrupt('playing', st.paused, st.deathT)).toBe(false);
  });

  it('game-over clears pause and disables input for UI', () => {
    const st = { paused: true, inputEnabled: true };
    applyGameOverInputState(st);
    expect(st.paused).toBe(false);
    expect(st.inputEnabled).toBe(false);
  });

  it('regression: previous buggy sequence (release lock while enabled + deathT later) would pause', () => {
    // Documents the old failure mode: deathT still -1 when lock lost → pause stuck.
    const deathTBeforeArm = -1;
    const enabledStillTrue = true;
    expect(enabledStillTrue && shouldAutoPauseOnInterrupt('playing', false, deathTBeforeArm)).toBe(true);
    // Fixed sequence: arm death first
    const st = { deathT: -1, paused: false, inputEnabled: true };
    applyPlayerDeathState(st);
    expect(shouldAutoPauseOnInterrupt('playing', st.paused, st.deathT)).toBe(false);
  });
});
