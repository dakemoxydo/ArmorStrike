import { describe, expect, it } from 'vitest';
import {
  MIN_BOT_SPAWN_DIST,
  pickSpawnIndex,
  SPAWN_POINTS,
} from '../game/botSpawn';

/** Player start from PlayerFactory (z ≈ -120). */
const PLAYER_START = { x: 0, z: -120 };

describe('pickSpawnIndex (shipped)', () => {
  it('never returns a point closer than MIN_BOT_SPAWN_DIST when far points exist', () => {
    const used = new Set<number>();
    for (let n = 0; n < 40; n++) {
      const idx = pickSpawnIndex(used, PLAYER_START.x, PLAYER_START.z, MIN_BOT_SPAWN_DIST, () => 0.5);
      const [x, z] = SPAWN_POINTS[idx];
      const d = Math.hypot(x - PLAYER_START.x, z - PLAYER_START.z);
      expect(d).toBeGreaterThanOrEqual(MIN_BOT_SPAWN_DIST);
      used.add(idx);
      if (used.size >= SPAWN_POINTS.length) break;
    }
  });

  it('avoids used indices while far points remain', () => {
    const used = new Set<number>([0, 1]);
    const idx = pickSpawnIndex(used, 0, 0, MIN_BOT_SPAWN_DIST, () => 0);
    expect(used.has(idx)).toBe(false);
  });

  it('falls back to furthest unused when all remaining are too close', () => {
    // Sit player on top of every point except one far corner
    const playerX = 64;
    const playerZ = 64;
    const used = new Set<number>();
    // Mark all but last two used
    for (let i = 0; i < SPAWN_POINTS.length - 2; i++) used.add(i);
    const idx = pickSpawnIndex(used, playerX, playerZ, 9999, () => 0);
    expect(used.has(idx)).toBe(false);
    // Must prefer larger distance among unused
    const unused = SPAWN_POINTS
      .map(([x, z], i) => ({ i, d: Math.hypot(x - playerX, z - playerZ) }))
      .filter((s) => !used.has(s.i))
      .sort((a, b) => b.d - a.d);
    expect(idx).toBe(unused[0].i);
  });

  it('spawn points are not within MIN of player start (map layout)', () => {
    for (const [x, z] of SPAWN_POINTS) {
      const d = Math.hypot(x - PLAYER_START.x, z - PLAYER_START.z);
      expect(d).toBeGreaterThanOrEqual(MIN_BOT_SPAWN_DIST);
    }
  });
});
