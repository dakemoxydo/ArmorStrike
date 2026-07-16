import { describe, it, expect } from 'vitest';
import {
  clamp, wrapAngle, colliderFromCenter, resolveCircle,
  pointInCollider, segmentHitsCollider, losClear, segmentHitsCircle,
} from '../game/engine/physics';

describe('physics helpers', () => {
  it('clamp', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(99, 0, 10)).toBe(10);
  });

  it('wrapAngle нормализует в (-π, π]', () => {
    expect(wrapAngle(0)).toBeCloseTo(0);
    expect(wrapAngle(Math.PI * 3)).toBeCloseTo(Math.PI, 5);
    expect(Math.abs(wrapAngle(Math.PI * 2))).toBeLessThan(1e-9);
  });

  it('resolveCircle выталкивает из AABB', () => {
    const wall = colliderFromCenter(0, 0, 4, 4, 2, 'wall');
    // центр в блоке
    const r = resolveCircle(0, 0, 1, [wall]);
    expect(r.hit).toBe(true);
    // после выталкивания не внутри (с радиусом)
    const stillInside = pointInCollider(r.x, r.z, wall, -0.01);
    expect(stillInside).toBe(false);
    expect(Math.hypot(r.x, r.z)).toBeGreaterThanOrEqual(1 - 1e-6);
  });

  it('pointInCollider с pad', () => {
    const c = colliderFromCenter(10, 10, 2, 2, 1, 'block');
    expect(pointInCollider(10, 10, c)).toBe(true);
    expect(pointInCollider(20, 20, c)).toBe(false);
    expect(pointInCollider(11.4, 10, c, 0.5)).toBe(true);
  });

  it('segmentHitsCollider / losClear', () => {
    const wall = colliderFromCenter(0, 0, 4, 4, 2, 'wall', { blocksSight: true });
    expect(segmentHitsCollider(-10, 0, 10, 0, wall)).toBe(true);
    expect(segmentHitsCollider(-10, 10, 10, 10, wall)).toBe(false);
    expect(losClear(-10, 0, 10, 0, [wall])).toBe(false);
    expect(losClear(-10, 10, 10, 10, [wall])).toBe(true);

    const open = { ...wall, blocksSight: false };
    expect(losClear(-10, 0, 10, 0, [open])).toBe(true);
  });

  it('segmentHitsCircle', () => {
    expect(segmentHitsCircle(0, 0, 10, 0, 5, 0, 1)).toBe(true);
    expect(segmentHitsCircle(0, 0, 10, 0, 5, 5, 1)).toBe(false);
  });
});
