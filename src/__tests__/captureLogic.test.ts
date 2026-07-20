import { describe, expect, it } from 'vitest';
import {
  CAPTURE,
  countPresenceInZone,
  createZone,
  resolveActor,
  scoreDeltaFromZones,
  stepCaptureZone,
} from '../game/match/captureLogic';
import { zonesForMap } from '../game/match/captureAnchors';

describe('captureLogic', () => {
  it('counts only alive teamed tanks inside radius', () => {
    const z = createZone('A', 0, 0, 20);
    const p = countPresenceInZone(z, [
      { alive: true, teamId: 'alpha', position: { x: 5, z: 0 } },
      { alive: true, teamId: 'bravo', position: { x: 3, z: 3 } },
      { alive: false, teamId: 'alpha', position: { x: 0, z: 0 } },
      { alive: true, teamId: 'alpha', position: { x: 100, z: 0 } },
      { alive: true, teamId: null, position: { x: 0, z: 0 } },
    ]);
    expect(p).toEqual({ alpha: 1, bravo: 1 });
  });

  it('contested freezes progress', () => {
    let z = createZone('B', 0, 0);
    z = stepCaptureZone(z, { alpha: 1, bravo: 0 }, 4);
    expect(z.progress).toBeCloseTo(0.5, 5);
    const frozen = stepCaptureZone(z, { alpha: 1, bravo: 1 }, 4);
    expect(frozen.contested).toBe(true);
    expect(frozen.progress).toBeCloseTo(0.5, 5);
  });

  it('neutral capture completes in captureSec exclusive', () => {
    let z = createZone('A', 0, 0);
    z = stepCaptureZone(z, { alpha: 1, bravo: 0 }, CAPTURE.captureSec);
    expect(z.owner).toBe('alpha');
    expect(z.progress).toBe(0);
  });

  it('neutral-first: must neutralize before enemy owns', () => {
    let z = createZone('C', 0, 0);
    z = { ...z, owner: 'alpha', progress: 0, actor: null };
    // Bravo fills neutralize bar
    z = stepCaptureZone(z, { alpha: 0, bravo: 1 }, CAPTURE.captureSec);
    expect(z.owner).toBe(null);
    expect(z.progress).toBe(0);
    // Second fill captures for bravo
    z = stepCaptureZone(z, { alpha: 0, bravo: 1 }, CAPTURE.captureSec);
    expect(z.owner).toBe('bravo');
  });

  it('actor switch resets progress', () => {
    let z = createZone('A', 0, 0);
    z = stepCaptureZone(z, { alpha: 1, bravo: 0 }, 4);
    expect(z.progress).toBeCloseTo(0.5, 5);
    z = stepCaptureZone(z, { alpha: 0, bravo: 1 }, 1);
    expect(z.actor).toBe('bravo');
    expect(z.progress).toBeCloseTo(1 / CAPTURE.captureSec, 5);
  });

  it('score delta only from owned points', () => {
    const zones = [
      { ...createZone('A', 0, 0), owner: 'alpha' as const },
      { ...createZone('B', 0, 0), owner: 'alpha' as const },
      { ...createZone('C', 0, 0), owner: 'bravo' as const },
    ];
    const d = scoreDeltaFromZones(zones, 2, 1);
    expect(d.alpha).toBe(4);
    expect(d.bravo).toBe(2);
  });

  it('resolveActor: allies on own point do not progress', () => {
    expect(resolveActor('alpha', { alpha: 2, bravo: 0 })).toEqual({
      actor: null,
      contested: false,
    });
  });

  it('zonesForMap returns A/B/C for each map', () => {
    for (const id of ['factory', 'village', 'city'] as const) {
      const zs = zonesForMap(id);
      expect(zs.map((z) => z.id)).toEqual(['A', 'B', 'C']);
      expect(zs.every((z) => z.owner === null)).toBe(true);
    }
  });
});
