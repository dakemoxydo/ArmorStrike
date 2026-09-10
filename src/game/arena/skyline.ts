// ===== Skyline kit: shared ring placement for decorative out-of-bounds props =====
// Factory / City / Village all ring the playable arena with jittered decorative
// silhouettes. The ring math and the lit-window pattern live here once; each map
// supplies its own size ranges, materials and per-tower extras (stacks, roofs).
import * as THREE from 'three';
import type { ArenaBuildContext } from './context';

/** Jittered polar slot around the origin: index i of count. */
export interface RingSlot {
  x: number;
  z: number;
  r: number;
}

/**
 * `count` evenly-spaced slots on a ring, each nudged by ±angleJitter/2 radians
 * and pushed out to a radius sampled uniformly from [rMin, rMax].
 */
export function ringSlots(
  count: number, angleJitter: number, rMin: number, rMax: number,
): RingSlot[] {
  const out: RingSlot[] = [];
  for (let i = 0; i < count; i++) {
    const ang = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * angleJitter;
    const r = rMin + Math.random() * (rMax - rMin);
    out.push({ x: Math.cos(ang) * r, z: Math.sin(ang) * r, r });
  }
  return out;
}

/** Lit window on a tower face, billboarded toward the arena centre. */
export interface TowerWindowSpec {
  /** Single material, or one cycled by tower index (city neon). */
  material: THREE.Material | THREE.Material[];
  /** Tower is lit when `Math.random() > skip` (probability = 1 - skip). */
  skip: number;
  widthRatio: number;
  heightRatio: number;
  /** Window centre height as a fraction of tower height, sampled from [yMin, yMax]. */
  yMin: number;
  yMax: number;
}

/** Parameters for a decorative ring of box towers. */
export interface TowerRingSpec {
  material: THREE.Material;
  count: number;
  /** Angular jitter full width, radians. */
  angleJitter: number;
  rMin: number;
  rMax: number;
  widthMin: number;
  widthMax: number;
  heightMin: number;
  heightMax: number;
  /** Box depth = width * depthRatio (default 1). */
  depthRatio?: number;
  /** Added to h/2; negative sinks the base slightly (default 0). */
  baseY?: number;
  /** Y rotation sampled uniformly from [0, rotMax] (default Math.PI). */
  rotMax?: number;
  window?: TowerWindowSpec;
  /** Extra geometry per tower (smokestacks, roofs); gets the box, index and w/h. */
  onTower?: (tower: THREE.Mesh, i: number, w: number, h: number) => void;
}

/** Ring of randomly-sized, randomly-rotated boxes with optional lit windows. */
export function buildTowerRing(ctx: ArenaBuildContext, spec: TowerRingSpec): void {
  const {
    material, count, angleJitter, rMin, rMax,
    widthMin, widthMax, heightMin, heightMax,
    depthRatio = 1, baseY = 0, rotMax = Math.PI,
    window: win, onTower,
  } = spec;
  const slots = ringSlots(count, angleJitter, rMin, rMax);
  for (let i = 0; i < count; i++) {
    const { x, z } = slots[i];
    const w = widthMin + Math.random() * (widthMax - widthMin);
    const h = heightMin + Math.random() * (heightMax - heightMin);
    const tower = new THREE.Mesh(new THREE.BoxGeometry(w, h, w * depthRatio), material);
    tower.position.set(x, h / 2 + baseY, z);
    tower.rotation.y = Math.random() * rotMax;
    ctx.group.add(tower);
    onTower?.(tower, i, w, h);
    if (win && Math.random() > win.skip) {
      const mat = Array.isArray(win.material)
        ? win.material[i % win.material.length]
        : win.material;
      const pane = new THREE.Mesh(
        new THREE.PlaneGeometry(w * win.widthRatio, h * win.heightRatio),
        mat,
      );
      pane.position.set(x, h * (win.yMin + Math.random() * (win.yMax - win.yMin)), z);
      pane.lookAt(0, pane.position.y, 0);
      ctx.group.add(pane);
    }
  }
}

// ── Factory skyline (smoggy industrial silhouettes + smokestacks) ────────────

export function buildSkyline(ctx: ArenaBuildContext) {
  const dark = new THREE.MeshStandardMaterial({ color: 0x0a0f16, roughness: 1, emissive: 0x0c141f, emissiveIntensity: 0.35 });
  const winMat = new THREE.MeshBasicMaterial({ color: 0xffa64d });
  const rng = (a: number, b: number) => a + Math.random() * (b - a);
  buildTowerRing(ctx, {
    material: dark,
    count: 26,
    angleJitter: 0.12,
    rMin: 105, rMax: 150,
    widthMin: 10, widthMax: 26,
    heightMin: 8, heightMax: 34,
    baseY: -0.5,
    window: { material: winMat, skip: 0.4, widthRatio: 0.5, heightRatio: 0.12, yMin: 0.3, yMax: 0.7 },
    // Every 5th tower carries a smokestack that feeds the atmosphere emitters.
    onTower: (m, i) => {
      if (i % 5 !== 0) return;
      const th = rng(26, 44);
      const st = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.2, th, 8), dark);
      st.position.set(m.position.x + rng(-10, 10), th / 2, m.position.z + rng(-10, 10));
      ctx.group.add(st);
      ctx.smokeEmitters.push(new THREE.Vector3(st.position.x, th + 1, st.position.z));
    },
  });
  const gz = new THREE.Mesh(new THREE.SphereGeometry(16, 20, 14), dark);
  gz.position.set(-120, 10, -95);
  ctx.group.add(gz);
}
