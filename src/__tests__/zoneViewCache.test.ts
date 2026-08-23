import { describe, expect, it } from 'vitest';
import type { CaptureZoneState } from '../game/match/captureLogic';
import { syncZoneViews } from '../game/engine/stages/zoneViewCache';

function zone(overrides: Partial<CaptureZoneState> = {}): CaptureZoneState {
  return {
    id: 'A', x: 10, z: 20, radius: 20,
    owner: null, progress: 0, actor: null, contested: false,
    ...overrides,
  };
}

describe('syncZoneViews', () => {
  it('rebuilds views when anchors move (map switch / reset)', () => {
    const first = syncZoneViews(null, [zone({ x: -88 }), zone({ id: 'B', x: 0 })]);
    expect(first).toHaveLength(2);

    // New tick: controller hands out fresh objects with NEW coordinates.
    const nextTick = [zone({ x: 5 }), zone({ id: 'B', x: 78 })];
    const rebuilt = syncZoneViews(first, nextTick);

    expect(rebuilt).not.toBe(first);
    expect(rebuilt[0].x).toBe(5);
    expect(rebuilt[1].x).toBe(78);
  });

  it('keeps identity across ticks and refreshes owner/contested in place', () => {
    const first = syncZoneViews(null, [zone()]);
    const before = first[0];

    // Same anchors, mutable flags flipped by the sim.
    const again = syncZoneViews(first, [zone({ owner: 'alpha', contested: true })]);

    expect(again[0]).toBe(before);
    expect(before.owner).toBe('alpha');
    expect(before.contested).toBe(true);
  });

  it('keeps identity when nothing changed', () => {
    const first = syncZoneViews(null, [zone(), zone({ id: 'B' as const, x: -3 })]);
    const second = syncZoneViews(first, [zone(), zone({ id: 'B' as const, x: -3 })]);
    expect(second).toBe(first);
  });

  it('rebuilds when the zone count changes', () => {
    const two = syncZoneViews(null, [zone(), zone({ id: 'B' as const })]);
    const three = syncZoneViews(two, [zone(), zone({ id: 'B' as const }), zone({ id: 'C' as const })]);
    expect(three).toHaveLength(3);
    expect(three.map((v) => v.id)).toEqual(['A', 'B', 'C']);
  });
});
