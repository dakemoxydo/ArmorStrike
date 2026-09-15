import { describe, it, expect } from 'vitest';
import {
  nearestShotBlockerDist,
  SHOT_BLOCKER_HEIGHT_EPS,
} from '../game/weapons/railgunBlockers';
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

  it('ignores walls clearly below the muzzle (height gate + eps)', () => {
    // Muzzle at 1.6, wall top at 1.0: 1.6 > 1.0 + eps → beam flies over it.
    const lowWall = colliderFromCenter(0, 20, 10, 2, 1.0, 'wall');
    expect(nearestShotBlockerDist(0, 0, 0, 1, 120, [lowWall], 1.6)).toBeNull();
  });

  it('blocks walls whose top is above the muzzle (edge case: within eps)', () => {
    // Muzzle at 1.6, wall top at 1.5: 1.6 < 1.5 + eps → still blocks (grazing counts).
    const wall = colliderFromCenter(0, 20, 10, 2, 1.5, 'wall');
    const hit = nearestShotBlockerDist(0, 0, 0, 1, 120, [wall], 1.6);
    expect(hit).not.toBeNull();
    expect(hit!.id).toBe(wall.id);
    expect(SHOT_BLOCKER_HEIGHT_EPS).toBeGreaterThan(0);
  });

  it('muzzle buried in a collider footprint does not block (no zero-distance shot loss)', () => {
    // Вход в slab остался ЗА началом луча: segmentHitT для origin внутри AABB
    // всегда отвечает 0, и без скипа выстрел умирал в нулевой дистанции.
    const wall = colliderFromCenter(0, 0, 10, 4, 7.5, 'wall');
    expect(nearestShotBlockerDist(0, 0, 0, 1, 120, [wall])).toBeNull();
    expect(nearestShotBlockerDist(0, 0, 0, -1, 120, [wall])).toBeNull();
    expect(nearestShotBlockerDist(0, 0, 1, 0, 120, [wall])).toBeNull();
  });

  it('a far wall still blocks when the muzzle sits inside a different collider', () => {
    const shed = colliderFromCenter(0, 0, 4, 4, 7.5, 'block', { destructible: true });
    const wall = colliderFromCenter(0, 30, 10, 2, 7.5, 'wall');
    const hit = nearestShotBlockerDist(0, 0, 0, 1, 120, [shed, wall]);
    expect(hit).not.toBeNull();
    expect(hit!.id).toBe(wall.id);
    expect(hit!.dist).toBeGreaterThan(25);
    expect(hit!.dist).toBeLessThan(35);
  });

  it('handles infinite range (Infinity) cleanly without NaN and finds distant blockers', () => {
    const farWall = colliderFromCenter(0, 240, 10, 2, 7.5, 'wall');
    const hit = nearestShotBlockerDist(0, 0, 0, 1, Infinity, [farWall]);
    expect(hit).not.toBeNull();
    expect(hit!.id).toBe(farWall.id);
    expect(hit!.dist).toBeCloseTo(239, 1);
  });
});
