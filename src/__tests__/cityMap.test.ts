/**
 * City layout contract (I4/I5 — батч аудита 2026-09-15).
 *
 * Factory/village уже пинуют проходимость авеню, ясность спавнов и clear зон
 * CP; City не имела теста и просочила: solid-коллайдеры билбордов в 1.3 м от
 * базовых спавнов, CP-A под 9.5-м «wall» монумента, CP-C с hard-объектами
 * внутри диска и спавном Alpha внутри зоны. Эти пины — тот же критерий.
 */
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { colliderFromCenter, losClear, type Collider } from '../game/engine/physics';
import type { ArenaBuildContext } from '../game/arena/context';
import type { AnimNodeFn } from '../game/ArenaEffects';
import type { BlockInfo } from '../game/arena/types';
import { buildCityContent } from '../game/arena/cityMap';
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

  buildCityContent(ctx);
  return { colliders, blocks, smokeEmitters, animNodes, group };
}

// ── geometry helpers ───────────────────────────────────────────────────────

/** Hard cover = anything a tank cannot shoot through and cannot break. */
const isHard = (c: Collider) => c.kind === 'wall' || (!c.destructible && c.height >= 2.5);
/** Solid для корпуса: всё кроме 'ramp' (solidColliderCache). */
const isTankSolid = (c: Collider) => c.active && c.kind !== 'ramp';

const overlapsRect = (c: Collider, x0: number, z0: number, x1: number, z1: number) =>
  c.maxX > x0 && c.minX < x1 && c.maxZ > z0 && c.minZ < z1;

const distTo = (c: Collider, x: number, z: number) => {
  const dx = Math.max(c.minX - x, 0, x - c.maxX);
  const dz = Math.max(c.minZ - z, 0, z - c.maxZ);
  return Math.hypot(dx, dz);
};

const centerX = (c: Collider) => (c.minX + c.maxX) / 2;
const centerZ = (c: Collider) => (c.minZ + c.maxZ) / 2;

// Ареньные константы пина: спавны и якорь-клиренс.
const SPAWN_CLEAR = 10; // как factoryMap.test.ts / villageMap.test.ts

const allSpawns: [number, number][] = [
  ...FFA_SPAWN_POINTS,
  ...ALPHA_SPAWN_POINTS,
  ...BRAVO_SPAWN_POINTS,
];

// ── tests ──────────────────────────────────────────────────────────────────

describe('city layout — avenues', () => {
  it('keeps the main cross free of hard cover', () => {
    const { colliders } = build();
    const hard = colliders.filter(isHard);
    const inNS = hard.filter((c) => overlapsRect(c, -14, -150, 14, 150));
    const inEW = hard.filter((c) => overlapsRect(c, -150, -14, 150, 14));
    expect(inNS.map((c) => [centerX(c), centerZ(c)])).toEqual([]);
    expect(inEW.map((c) => [centerX(c), centerZ(c)])).toEqual([]);
  });

  it('keeps the centre strip of both primary lanes completely open', () => {
    const { colliders } = build();
    const strip = 6;
    // 'ramp' — drivable по конвенции M12 (плаза-подиум/въездные рампы),
    // для остальных коллайдеров — тот же критерий, что у factory.
    const inNS = colliders.filter((c) => isTankSolid(c) && overlapsRect(c, -strip, -150, strip, 150));
    const inEW = colliders.filter((c) => isTankSolid(c) && overlapsRect(c, -150, -strip, 150, strip));
    expect(inNS.map((c) => [centerX(c), centerZ(c)])).toEqual([]);
    expect(inEW.map((c) => [centerX(c), centerZ(c)])).toEqual([]);
  });

  it('keeps both primary lanes sight-clear end to end', () => {
    const { colliders } = build();
    expect(losClear(0, -150, 0, 150, colliders)).toBe(true);
    expect(losClear(-150, 0, 150, 0, colliders)).toBe(true);
  });
});

describe('city layout — spawns (I4)', () => {
  it('keeps every spawn point clear of geometry', () => {
    const { colliders } = build();
    for (const [x, z] of allSpawns) {
      const near = colliders.filter((c) => distTo(c, x, z) < SPAWN_CLEAR);
      expect(near, `spawn (${x}, ${z}) obstructed`).toEqual([]);
    }
  });

  it('keeps no spawn inside a capture disc', () => {
    // I5: спавн Alpha (20,−95) лежал ВНУТРИ диска CP-C (12 м от центра).
    const zones = zonesForMap('city');
    for (const [x, z] of allSpawns) {
      for (const zn of zones) {
        expect(
          Math.hypot(x - zn.x, z - zn.z),
          `spawn (${x}, ${z}) inside CP-${zn.id} disc`,
        ).toBeGreaterThanOrEqual(CAPTURE.radius);
      }
    }
  });
});

