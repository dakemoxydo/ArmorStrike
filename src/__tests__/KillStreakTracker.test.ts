import { describe, expect, it } from 'vitest';
import { KillStreakTracker } from '../game/KillStreakTracker';

describe('KillStreakTracker', () => {
  it('labels consecutive kills inside the window', () => {
    const tracker = new KillStreakTracker();
    expect(tracker.registerKill(10)).toBeNull();
    expect(tracker.registerKill(11)?.label).toBe('DOUBLE KILL');
    expect(tracker.registerKill(12)?.label).toBe('TRIPLE KILL');
  });

  it('does not pair kills outside the 4-second window', () => {
    const tracker = new KillStreakTracker();
    expect(tracker.registerKill(100)).toBeNull();
    expect(tracker.registerKill(105)).toBeNull();
  });

  it('keeps a pair at the window edge but expires past it', () => {
    const tracker = new KillStreakTracker();
    expect(tracker.registerKill(10)).toBeNull();
    expect(tracker.registerKill(13.9)?.label).toBe('DOUBLE KILL');

    const other = new KillStreakTracker();
    other.registerKill(10);
    // Exactly STREAK_WINDOW later -> strictly outside
    expect(other.registerKill(14)).toBeNull();
  });

  it('drops stale stamps from before a matchTime reset (negative-delta guard)', () => {
    const tracker = new KillStreakTracker();
    // End of round: five quick kills -> RAMPAGE
    tracker.registerKill(116.5);
    tracker.registerKill(117.5);
    tracker.registerKill(118.5);
    tracker.registerKill(119);
    expect(tracker.registerKill(120)?.label).toBe('RAMPAGE');

    // New round resets matchTime to 0 (e.g. resetRun without resetStreaks):
    // stale 116..120 stamps sit "in the future"; they must never count.
    expect(tracker.registerKill(1)).toBeNull();
    expect(tracker.registerKill(2)?.label).toBe('DOUBLE KILL');
    expect(tracker.registerKill(3)?.label).toBe('TRIPLE KILL');
    expect(tracker.registerKill(4)?.label).toBe('MULTI KILL');
  });

  it('reset clears history and the best-streak gate', () => {
    const tracker = new KillStreakTracker();
    tracker.registerKill(10);
    tracker.registerKill(11);
    tracker.registerKill(12);
    tracker.registerKill(13);
    tracker.reset();

    expect(tracker.registerKill(50)).toBeNull();
    // lastStreakCount must be zeroed too, or a fresh DOUBLE would stay silent
    expect(tracker.registerKill(51)?.label).toBe('DOUBLE KILL');
  });
});
