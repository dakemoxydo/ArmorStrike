import { describe, expect, it } from 'vitest';
import { allyLineBlockers, pickAiFocus } from '../game/match/aiFocus';
import type { Collider } from '../game/engine/physics';

const emptyColliders: Collider[] = [];

function cand(
  id: number,
  teamId: 'alpha' | 'bravo' | null,
  x: number,
  z: number,
  alive = true,
) {
  return {
    id,
    teamId,
    alive,
    position: { x, z },
    vel: { x: 0, y: 0, z: 0 },
  };
}

describe('pickAiFocus (multi-target)', () => {
  it('FFA: picks nearest alive peer, never self', () => {
    const self = { id: 1, teamId: null as null, position: { x: 0, z: 0 } };
    const { target } = pickAiFocus({
      self,
      candidates: [
        cand(1, null, 0, 0),
        cand(2, null, 50, 0),
        cand(3, null, 10, 0),
      ],
      colliders: emptyColliders,
      sightRange: 46,
    });
    expect(target?.id).toBe(3);
  });

  it('team: ignores allies, picks enemy', () => {
    const self = { id: 1, teamId: 'alpha' as const, position: { x: 0, z: 0 } };
    const { target } = pickAiFocus({
      self,
      candidates: [
        cand(2, 'alpha', 5, 0),
        cand(3, 'bravo', 40, 0),
        cand(4, 'bravo', 20, 0),
      ],
      colliders: emptyColliders,
      sightRange: 46,
    });
    expect(target?.id).toBe(4);
  });

  it('sticky keeps previous target within slack', () => {
    const self = { id: 1, teamId: null as null, position: { x: 0, z: 0 } };
    const { target } = pickAiFocus({
      self,
      candidates: [
        cand(2, null, 20, 0),
        cand(3, null, 12, 0),
      ],
      colliders: emptyColliders,
      sightRange: 46,
      stickyId: 2,
      stickySlack: 14,
    });
    // nearest is 3 at 12, sticky 2 at 20 — within slack 14 → keep 2
    expect(target?.id).toBe(2);
  });

  it('sticky drops when far worse than nearest', () => {
    const self = { id: 1, teamId: null as null, position: { x: 0, z: 0 } };
    const { target } = pickAiFocus({
      self,
      candidates: [
        cand(2, null, 80, 0),
        cand(3, null, 10, 0),
      ],
      colliders: emptyColliders,
      sightRange: 46,
      stickyId: 2,
      stickySlack: 14,
    });
    expect(target?.id).toBe(3);
  });

  it('returns null when no hostiles', () => {
    const self = { id: 1, teamId: 'alpha' as const, position: { x: 0, z: 0 } };
    const { target } = pickAiFocus({
      self,
      candidates: [cand(2, 'alpha', 10, 0)],
      colliders: emptyColliders,
      sightRange: 46,
    });
    expect(target).toBeNull();
  });
});

describe('allyLineBlockers', () => {
  it('FFA: no allies → empty blockers', () => {
    const self = { id: 1, teamId: null as null };
    const tanks = [
      { id: 1, teamId: null as null, alive: true },
      { id: 2, teamId: null as null, alive: true },
    ];
    expect(allyLineBlockers(self, tanks)).toHaveLength(0);
  });

  it('team: only same-team alive non-self', () => {
    const self = { id: 1, teamId: 'alpha' as const };
    const tanks = [
      { id: 1, teamId: 'alpha' as const, alive: true },
      { id: 2, teamId: 'alpha' as const, alive: true },
      { id: 3, teamId: 'bravo' as const, alive: true },
      { id: 4, teamId: 'alpha' as const, alive: false },
    ];
    const b = allyLineBlockers(self, tanks);
    expect(b.map((t) => t.id)).toEqual([2]);
  });
});
