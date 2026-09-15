import { describe, it, expect } from 'vitest';
import {
  clamp, wrapAngle, colliderFromCenter, resolveCircle,
  pointInCollider, segmentHitsCollider, losClear, segmentHitsCircle, segmentHitsCircleT,
  aabbForYaw,
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

  // C5: выбор ближайшей цели снаряда по параметру t ∈ [0,1].
  it('segmentHitsCircleT returns first-entry t, -1 when no hit', () => {
    // Сегмент (0,0)→(10,0), круг r=1 в (5,0) → вход в x=4 → t=0.4.
    expect(segmentHitsCircleT(0, 0, 10, 0, 5, 0, 1)).toBeCloseTo(0.4, 5);
    // Промах.
    expect(segmentHitsCircleT(0, 0, 10, 0, 5, 5, 1)).toBe(-1);
    // Старт внутри круга → t=0.
    expect(segmentHitsCircleT(5, 0, 10, 0, 5, 0, 1)).toBe(0);
    // Круг дальше конца сегмента.
    expect(segmentHitsCircleT(0, 0, 3, 0, 5, 0, 1)).toBe(-1);
    // Нулевой сегмент.
    expect(segmentHitsCircleT(0, 0, 0, 0, 0.5, 0, 1)).toBe(0);
    expect(segmentHitsCircleT(0, 0, 0, 0, 5, 0, 1)).toBe(-1);
  });

  // I7: yaw-aware AABB-обёртка повёрнутого прямоугольника.
  it('aabbForYaw охватывает повёрнутый w×d', () => {
    // yaw=0 → без изменений.
    expect(aabbForYaw(10, 4, 0)).toEqual({ w: 10, d: 4 });
    // yaw=π/2 → оси меняются местами (бывшая длина становится глубиной).
    const q = aabbForYaw(10, 4, Math.PI / 2);
    expect(q.w).toBeCloseTo(4, 5);
    expect(q.d).toBeCloseTo(10, 5);
    // yaw=π/4 → симметричный охват, обе стороны ≥ max(w,d)/√2·… = (w+d)/√2.
    const d45 = aabbForYaw(10, 4, Math.PI / 4);
    expect(d45.w).toBeCloseTo((10 + 4) / Math.SQRT2, 4);
    expect(d45.d).toBeCloseTo((10 + 4) / Math.SQRT2, 4);
    // pad добавляется к обеим сторонам.
    expect(aabbForYaw(10, 4, 0, 0.3)).toEqual({ w: 10.3, d: 4.3 });
    // Отрицательный/ >π yaw (blinds) — берётся |cos|/|sin|, тот же охват.
    expect(aabbForYaw(10, 4, -Math.PI / 2).w).toBeCloseTo(4, 5);
  });
});
