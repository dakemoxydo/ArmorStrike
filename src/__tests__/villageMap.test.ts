/**
 * Village layout contract.
 *
 * The village is a full-arena rural map (half = 150). Unlike the factory it
 * intentionally uses *soft* gates across its lanes (destructible fences/hay),
 * so these pins differ from `factoryMap.test.ts` on one axis only: the lanes
 * must stay free of **hard** cover (never soft), and the centre strip must be
 * genuinely open so duels have a shooting channel.
 *
 * The three ways a map edit silently breaks a match are pinned here: content
 * drifting into the fire lanes, into the capture zones, or into the spawn
 * aprons.
 */
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { colliderFromCenter, losClear, type Collider } from '../game/engine/physics';
import type { ArenaBuildContext } from '../game/arena/context';
import type { AnimNodeFn } from '../game/ArenaEffects';
import type { BlockInfo } from '../game/arena/types';
import { buildVillageContent } from '../game/arena/villageMap';
import { CAPTURE } from '../game/match/captureLogic';
import { zonesForMap } from '../game/match/captureAnchors';
import {
  ALPHA_SPAWN_POINTS,
  BRAVO_SPAWN_POINTS,
  FFA_SPAWN_POINTS,
} from '../game/match/spawnPoints';

// ── headless canvas stub (texture factories need a 2d context) ─────────────
const gradient = { addColorStop: () => {} };
const ctx2d = new Proxy(
  {},
  {
    get(_t, prop) {
      if (prop === 'createRadialGradient' || prop === 'createLinearGradient') {
        return () => gradient;
      }
      return () => {};
    },
    set() {
      return true;
    },
  },
);
(globalThis as Record<string, unknown>).document = {
  createElement: (tag: string) =>
    tag === 'canvas' ? { width: 0, height: 0, getContext: () => ctx2d } : undefined,
};

// ── context harness: mirrors Arena.addColliderBlock without a WebGL scene ──

function build() {
  const group = new THREE.Group();
  const colliders: Collider[] = [];
  const blocks = new Map<number, BlockInfo>();
  const beaconMats: THREE.MeshBasicMaterial[] = [];
  const smokeEmitters: THREE.Vector3[] = [];
  const furnaceGlowMats: THREE.MeshStandardMaterial[] = [];
  const moltenMats: THREE.MeshBasicMaterial[] = [];
  const animNodes: AnimNodeFn[] = [];

  const ctx: ArenaBuildContext = {
    group,
    half: 150,
    colliders,
    blocks,
    beaconMats,
    smokeEmitters,
    furnaceGlowMats,
    moltenMats,
    animNodes,
    box: (w, h, d, mat, cy) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.y = cy ?? h / 2;
      return m;
    },
    addColliderBlock: (x, z, w, d, h, destructible, buildMesh, hp = 100, kind = 'block', blocksSight = true) => {
      const wrap = new THREE.Group();
      wrap.position.set(x, 0, z);
      wrap.add(buildMesh());
      group.add(wrap);
      const col = colliderFromCenter(x, z, w, d, h, kind, { destructible, blocksSight });
      colliders.push(col);
      if (destructible) {
        blocks.set(col.id, {
          id: col.id, group: wrap, collider: col, hp, maxHp: hp, mats: [], flash: 0,
          size: Math.max(w, d),
        });
      }
      return col;
    },
    setObelisk: () => {},
    setCraneTrolley: () => {},
    setDome: () => {},
    setDust: () => {},
  };

  buildVillageContent(ctx);
  return { colliders, blocks, smokeEmitters, animNodes, group };
}

// ── geometry helpers ───────────────────────────────────────────────────────

/** Hard cover = anything a tank cannot shoot through and cannot break. */
const isHard = (c: Collider) => c.kind === 'wall' || (!c.destructible && c.height >= 2.5);

const overlapsRect = (c: Collider, x0: number, z0: number, x1: number, z1: number) =>
  c.maxX > x0 && c.minX < x1 && c.maxZ > z0 && c.minZ < z1;

const distTo = (c: Collider, x: number, z: number) => {
  const dx = Math.max(c.minX - x, 0, x - c.maxX);
  const dz = Math.max(c.minZ - z, 0, z - c.maxZ);
  return Math.hypot(dx, dz);
};

const centerX = (c: Collider) => (c.minX + c.maxX) / 2;
const centerZ = (c: Collider) => (c.minZ + c.maxZ) / 2;
const centerR = (c: Collider) => Math.hypot(centerX(c), centerZ(c));

const LANE = 10;
/** The crossroads junction + its immediate approaches must stay hard-cover free. */
const PLAZA_CLEAR = 24;
const APRON_X = 78;
const APRON_Z = 84;
const APRON_Z_FAR = 130;

const allSpawns: [number, number][] = [
  ...FFA_SPAWN_POINTS,
  ...ALPHA_SPAWN_POINTS,
  ...BRAVO_SPAWN_POINTS,
];

// ── tests ──────────────────────────────────────────────────────────────────

