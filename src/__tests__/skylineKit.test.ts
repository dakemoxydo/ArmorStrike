/**
 * Contract for the shared skyline kit: ring placement + tower ring.
 * Pins the invariants the three maps (factory/city/village) rely on so a future
 * edit to the kit cannot silently reshape every out-of-bounds skyline.
 */
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { buildSkyline, buildTowerRing, ringSlots } from '../game/arena/skyline';
import type { ArenaBuildContext } from '../game/arena/context';

function stubCtx() {
  const group = new THREE.Group();
  const smokeEmitters: THREE.Vector3[] = [];
  return { group, smokeEmitters, ctx: { group, smokeEmitters } as unknown as ArenaBuildContext };
}

const radiusOf = (o: THREE.Object3D) => Math.hypot(o.position.x, o.position.z);
const boxes = (g: THREE.Group) =>
  g.children.filter((c) => (c as THREE.Mesh).geometry instanceof THREE.BoxGeometry) as THREE.Mesh[];

describe('ringSlots', () => {
  it('emits one slot per index with radius inside [rMin, rMax]', () => {
    const slots = ringSlots(40, 0.1, 100, 200);
    expect(slots).toHaveLength(40);
    for (const s of slots) {
      expect(s.r).toBeGreaterThanOrEqual(100);
      expect(s.r).toBeLessThanOrEqual(200);
      expect(Math.hypot(s.x, s.z)).toBeCloseTo(s.r, 6);
    }
  });

  it('keeps azimuth spacing near 2π/count, bounded by the jitter window', () => {
    const count = 24;
    const jitter = 0.12;
    const step = (Math.PI * 2) / count;
    const az = ringSlots(count, jitter, 10, 10)
      .map((s) => Math.atan2(s.z, s.x))
      .sort((a, b) => a - b);
    const deltas = az.map((a, i) => (i === 0 ? a + Math.PI * 2 - az[az.length - 1] : a - az[i - 1]));
    for (const d of deltas) {
      expect(d).toBeGreaterThanOrEqual(step - jitter - 1e-9);
      expect(d).toBeLessThanOrEqual(step + jitter + 1e-9);
    }
  });
});

describe('buildTowerRing', () => {
  it('adds exactly count boxes with depth = width * depthRatio and base at h/2 + baseY', () => {
    const { group, ctx } = stubCtx();
    buildTowerRing(ctx, {
      material: new THREE.MeshBasicMaterial(),
      count: 12,
      angleJitter: 0,
      rMin: 50, rMax: 60,
      widthMin: 8, widthMax: 20,
      heightMin: 10, heightMax: 30,
      depthRatio: 0.7,
      baseY: -0.4,
    });
    const bs = boxes(group);
    expect(bs).toHaveLength(12);
    for (const m of bs) {
      const p = (m.geometry as THREE.BoxGeometry).parameters;
      expect(p.depth).toBeCloseTo(p.width * 0.7, 6);
      expect(m.position.y).toBeCloseTo(p.height / 2 - 0.4, 6);
      expect(radiusOf(m)).toBeGreaterThanOrEqual(50);
      expect(radiusOf(m)).toBeLessThanOrEqual(60);
    }
  });

  it('caps yaw at rotMax', () => {
    const { group, ctx } = stubCtx();
    buildTowerRing(ctx, {
      material: new THREE.MeshBasicMaterial(),
      count: 30,
      angleJitter: 0,
      rMin: 10, rMax: 10,
      widthMin: 2, widthMax: 2,
      heightMin: 2, heightMax: 2,
      rotMax: 0.35,
    });
    for (const m of boxes(group)) {
      expect(m.rotation.y).toBeGreaterThanOrEqual(0);
      expect(m.rotation.y).toBeLessThanOrEqual(0.35);
    }
  });

  it('lights every tower when skip < 0 and none when skip > 1', () => {
    const mk = (skip: number) => {
      const { group, ctx } = stubCtx();
      buildTowerRing(ctx, {
        material: new THREE.MeshBasicMaterial(),
        count: 15,
        angleJitter: 0,
        rMin: 10, rMax: 10,
        widthMin: 4, widthMax: 4,
        heightMin: 8, heightMax: 8,
        window: { material: new THREE.MeshBasicMaterial(), skip, widthRatio: 0.5, heightRatio: 0.1, yMin: 0.3, yMax: 0.7 },
      });
      return group.children.filter((c) => (c as THREE.Mesh).geometry instanceof THREE.PlaneGeometry);
    };
    expect(mk(-1)).toHaveLength(15);
    expect(mk(2)).toHaveLength(0);
  });

  it('cycles an array of window materials by tower index', () => {
    const { group, ctx } = stubCtx();
    const mats = [
      new THREE.MeshBasicMaterial({ color: 0xff0000 }),
      new THREE.MeshBasicMaterial({ color: 0x00ff00 }),
      new THREE.MeshBasicMaterial({ color: 0x0000ff }),
    ];
    buildTowerRing(ctx, {
      material: new THREE.MeshBasicMaterial(),
      count: 9,
      angleJitter: 0,
      rMin: 10, rMax: 10,
      widthMin: 4, widthMax: 4,
      heightMin: 8, heightMax: 8,
      window: { material: mats, skip: -1, widthRatio: 0.5, heightRatio: 0.1, yMin: 0.5, yMax: 0.5 },
    });
    const panes = group.children.filter(
      (c) => (c as THREE.Mesh).geometry instanceof THREE.PlaneGeometry,
    ) as THREE.Mesh[];
    expect(panes).toHaveLength(9);
    panes.forEach((p, i) => expect(p.material).toBe(mats[i % mats.length]));
  });

  it('hands onTower the sampled width/height for that tower', () => {
    const { ctx } = stubCtx();
    const seen: Array<[number, number]> = [];
    buildTowerRing(ctx, {
      material: new THREE.MeshBasicMaterial(),
      count: 6,
      angleJitter: 0,
      rMin: 10, rMax: 10,
      widthMin: 5, widthMax: 5,
      heightMin: 9, heightMax: 9,
      onTower: (_m, _i, w, h) => seen.push([w, h]),
    });
    expect(seen).toHaveLength(6);
    for (const [w, h] of seen) {
      expect(w).toBeCloseTo(5, 6);
      expect(h).toBeCloseTo(9, 6);
    }
  });
});

describe('factory buildSkyline', () => {
  it('rings 34 towers in [172,244] with 7 smokestack emitters and one distant sphere', () => {
    const { group, smokeEmitters, ctx } = stubCtx();
    buildSkyline(ctx);
    const towers = boxes(group);
    expect(towers).toHaveLength(34);
    for (const t of towers) {
      expect(radiusOf(t)).toBeGreaterThanOrEqual(172);
      expect(radiusOf(t)).toBeLessThanOrEqual(244);
      // Decorative silhouettes must stay outside the playable box (half = 150):
      // factory content fills the whole arena, so an in-box ring would sit on gameplay.
      expect(radiusOf(t)).toBeGreaterThan(150);
    }
    const spheres = group.children.filter(
      (c) => (c as THREE.Mesh).geometry instanceof THREE.SphereGeometry,
    );
    expect(spheres).toHaveLength(1);
    // one smokestack every 5th tower (i = 0,5,10,15,20,25,30)
    expect(smokeEmitters).toHaveLength(7);
    for (const e of smokeEmitters) {
      expect(Math.hypot(e.x, e.z)).toBeGreaterThan(150);
    }
  });
});