describe('city layout — capture points (I5)', () => {
  it('leaves every capture anchor reachable and contestable', () => {
    const { colliders } = build();
    const zones = zonesForMap('city');
    expect(zones).toHaveLength(3);
    for (const z of zones) {
      // room to fight inside the zone (ramp — drivable, не в счёт)
      const inside = colliders.filter((c) => isTankSolid(c) && distTo(c, z.x, z.z) < 9);
      expect(inside, `anchor ${z.id} blocked within 9 m`).toEqual([]);
      // no unbreakable wall inside the capture radius
      const walled = colliders.filter(
        (c) => isHard(c) && distTo(c, z.x, z.z) < CAPTURE.radius,
      );
      expect(walled, `anchor ${z.id} walled in`).toEqual([]);
    }
  });

  it('keeps CP-B/CP-C mirrored from team bases', () => {
    // I3-контракт для city: одинаковый путь от своей базы до своего CP.
    const [A, B, C] = zonesForMap('city');
    expect([A.x, A.z]).toEqual([0, 0]);
    const dB = Math.hypot(B.x - 0, B.z - 120);
    const dC = Math.hypot(C.x - 0, C.z + 120);
    expect(dB).toBeCloseTo(dC, 5);
    expect(dC).toBeCloseTo(42, 5);
  });
});

describe('city layout — no invisible solids', () => {
  it('every tank-solid thin object is at least eye-high', () => {
    // Класс I6 на рельсах factory: solid 0.2 м высотой = невидимая стена.
    const { colliders } = build();
    const traps = colliders.filter(
      (c) => c.kind !== 'wall' && !c.destructible && c.height > 0 && c.height < 0.5 && c.kind !== 'ramp',
    );
    expect(traps.map((c) => [centerX(c), centerZ(c)])).toEqual([]);
  });

  it('billboard colliders are AABB-wrapped to the board yaw (I7 pilot)', () => {
    const { colliders } = build();
    // Билборды (h=5, non-destructible, blocksSight:false) с узкой осевой
    // гранью: длинная сторона AABB обязана идти вдоль доски.
    const boards = colliders.filter(
      (c) => !c.destructible && c.height === 5 && !c.blocksSight,
    );
    expect(boards.length).toBeGreaterThanOrEqual(4);
    for (const b of boards) {
      const w = b.maxX - b.minX;
      const d = b.maxZ - b.minZ;
      // yaw≈0 (N/S) → длинная по X; yaw≈±π/2 (E/W) → по Z; ±0.4/0.5 —
      // повёрнутые рыночные: обе грани ≥ 2.5 (диагональный AABB).
      const long = Math.max(w, d);
      const short = Math.min(w, d);
      expect(long, `board at (${centerX(b)}, ${centerZ(b)})`).toBeGreaterThan(5);
      expect(short, `board at (${centerX(b)}, ${centerZ(b)})`).toBeGreaterThanOrEqual(0.8);
      expect(short, `board at (${centerX(b)}, ${centerZ(b)})`).toBeLessThan(3.5);
    }
  });

  it('registers ramps as non-blocking wedges', () => {
    const { colliders } = build();
    const ramps = colliders.filter((c) => c.kind === 'ramp');
    expect(ramps.length).toBeGreaterThanOrEqual(4);
    for (const r of ramps) {
      expect(r.blocksShots).toBe(false);
      expect(r.blocksSight).toBe(false);
    }
  });
});

describe('city layout — instancing (B8)', () => {
  it('uses InstancedMesh for duplicated props and office elements', () => {
    const { group } = build();
    let instancedCount = 0;
    let totalInstances = 0;
    group.traverse((o) => {
      if (o instanceof THREE.InstancedMesh) {
        instancedCount++;
        totalInstances += o.count;
      }
    });
    expect(instancedCount).toBeGreaterThanOrEqual(15);
    expect(totalInstances).toBeGreaterThanOrEqual(200);
  });
});