describe('village layout — fire lanes', () => {
  it('keeps the main cross free of hard cover', () => {
    const { colliders } = build();
    const hard = colliders.filter(isHard);
    const inNS = hard.filter((c) => overlapsRect(c, -LANE, -150, LANE, 150));
    const inEW = hard.filter((c) => overlapsRect(c, -150, -LANE, 150, LANE));
    expect(inNS.map((c) => [centerX(c), centerZ(c)])).toEqual([]);
    expect(inEW.map((c) => [centerX(c), centerZ(c)])).toEqual([]);
  });

  it('keeps the centre strip of both primary lanes completely open', () => {
    // A 12 m clear corridor down the middle of each lane — duels need a real
    // shooting channel, not merely "no unbreakable wall".
    const { colliders } = build();
    const strip = 6;
    const inNS = colliders.filter((c) => overlapsRect(c, -strip, -150, strip, 150));
    const inEW = colliders.filter((c) => overlapsRect(c, -150, -strip, 150, strip));
    expect(inNS.map((c) => [centerX(c), centerZ(c)])).toEqual([]);
    expect(inEW.map((c) => [centerX(c), centerZ(c)])).toEqual([]);
  });

  it('keeps the centre plaza free of hard cover (CP-A sits there)', () => {
    const { colliders } = build();
    const inPlaza = colliders.filter(
      (c) => isHard(c) && overlapsRect(c, -PLAZA_CLEAR, -PLAZA_CLEAR, PLAZA_CLEAR, PLAZA_CLEAR),
    );
    expect(inPlaza.map((c) => [centerX(c), centerZ(c)])).toEqual([]);
  });
});

describe('village layout — capture points', () => {
  it('leaves every capture anchor reachable and contestable', () => {
    const { colliders } = build();
    const zones = zonesForMap('village');
    expect(zones).toHaveLength(3);
    for (const z of zones) {
      const inside = colliders.filter((c) => distTo(c, z.x, z.z) < 9);
      expect(inside, `anchor ${z.id} blocked within 9 m`).toEqual([]);
      const walled = colliders.filter(
        (c) => isHard(c) && distTo(c, z.x, z.z) < CAPTURE.radius,
      );
      expect(walled, `anchor ${z.id} walled in`).toEqual([]);
    }
  });
});

describe('village layout — spawns', () => {
  it('keeps every spawn point clear of geometry', () => {
    const { colliders } = build();
    for (const [x, z] of allSpawns) {
      const near = colliders.filter((c) => distTo(c, x, z) < 10);
      expect(near, `spawn (${x}, ${z}) obstructed`).toEqual([]);
    }
  });

  it('keeps both spawn aprons free of geometry', () => {
    const { colliders } = build();
    for (const [z0, z1] of [[APRON_Z, APRON_Z_FAR], [-APRON_Z_FAR, -APRON_Z]] as const) {
      const inApron = colliders.filter((c) => overlapsRect(c, -APRON_X, z0, APRON_X, z1));
      expect(inApron.map((c) => [centerX(c), centerZ(c)])).toEqual([]);
    }
  });
});

describe('village layout — cover distribution', () => {
  it('covers all four quadrants with hard and soft cover', () => {
    const { colliders } = build();
    const quads: [string, (c: Collider) => boolean][] = [
      ['NW', (c) => centerX(c) < 0 && centerZ(c) > 0],
      ['NE', (c) => centerX(c) > 0 && centerZ(c) > 0],
      ['SW', (c) => centerX(c) < 0 && centerZ(c) < 0],
      ['SE', (c) => centerX(c) > 0 && centerZ(c) < 0],
    ];
    for (const [name, inQuad] of quads) {
      const inQ = colliders.filter(inQuad);
      expect(inQ.filter(isHard).length, `${name} hard cover`).toBeGreaterThanOrEqual(2);
      expect(inQ.filter((c) => c.destructible).length, `${name} soft cover`).toBeGreaterThanOrEqual(2);
    }
  });

  it('fills the outer band in all four directions', () => {
    const { colliders } = build();
    const outer = colliders.filter((c) => centerR(c) > 95);
    expect(outer.length).toBeGreaterThanOrEqual(18);
    const dirs = [
      outer.some((c) => centerZ(c) > 95),
      outer.some((c) => centerZ(c) < -95),
      outer.some((c) => centerX(c) > 95),
      outer.some((c) => centerX(c) < -95),
    ];
    expect(dirs).toEqual([true, true, true, true]);
  });

  it('stays inside the walls', () => {
    const { colliders } = build();
    for (const c of colliders) {
      expect(Math.abs(centerX(c))).toBeLessThanOrEqual(148);
      expect(Math.abs(centerZ(c))).toBeLessThanOrEqual(148);
    }
  });

  it('has enough total cover to be a real arena', () => {
    const { colliders, blocks } = build();
    expect(colliders.length).toBeGreaterThan(70);
    expect(colliders.filter((c) => c.destructible).length).toBeGreaterThanOrEqual(24);
    expect(blocks.size).toBe(colliders.filter((c) => c.destructible).length);
  });
});

describe('village layout — ramps and life', () => {
  it('makes every ramp a non-blocking wedge', () => {
    const { colliders } = build();
    const ramps = colliders.filter((c) => c.kind === 'ramp');
    expect(ramps.length).toBeGreaterThanOrEqual(4);
    for (const r of ramps) {
      expect(r.blocksShots).toBe(false);
      expect(r.blocksSight).toBe(false);
    }
  });

  it('registers living nodes and smoke emitters', () => {
    const { animNodes, smokeEmitters } = build();
    expect(animNodes.length).toBeGreaterThan(0);
    expect(smokeEmitters.length).toBeGreaterThan(0);
  });

  it('keeps soft cover out of nothing — sanity: a lane sightline crosses soft gates only', () => {
    // Village deliberately gates its lanes with destructible fences, so the
    // end-to-end sightline is NOT clear; but it must never be blocked by a
    // wall that cannot be broken.
    const { colliders } = build();
    const blockers = colliders.filter(
      (c) => c.blocksSight && isHard(c) && overlapsRect(c, -LANE, -150, LANE, 150),
    );
    expect(blockers.map((c) => [centerX(c), centerZ(c)])).toEqual([]);
    expect(typeof losClear(0, -150, 0, 150, colliders)).toBe('boolean');
  });
});
