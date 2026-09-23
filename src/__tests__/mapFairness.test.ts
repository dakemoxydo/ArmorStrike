// ===== I1/I3: справедливость спавнов и симметрия CP-якорей ==================
// Метрики дублируются в `npm run map-plan [mapId]` (консоль fairness/cp access);
// здесь — контрактные инварианты, которые падают при регрессии раскладки.
import { describe, expect, it } from 'vitest';
import {
  FFA_SPAWN_POINTS,
  ALPHA_SPAWN_POINTS,
  BRAVO_SPAWN_POINTS,
} from '../game/match/spawnPoints';
import { zonesForMap } from '../game/match/captureAnchors';
import type { MapId } from '../game/maps/mapCatalog';

const MAP_IDS: MapId[] = ['factory', 'village', 'city'];

function centroid(pts: readonly [number, number][]): [number, number] {
  let sx = 0;
  let sz = 0;
  for (const [x, z] of pts) {
    sx += x;
    sz += z;
  }
  return [sx / pts.length, sz / pts.length];
}

function minCrossTeamDist(): number {
  let min = Infinity;
  for (const [ax, az] of ALPHA_SPAWN_POINTS) {
    for (const [bx, bz] of BRAVO_SPAWN_POINTS) {
      min = Math.min(min, Math.hypot(ax - bx, az - bz));
    }
  }
  return min;
}

function ffaNearestNeighbours(): number[] {
  return FFA_SPAWN_POINTS.map(([x, z], i) =>
    Math.min(
      ...FFA_SPAWN_POINTS.filter((_, j) => j !== i).map(([ox, oz]) => Math.hypot(ox - x, oz - z)),
    ),
  );
}

describe('spawn fairness (I1)', () => {
  it('team spawn tables are z-mirrored pair-wise (equal access for both sides)', () => {
    expect(ALPHA_SPAWN_POINTS).toHaveLength(BRAVO_SPAWN_POINTS.length);
    ALPHA_SPAWN_POINTS.forEach(([x, z], i) => {
      const [bx, bz] = BRAVO_SPAWN_POINTS[i];
      expect(bx, `pair ${i} x`).toBe(x);
      expect(bz, `pair ${i} z`).toBe(-z);
    });
  });

  it('closest cross-team spawn distance is ≥120 m (mirror ⇒ equal from both sides)', () => {
    expect(minCrossTeamDist()).toBeGreaterThanOrEqual(120);
  });

  it('FFA nearest-neighbour spread is ≤10% (I1 rebalance: edges are 180° mirrors)', () => {
    const nns = ffaNearestNeighbours();
    const min = Math.min(...nns);
    const max = Math.max(...nns);
    expect(min).toBeGreaterThanOrEqual(100); // не сбиваются в кучу
    expect(max).toBeLessThanOrEqual(min * 1.1); // равномерное покрытие краёв
  });
});

describe('CP anchor symmetry (I3)', () => {
  it('anchors are invariant under 180° rotation within 10 m per map', () => {
    for (const id of MAP_IDS) {
      const zones = zonesForMap(id);
      expect(zones).toHaveLength(3);
      for (const z of zones) {
        const rx = -z.x;
        const rz = -z.z;
        const best = Math.min(...zones.map((o) => Math.hypot(o.x - rx, o.z - rz)));
        expect(best, `${id} CP-${z.id} rot-symmetry`).toBeLessThanOrEqual(10);
      }
    }
  });

  it('aggregate team access delta |Σ(dα − dβ)| ≤ 15 m per map', () => {
    const [aCx, aCz] = centroid(ALPHA_SPAWN_POINTS);
    const [bCx, bCz] = centroid(BRAVO_SPAWN_POINTS);
    for (const id of MAP_IDS) {
      let sum = 0;
      for (const z of zonesForMap(id)) {
        const dA = Math.hypot(z.x - aCx, z.z - aCz);
        const dB = Math.hypot(z.x - bCx, z.z - bCz);
        sum += dA - dB;
      }
      expect(Math.abs(sum), `${id} ΣCP access Δ`).toBeLessThanOrEqual(15);
    }
  });
});
