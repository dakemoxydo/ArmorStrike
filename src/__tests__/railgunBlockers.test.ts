import { describe, it, expect } from 'vitest';
import { nearestShotBlockerDist } from '../game/weapons/railgunBlockers';
import { colliderFromCenter } from '../game/engine/physics';

describe('nearestShotBlockerDist (M9)', () => {
  it('hits solid wall colliders even without mesh colliderId', () => {
    const wall = colliderFromCenter(0, 20, 10, 2, 7.5, 'wall');
    const hit = nearestShotBlockerDist(0, 0, 0, 1, 120, [wall]);
    expect(hit).not.toBeNull();
    expect(hit!.id).toBe(wall.id);
    expect(hit!.dist).toBeGreaterThan(15);
    expect(hit!.dist).toBeLessThan(25);
  });

  it('ignores ramps / non-blocking colliders', () => {
    const ramp = colliderFromCenter(0, 10, 5, 5, 1.3, 'ramp', {
      blocksShots: false,
      blocksSight: false,
    });
    const hit = nearestShotBlockerDist(0, 0, 0, 1, 120, [ramp]);
    expect(hit).toBeNull();
  });

  it('ignores inactive colliders', () => {
    const wall = colliderFromCenter(0, 10, 10, 2, 7.5, 'wall');
    wall.active = false;
    expect(nearestShotBlockerDist(0, 0, 0, 1, 120, [wall])).toBeNull();
  });

  it('does not treat decorative absence as blocker (empty list = free path)', () => {
    expect(nearestShotBlockerDist(0, 0, 0, 1, 120, [])).toBeNull();
  });
});
