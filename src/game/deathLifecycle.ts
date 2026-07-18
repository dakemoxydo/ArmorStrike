// ===== Политика смерти / auto-pause (чистая логика для unit-тестов) =====
// Death softlock root cause: releaseLock → onLockLost → paused=true → step stops →
// death timer never reaches game-over; togglePause blocked while deathT >= 0.

export type GameModeLike = 'menu' | 'garage' | 'playing' | 'over';

/**
 * Auto-pause on lock-lost / tab-hide only while fighting —
 * never during death cam or between-wave intermission (lock is released on purpose).
 */
export function shouldAutoPauseOnInterrupt(
  mode: GameModeLike,
  paused: boolean,
  deathT: number,
  intermission = false,
): boolean {
  return mode === 'playing' && !paused && deathT < 0 && !intermission;
}

/**
 * State transitions when the player dies: arm death cam, clear pause so the
 * timer can advance, disable combat input so lock release does not re-pause.
 */
export function applyPlayerDeathState(state: {
  deathT: number;
  paused: boolean;
  inputEnabled: boolean;
}): void {
  state.deathT = 0;
  state.paused = false;
  state.inputEnabled = false;
}

/** Game-over cleanup: leave combat input fully off and unpaused for UI. */
export function applyGameOverInputState(state: {
  paused: boolean;
  inputEnabled: boolean;
}): void {
  state.paused = false;
  state.inputEnabled = false;
}
