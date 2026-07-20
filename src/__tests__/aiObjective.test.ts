import { describe, expect, it } from 'vitest';
import {
  isObjectiveDuty,
  pickObjectiveZone,
  shouldFightNearObjective,
  zonePriority,
} from '../game/match/aiObjective';

const zones = [
  { id: 'A', x: 0, z: 0, radius: 20, owner: null as null, contested: false },
  { id: 'B', x: 100, z: 0, radius: 20, owner: 'bravo' as const, contested: false },
  { id: 'C', x: -100, z: 0, radius: 20, owner: 'alpha' as const, contested: false },
];

describe('aiObjective', () => {
  it('isObjectiveDuty is ~50% by index', () => {
    const flags = [0, 1, 2, 3, 4, 5, 6, 7, 8].map(isObjectiveDuty);
    expect(flags.filter(Boolean).length).toBe(5);
    expect(flags[0]).toBe(true);
    expect(flags[1]).toBe(false);
  });

  it('priority: contested < neutral < enemy < own', () => {
    expect(zonePriority({ ...zones[0], contested: true }, 'alpha')).toBe(0);
    expect(zonePriority(zones[0], 'alpha')).toBe(1);
    expect(zonePriority(zones[1], 'alpha')).toBe(2);
    expect(zonePriority(zones[2], 'alpha')).toBe(3);
  });

  it('picks nearest neutral over far enemy for alpha near A', () => {
    const z = pickObjectiveZone({ x: 5, z: 0, teamId: 'alpha' }, zones);
    expect(z?.id).toBe('A');
  });

  it('prefers contested over nearer neutral', () => {
    const list = [
      { id: 'A', x: 10, z: 0, radius: 20, owner: null as null, contested: false },
      { id: 'B', x: 40, z: 0, radius: 20, owner: null as null, contested: true },
    ];
    const z = pickObjectiveZone({ x: 0, z: 0, teamId: 'alpha' }, list);
    expect(z?.id).toBe('B');
  });

  it('sticky keeps zone within slack', () => {
    const list = [
      { id: 'A', x: 0, z: 0, radius: 20, owner: null as null, contested: false },
      { id: 'B', x: 15, z: 0, radius: 20, owner: null as null, contested: false },
    ];
    const z = pickObjectiveZone({ x: 0, z: 0, teamId: 'alpha' }, list, 'B', 28);
    expect(z?.id).toBe('B');
  });

  it('shouldFightNearObjective: close enemy or on zone', () => {
    const zone = zones[0];
    expect(
      shouldFightNearObjective({ x: 0, z: 0 }, { x: 10, z: 0, alive: true }, zone, 25),
    ).toBe(true);
    expect(
      shouldFightNearObjective({ x: 50, z: 0 }, { x: 5, z: 0, alive: true }, zone, 25),
    ).toBe(true);
    expect(
      shouldFightNearObjective({ x: 80, z: 0 }, { x: 120, z: 0, alive: true }, zone, 25),
    ).toBe(false);
    expect(
      shouldFightNearObjective({ x: 0, z: 0 }, { x: 10, z: 0, alive: false }, zone, 25),
    ).toBe(false);
  });
});
