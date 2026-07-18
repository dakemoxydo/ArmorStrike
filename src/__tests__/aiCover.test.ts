import { describe, it, expect } from 'vitest';
import { findCoverPoint, AI_LOW_HP_FRAC } from '../game/aiCover';
import type { Collider } from '../game/engine/physics';

function block(id: number, cx: number, cz: number, w = 6, d = 6): Collider {
  return {
    id,
    minX: cx - w / 2,
    maxX: cx + w / 2,
    minZ: cz - d / 2,
    maxZ: cz + d / 2,
    height: 3,
    blocksShots: true,
    blocksSight: true,
    destructible: true,
    active: true,
    kind: 'block',
  };
}

describe('aiCover', () => {
  it('exports low-HP threshold under half health', () => {
    expect(AI_LOW_HP_FRAC).toBeLessThan(0.5);
    expect(AI_LOW_HP_FRAC).toBeGreaterThan(0.2);
  });

  it('returns null when no cover colliders', () => {
    expect(findCoverPoint(0, 0, 20, 0, [])).toBeNull();
  });

  it('picks a stand point on the far side of cover from the threat', () => {
    // Threat at x=0, cover at x=20 — stand should be further positive X (away from threat).
    const pt = findCoverPoint(18, 0, 0, 0, [block(1, 20, 0)]);
    expect(pt).not.toBeNull();
    expect(pt!.x).toBeGreaterThan(20);
  });

  it('ignores inactive or non-sight blockers', () => {
    const dead = block(1, 10, 0);
    dead.active = false;
    const ramp = block(2, 12, 0);
    ramp.kind = 'ramp';
    const open = block(3, 14, 0);
    open.blocksSight = false;
    expect(findCoverPoint(0, 0, -10, 0, [dead, ramp, open])).toBeNull();
  });
});
