// ===== Карта City: grid-авеню, 4 квартала-districts, плаза, short overpass =====
// Arena half = 150 (ARENA.size 300). Layout graph:
//   N–S main avenue : x ∈ [−14, 14]        (primary fire lane, no solid blocks)
//   E–W main avenue : z ∈ [−14, 14]        (primary fire lane, no solid blocks)
//   Secondary ring  : |x|≈56, |z|≈56        (secondary lanes, low channels)
//   Outer ring      : |x|,|z|≈104–120       (spawn-adjacent corridor)
//   Plaza core      : |x|,|z| < 24           (monument + soft planter ring)
//   Districts       : NE parking/mall · NW construction · SW neon-market · SE residential
//   Overpass        : EW deck z≈−80, solid pillars only, approach ramps
// Cover hierarchy: hard (offices/shops/pillars) · medium (jersey/kiosk) · soft (cars/planters/hay) · non-LOS (billboards/lamps/ramps)
import * as THREE from 'three';
import { ARENA } from '../constants';
import { colliderFromCenter } from '../engine/physics';
import { containerTexture, crateTexture, hexTexture } from '../textures';
import type { ArenaBuildContext } from './context';

/** City-themed interior: orthogonal grid, district accents, neon night. */
export function buildCityContent(ctx: ArenaBuildContext) {
  buildCitySkyline(ctx);
  buildCityPlaza(ctx);
  buildCityBlocks(ctx);
  buildCityDistricts(ctx);
  buildCityOverpass(ctx);
  buildCityStreetProps(ctx);
  buildCityRamps(ctx);
  buildCityAtmosphere(ctx);
}

// ── materials ──────────────────────────────────────────────────────────────

function concrete(color = 0x8a96a8) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.25 });
}

function glass(color = 0x1a4060) {
  return new THREE.MeshStandardMaterial({
    color, roughness: 0.2, metalness: 0.7, emissive: color, emissiveIntensity: 0.15,
  });
}

const NEON = {
  cyan: 0x5ec8ff,
  magenta: 0xff4d9a,
  lime: 0x7cff6b,
} as const;

// ── primitives ─────────────────────────────────────────────────────────────

type RoofKind = 'ac' | 'neon' | 'tank';

function office(
  ctx: ArenaBuildContext,
  x: number, z: number,
  w: number, d: number, h: number,
  accent: number = NEON.cyan,
  roof: RoofKind = 'ac',
  style: 'bands' | 'grid' | 'fins' = 'bands',
) {
  const body = concrete(0x7a889c);
  const win = glass(accent);
  ctx.addColliderBlock(x, z, w, d, h, false, () => {
    const g = new THREE.Group();
    g.add(ctx.box(w, h, d, body));

    if (style === 'bands') {
      const bands = Math.max(2, Math.floor(h / 3));
      for (let i = 1; i < bands; i++) {
        const y = (i / bands) * h;
        const band = new THREE.Mesh(
          new THREE.BoxGeometry(w * 0.92, 0.65, d * 0.92),
          win,
        );
        band.position.y = y;
        g.add(band);
      }
    } else if (style === 'grid') {
      const rows = Math.max(2, Math.floor(h / 2.4));
      const cols = Math.max(2, Math.floor(w / 2.8));
      for (let r = 1; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const wx = (c / (cols - 1) - 0.5) * w * 0.72;
          const wy = (r / rows) * h;
          const pane = new THREE.Mesh(
            new THREE.BoxGeometry(1.1, 0.9, d * 0.94),
            win,
          );
          pane.position.set(wx, wy, 0);
          g.add(pane);
        }
      }
    } else {
      // vertical fins
      const n = Math.max(3, Math.floor(w / 2.2));
      const finMat = concrete(0x5a6678);
      for (let i = 0; i < n; i++) {
        const fx = (i / (n - 1) - 0.5) * w * 0.85;
        const fin = new THREE.Mesh(
          new THREE.BoxGeometry(0.35, h * 0.92, d * 0.98),
          finMat,
        );
        fin.position.set(fx, h * 0.46, 0);
        g.add(fin);
      }
      const mid = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.7, h * 0.55, d * 0.88),
        win,
      );
      mid.position.y = h * 0.45;
      g.add(mid);
    }

    if (roof === 'ac') {
      const ac = ctx.box(w * 0.35, 1.2, d * 0.3, concrete(0x555e6a));
      ac.position.set(0, h + 0.6, 0);
      g.add(ac);
    } else if (roof === 'neon') {
      const plate = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.55, 1.0, 0.35),
        new THREE.MeshBasicMaterial({ color: accent }),
      );
      plate.position.set(0, h + 0.7, d * 0.35);
      g.add(plate);
    } else {
      const tank = new THREE.Mesh(
        new THREE.CylinderGeometry(1.1, 1.1, 1.6, 10),
        concrete(0x667080),
      );
      tank.position.set(w * 0.15, h + 0.8, 0);
      g.add(tank);
    }
    return g;
  }, 0, 'wall');
}

function shop(
  ctx: ArenaBuildContext,
  x: number, z: number,
  w: number, d: number,
  neonColor: number = NEON.magenta,
  faceSignZ = 1,
) {
  const body = concrete(0x6a7080);
  const neon = new THREE.MeshBasicMaterial({ color: neonColor });
  ctx.addColliderBlock(x, z, w, d, 4.6, false, () => {
    const g = new THREE.Group();
    g.add(ctx.box(w, 4.6, d, body));
    // podium ledge
    const ledge = ctx.box(w * 1.04, 0.35, d * 1.04, concrete(0x555e6e));
    ledge.position.y = 0.15;
    g.add(ledge);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(w * 0.88, 0.38, 0.22), neon);
    strip.position.set(0, 4.0, (d / 2 + 0.08) * faceSignZ);
    g.add(strip);
    return g;
  }, 0, 'wall');
}

function car(
  ctx: ArenaBuildContext,
  x: number, z: number,
  yaw: number,
  col: number,
  variant: 'sedan' | 'van' | 'taxi' = 'sedan',
) {
  const body = new THREE.MeshStandardMaterial({ color: col, roughness: 0.4, metalness: 0.6 });
  const isVan = variant === 'van';
  const w = isVan ? 5.2 : 4.0;
  const d = isVan ? 2.4 : 1.9;
  const h = isVan ? 2.2 : 1.55;
  // AABB padded for yaw; mesh rotates, collider stays axis-aligned (same as factory cars).
  const colW = Math.abs(Math.cos(yaw)) * w + Math.abs(Math.sin(yaw)) * d + 0.3;
  const colD = Math.abs(Math.sin(yaw)) * w + Math.abs(Math.cos(yaw)) * d + 0.3;
  ctx.addColliderBlock(x, z, colW, colD, h, true, () => {
    const g = new THREE.Group();
    const hull = ctx.box(w, isVan ? 1.3 : 0.95, d, body);
    hull.rotation.y = yaw;
    g.add(hull);
    const cabin = ctx.box(
      isVan ? w * 0.7 : 2.0,
      isVan ? 0.95 : 0.7,
      d * 0.9,
      glass(0x1a3048),
    );
    cabin.position.y = isVan ? 1.15 : 0.85;
    cabin.rotation.y = yaw;
    g.add(cabin);
    if (variant === 'taxi') {
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.95, 0.12, d * 1.02),
        new THREE.MeshBasicMaterial({ color: 0xffcc33 }),
      );
      stripe.position.y = 0.55;
      stripe.rotation.y = yaw;
      g.add(stripe);
    }
    return g;
  }, 80);
}

function planter(ctx: ArenaBuildContext, x: number, z: number, bushColor = 0x2a5a30) {
  ctx.addColliderBlock(x, z, 3.0, 3.0, 1.35, true, () => {
    const g = new THREE.Group();
    g.add(ctx.box(3.0, 0.95, 3.0, concrete(0x555e6a)));
    const bush = new THREE.Mesh(
      new THREE.SphereGeometry(1.0, 8, 6),
      new THREE.MeshStandardMaterial({ color: bushColor, roughness: 0.95 }),
    );
    bush.position.y = 1.5;
    g.add(bush);
    return g;
  }, 55);
}

function jersey(ctx: ArenaBuildContext, x: number, z: number, w: number, d: number, destructible = true) {
  const mat = concrete(0xc8c4b0);
  ctx.addColliderBlock(x, z, w, d, 1.5, destructible, () => {
    const g = new THREE.Group();
    g.add(ctx.box(w, 1.35, d, mat));
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.92, 0.2, d * 0.92),
      new THREE.MeshBasicMaterial({ color: 0xff8a1a }),
    );
    stripe.position.y = 1.1;
    g.add(stripe);
    return g;
  }, destructible ? 95 : 0, 'block');
}

/** Linear jersey row helper — spawn N barriers along an axis (soft peek line). */
function jerseyLine(
  ctx: ArenaBuildContext,
  x0: number, z0: number, count: number, step: number, alongX: boolean,
) {
  for (let i = 0; i < count; i++) {
    const x = alongX ? x0 + i * step : x0;
    const z = alongX ? z0 : z0 + i * step;
    if (alongX) jersey(ctx, x, z, step * 0.82, 1.4, true);
    else jersey(ctx, x, z, 1.4, step * 0.82, true);
  }
}

function kiosk(ctx: ArenaBuildContext, x: number, z: number, neonColor: number = NEON.magenta) {
  ctx.addColliderBlock(x, z, 3.6, 3.6, 3.0, true, () => {
    const g = new THREE.Group();
    g.add(ctx.box(3.4, 2.5, 3.4, concrete(0x5a6270)));
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(3.8, 0.28, 3.8),
      new THREE.MeshBasicMaterial({ color: neonColor }),
    );
    roof.position.y = 2.65;
    g.add(roof);
    return g;
  }, 70);
}

function dumpster(ctx: ArenaBuildContext, x: number, z: number, yaw = 0) {
  const mat = new THREE.MeshStandardMaterial({ color: 0x3a6a40, roughness: 0.55, metalness: 0.45 });
  ctx.addColliderBlock(x, z, 3.4, 2.0, 1.7, true, () => {
    const g = new THREE.Group();
    const body = ctx.box(3.2, 1.5, 1.8, mat);
    body.rotation.y = yaw;
    g.add(body);
    const lid = ctx.box(3.25, 0.15, 1.85, concrete(0x2a4030));
    lid.position.y = 0.85;
    lid.rotation.y = yaw;
    g.add(lid);
    return g;
  }, 65);
}

function deliveryCrate(ctx: ArenaBuildContext, x: number, z: number, w: number, d: number, h: number) {
  const steel = crateTexture('#5ec8ff');
  const mat = new THREE.MeshStandardMaterial({
    map: steel, roughness: 0.5, metalness: 0.45, color: 0x90b4cc,
  });
  ctx.addColliderBlock(x, z, w, d, h, true, () => {
    const g = new THREE.Group();
    g.add(ctx.box(w, h, d, mat));
    const edge = new THREE.Mesh(
      new THREE.BoxGeometry(w * 1.01, 0.08, d * 1.01),
      new THREE.MeshBasicMaterial({ color: NEON.cyan, transparent: true, opacity: 0.45 }),
    );
    edge.position.y = h - 0.04;
    g.add(edge);
    return g;
  }, h > 3 ? 140 : 85);
}

function billboard(
  ctx: ArenaBuildContext,
  x: number, z: number,
  yaw: number,
  color: number,
) {
  ctx.addColliderBlock(x, z, 0.7, 5.5, 5, false, () => {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.25, 4.5, 8),
      concrete(0x444a55),
    );
    pole.position.y = 2.25;
    g.add(pole);
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(5.5, 2.8, 0.25),
      new THREE.MeshStandardMaterial({
        color, roughness: 0.4, metalness: 0.3, emissive: color, emissiveIntensity: 0.4,
      }),
    );
    board.position.y = 4.8;
    board.rotation.y = yaw;
    g.add(board);
    return g;
  }, 0, 'block', false);
}

function busStop(ctx: ArenaBuildContext, x: number, z: number, alongX = true) {
  const w = alongX ? 5.5 : 2.2;
  const d = alongX ? 2.2 : 5.5;
  ctx.addColliderBlock(x, z, w, d, 3.2, false, () => {
    const g = new THREE.Group();
    const posts = concrete(0x445060);
    for (const s of [-2.2, 2.2]) {
      const p = ctx.box(0.25, 3.0, 0.25, posts);
      p.position.set(alongX ? s : 0, 1.5, alongX ? 0 : s);
      g.add(p);
    }
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(alongX ? 5.2 : 2.0, 0.2, alongX ? 2.0 : 5.2),
      new THREE.MeshBasicMaterial({ color: NEON.cyan }),
    );
    roof.position.y = 3.05;
    g.add(roof);
    const bench = ctx.box(alongX ? 4.0 : 0.7, 0.45, alongX ? 0.7 : 4.0, concrete(0x556070));
    bench.position.set(0, 0.5, alongX ? 0.3 : 0);
    g.add(bench);
    return g;
  }, 0, 'block');
}

// ── skyline (decorative, outside playable ring) ────────────────────────────

function buildCitySkyline(ctx: ArenaBuildContext) {
  const dark = new THREE.MeshStandardMaterial({
    color: 0x0a1018, roughness: 1, emissive: 0x0a1828, emissiveIntensity: 0.4,
  });
  const neon = [
    new THREE.MeshBasicMaterial({ color: NEON.cyan }),
    new THREE.MeshBasicMaterial({ color: NEON.magenta }),
    new THREE.MeshBasicMaterial({ color: NEON.lime }),
  ];
  // Denser neon towers ringing the 300-arena wall.
  for (let i = 0; i < 60; i++) {
    const ang = (i / 60) * Math.PI * 2 + (Math.random() - 0.5) * 0.04;
    const r = 172 + Math.random() * 72;
    const w = 14 + Math.random() * 34;
    const h = 24 + Math.random() * 78;
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, w * 0.85), dark);
    m.position.set(Math.cos(ang) * r, h / 2 - 0.3, Math.sin(ang) * r);
    m.rotation.y = Math.random() * 0.35;
    ctx.group.add(m);
    if (Math.random() > 0.24) {
      const win = new THREE.Mesh(
        new THREE.PlaneGeometry(w * 0.55, h * 0.07),
        neon[i % neon.length],
      );
      win.position.set(m.position.x, h * (0.3 + Math.random() * 0.4), m.position.z);
      win.lookAt(0, win.position.y, 0);
      ctx.group.add(win);
    }
  }
}

// ── plaza ──────────────────────────────────────────────────────────────────

function buildCityPlaza(ctx: ArenaBuildContext) {
  // civic monument / fountain base (scaled ~1.7× for the bigger arena)
  ctx.addColliderBlock(0, 0, 15, 15, 9.5, false, () => {
    const g = new THREE.Group();
    const base = concrete(0x6a7588);
    g.add(ctx.box(15, 1.4, 15, base));
    // fountain ring (visual, low)
    const basin = new THREE.Mesh(
      new THREE.TorusGeometry(5.6, 0.5, 8, 30),
      concrete(0x708090),
    );
    basin.rotation.x = Math.PI / 2;
    basin.position.y = 1.45;
    g.add(basin);
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(1.9, 2.4, 7.2, 12),
      concrete(0x90a0b4),
    );
    pillar.position.y = 5.2;
    pillar.castShadow = true;
    g.add(pillar);
    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(4.6, 0.7, 4.6),
      new THREE.MeshStandardMaterial({
        color: NEON.cyan, roughness: 0.3, metalness: 0.8,
        emissive: 0x1a4060, emissiveIntensity: 0.65,
      }),
    );
    cap.position.y = 9.1;
    g.add(cap);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(3.0, 0.16, 8, 26),
      new THREE.MeshBasicMaterial({ color: NEON.cyan }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 8.1;
    g.add(ring);
    ctx.setObelisk(cap, ring);
    return g;
  }, 0, 'wall');

  // soft ring — planters around the plaza (peek cover, not sealed)
  const ring: [number, number][] = [
    [20, 20], [-20, 20], [20, -20], [-20, -20],
    [26, 0], [-26, 0], [0, 26], [0, -26],
    [18, 9], [-18, 9], [18, -9], [-18, -9],
  ];
  for (const [x, z] of ring) planter(ctx, x, z);

  // low hard cover on plaza approaches (peek points, avenues stay clear)
  jersey(ctx, 0, 32, 10, 1.6, false);
  jersey(ctx, 0, -32, 10, 1.6, false);
  jersey(ctx, 32, 0, 1.6, 10, false);
  jersey(ctx, -32, 0, 1.6, 10, false);
}

// ── grid blocks (per quadrant, avenues clear) ──────────────────────────────
// Main avenues clear: |x| < 14, |z| < 14. Secondary corridors ~|x|,|z|≈56.

function buildCityBlocks(ctx: ArenaBuildContext) {
  // ── NE (+x, +z): Parking-facing mall towers ──
  office(ctx, 34, 34, 18, 18, 15, NEON.cyan, 'ac', 'bands');
  office(ctx, 34, 92, 22, 18, 20, NEON.lime, 'neon', 'grid');
  office(ctx, 92, 34, 18, 22, 17, NEON.cyan, 'ac', 'fins');
  office(ctx, 92, 92, 22, 22, 24, NEON.magenta, 'neon', 'bands');
  shop(ctx, 34, 20, 18, 8, NEON.cyan, -1);
  shop(ctx, 20, 34, 8, 18, NEON.cyan, 1);

  // ── NW (−x, +z): Construction / mid-rise ──
  office(ctx, -34, 34, 18, 18, 14, NEON.magenta, 'tank', 'fins');
  office(ctx, -34, 92, 22, 18, 19, NEON.cyan, 'ac', 'bands');
  office(ctx, -92, 34, 18, 22, 17, NEON.lime, 'neon', 'grid');
  office(ctx, -92, 92, 22, 22, 23, NEON.magenta, 'tank', 'bands');
  shop(ctx, -34, 20, 18, 8, NEON.magenta, -1);
  shop(ctx, -20, 34, 8, 18, NEON.magenta, 1);

  // ── SE (+x, −z): Residential lower ──
  office(ctx, 34, -34, 18, 18, 12, NEON.lime, 'ac', 'grid');
  office(ctx, 34, -92, 22, 18, 15, NEON.cyan, 'tank', 'bands');
  office(ctx, 92, -34, 18, 22, 13, NEON.lime, 'ac', 'fins');
  office(ctx, 92, -92, 22, 22, 18, NEON.cyan, 'neon', 'bands');
  shop(ctx, 34, -20, 18, 8, NEON.lime, 1);
  shop(ctx, 20, -34, 8, 18, NEON.lime, 1);

  // ── SW (−x, −z): Neon market mid-rises ──
  office(ctx, -34, -34, 18, 18, 15, NEON.magenta, 'neon', 'bands');
  office(ctx, -34, -92, 22, 18, 20, NEON.magenta, 'neon', 'grid');
  office(ctx, -92, -34, 18, 22, 17, NEON.cyan, 'ac', 'fins');
  office(ctx, -92, -92, 22, 22, 24, NEON.lime, 'neon', 'bands');
  shop(ctx, -34, -20, 18, 8, NEON.magenta, 1);
  shop(ctx, -20, -34, 8, 18, NEON.magenta, 1);

  // mid-ring solid channels at secondary cross (guide fire without sealing)
  const bar = concrete(0x555e6e);
  ctx.addColliderBlock(56, 24, 3.2, 10, 3.2, false, () => ctx.box(3.2, 3.2, 10, bar.clone()), 0, 'block');
  ctx.addColliderBlock(-56, -24, 3.2, 10, 3.2, false, () => ctx.box(3.2, 3.2, 10, bar.clone()), 0, 'block');
  ctx.addColliderBlock(24, -56, 10, 3.2, 3.2, false, () => ctx.box(10, 3.2, 3.2, bar.clone()), 0, 'block');
  ctx.addColliderBlock(-24, 56, 10, 3.2, 3.2, false, () => ctx.box(10, 3.2, 3.2, bar.clone()), 0, 'block');
}

// ── district soft cover ────────────────────────────────────────────────────

function buildCityDistricts(ctx: ArenaBuildContext) {
  const carCols = [0x2a4060, 0x602a2a, 0x2a5030, 0x404050, 0x503020, 0x1a1a2a];

  // NE — Parking lot (dense soft car rows + lot walls)
  const lotCars: [number, number, number, 'sedan' | 'van' | 'taxi'][] = [
    [72, 62, 0, 'sedan'], [72, 68, 0, 'taxi'], [72, 74, 0, 'sedan'], [72, 80, 0, 'van'],
    [104, 54, Math.PI, 'van'], [104, 62, Math.PI, 'sedan'], [104, 70, Math.PI, 'taxi'], [104, 78, Math.PI, 'sedan'],
    [82, 104, Math.PI / 2, 'sedan'], [90, 104, Math.PI / 2, 'van'], [98, 104, Math.PI / 2, 'taxi'],
  ];
  lotCars.forEach(([x, z, yaw, v], i) => car(ctx, x, z, yaw, carCols[i % carCols.length], v));
  jersey(ctx, 72, 108, 28, 1.6, false);
  jersey(ctx, 108, 72, 1.6, 28, false);
  kiosk(ctx, 62, 54, NEON.cyan); // ticket booth

  // NW — Construction (jersey grids + crate stacks + scaffold)
  jerseyLine(ctx, -72, 72, 4, 10, true);
  jerseyLine(ctx, -72, 82, 4, 10, false);
  deliveryCrate(ctx, -80, 104, 9, 7, 4.4);
  deliveryCrate(ctx, -104, 80, 7, 9, 4.8);
  deliveryCrate(ctx, -64, 84, 7, 7, 4.0);
  ctx.addColliderBlock(-108, 108, 16, 5, 10.5, false, () => {
    const g = new THREE.Group();
    const steel = concrete(0x8899aa);
    for (const sx of [-6, 6]) {
      for (const sz of [-1.6, 1.6]) {
        const p = ctx.box(0.5, 10.5, 0.5, steel);
        p.position.set(sx, 5.25, sz);
        g.add(p);
      }
    }
    const beam = ctx.box(14, 0.5, 4.4, steel);
    beam.position.y = 10.0;
    g.add(beam);
    return g;
  }, 0, 'block');

  // SW — Neon market (kiosks + dumpsters + magenta billboards)
  kiosk(ctx, -48, -48, NEON.magenta);
  kiosk(ctx, -64, -44, NEON.lime);
  kiosk(ctx, -44, -68, NEON.cyan);
  dumpster(ctx, -76, -56, 0.2);
  dumpster(ctx, -56, -80, Math.PI / 2);
  dumpster(ctx, -88, -72, -0.3);
  deliveryCrate(ctx, -104, -56, 8, 7, 4.4);
  car(ctx, -72, -104, Math.PI / 2, 0x2a4060, 'taxi');
  car(ctx, -84, -104, Math.PI / 2, 0x503020, 'sedan');
  billboard(ctx, -56, -28, 0.4, NEON.magenta);
  billboard(ctx, -28, -60, -0.5, NEON.lime);

  // SE — Residential (planter clusters + bus stops + parked cars)
  planter(ctx, 48, -48, 0x3a6a38);
  planter(ctx, 64, -48, 0x2a5a30);
  planter(ctx, 48, -64, 0x355a32);
  planter(ctx, 72, -72, 0x2a5a30);
  planter(ctx, 104, -48, 0x3a6a38);
  planter(ctx, 48, -104, 0x2a5a30);
  busStop(ctx, 72, -20, true);
  busStop(ctx, 20, -72, false);
  car(ctx, 104, -72, Math.PI, 0x404050, 'sedan');
  car(ctx, 104, -84, Math.PI, 0x2a5030, 'van');

  // mid-ring soft along secondary corridors (linear, not only corners)
  car(ctx, 56, -16, 0.1, 0x2a4060, 'sedan');
  car(ctx, -56, 16, Math.PI + 0.1, 0x602a2a, 'taxi');
  car(ctx, 16, 56, Math.PI / 2, 0x404050, 'sedan');
  car(ctx, -16, -56, -Math.PI / 2, 0x503020, 'van');
  jerseyLine(ctx, 56, -6, 3, 6, false);
  jerseyLine(ctx, -56, -6, 3, 6, false);
  jerseyLine(ctx, -6, 56, 3, 6, true);
  jerseyLine(ctx, -6, -56, 3, 6, true);

  // outer loading-dock container stacks (city-not-factory, hard flank anchors)
  const ctex = containerTexture('#2a6a9a', 'CITY', '#1a3a5a');
  const mat = new THREE.MeshStandardMaterial({
    map: ctex, roughness: 0.55, metalness: 0.45, color: 0x8ab4d0,
  });
  const dock = (dx: number, dz: number, yaw: number) => {
    ctx.addColliderBlock(dx, dz, 11, 4.6, 9.4, false, () => {
      const g = new THREE.Group();
      const low = ctx.box(11, 4.6, 4.6, mat);
      low.position.y = 2.3;
      low.rotation.y = yaw;
      g.add(low);
      const up = ctx.box(11, 4.6, 4.6, mat);
      up.position.y = 6.9;
      up.rotation.y = yaw + 0.06;
      g.add(up);
      return g;
    }, 0, 'block');
  };
  dock(116, -104, 0);
  dock(-116, 104, Math.PI / 2);

  // edge billboards (each cardinal wall)
  billboard(ctx, 0, 116, 0, NEON.cyan);
  billboard(ctx, 0, -116, Math.PI, NEON.magenta);
  billboard(ctx, 116, 0, Math.PI / 2, NEON.lime);
  billboard(ctx, -116, 0, -Math.PI / 2, NEON.cyan);
}

// ── short overpass (EW spine south of center) ──────────────────────────────

function buildCityOverpass(ctx: ArenaBuildContext) {
  const z = -80;
  const pillarH = 8.4;
  const deckY = 9.6;
  const pillarMat = concrete(0x5a6575);
  const deckMat = new THREE.MeshStandardMaterial({
    color: 0x3a4454, roughness: 0.65, metalness: 0.35,
    emissive: 0x0a1520, emissiveIntensity: 0.25,
  });
  const railMat = new THREE.MeshBasicMaterial({ color: NEON.cyan });

  // pillars — solid hard cover under the span
  for (const px of [-64, -24, 24, 64]) {
    ctx.addColliderBlock(px, z, 4.4, 4.4, pillarH, false, () => {
      const g = new THREE.Group();
      g.add(ctx.box(4.2, pillarH, 4.2, pillarMat));
      const cap = ctx.box(5.0, 0.5, 5.0, concrete(0x4a5565));
      cap.position.y = pillarH + 0.2;
      g.add(cap);
      return g;
    }, 0, 'wall');
  }

  // deck + rails — visual only (tanks pass under; no shot-block slab)
  const deck = new THREE.Mesh(new THREE.BoxGeometry(148, 1.0, 12), deckMat);
  deck.position.set(0, deckY, z);
  deck.castShadow = true;
  deck.receiveShadow = true;
  ctx.group.add(deck);

  for (const side of [-5.4, 5.4]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(148, 0.5, 0.35), railMat);
    rail.position.set(0, deckY + 1.0, z + side);
    ctx.group.add(rail);
  }

  // neon under-glow strip
  const glow = new THREE.Mesh(
    new THREE.BoxGeometry(144, 0.2, 0.6),
    new THREE.MeshBasicMaterial({ color: NEON.magenta }),
  );
  glow.position.set(0, deckY - 0.65, z);
  ctx.group.add(glow);

  // approach ramps at ends (blocksShots false)
  addCityRamp(ctx, -80, z + 16, Math.PI * 0.15);
  addCityRamp(ctx, 80, z + 16, -Math.PI * 0.15);
  addCityRamp(ctx, -80, z - 16, Math.PI * 0.85);
  addCityRamp(ctx, 80, z - 16, -Math.PI * 0.85);
}

// ── street lamps ───────────────────────────────────────────────────────────

function buildCityStreetProps(ctx: ArenaBuildContext) {
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x333a44, roughness: 0.5, metalness: 0.6 });
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xaaccff });
  const lamp = (x: number, z: number) => {
    ctx.addColliderBlock(x, z, 0.8, 0.8, 5.5, false, () => {
      const g = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 5.2, 8), poleMat);
      pole.position.y = 2.6;
      g.add(pole);
      const head = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.25, 0.5), lampMat);
      head.position.y = 5.3;
      g.add(head);
      return g;
    }, 0, 'block', false);
  };

  const edge = 124;
  for (const p of [-100, -60, -20, 20, 60, 100]) {
    lamp(p, -edge);
    lamp(p, edge);
    lamp(-edge, p);
    lamp(edge, p);
  }
  // intersection lamps at main × secondary
  for (const s of [1, -1]) {
    lamp(s * 16, s * 16);
    lamp(s * 16, -s * 16);
    lamp(s * 56, 16);
    lamp(s * 56, -16);
    lamp(16, s * 56);
    lamp(-16, s * 56);
  }

  // traffic light poles at main cross
  const tl = (x: number, z: number) => {
    ctx.addColliderBlock(x, z, 0.7, 0.7, 4.5, false, () => {
      const g = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 4.2, 8), poleMat);
      pole.position.y = 2.1;
      g.add(pole);
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(0.45, 1.1, 0.35),
        concrete(0x222830),
      );
      box.position.y = 4.0;
      g.add(box);
      for (const [cy, col] of [[0.35, 0xff3344], [0, 0xffcc22], [-0.35, 0x33ff66]] as const) {
        const lens = new THREE.Mesh(
          new THREE.CircleGeometry(0.12, 8),
          new THREE.MeshBasicMaterial({ color: col }),
        );
        lens.position.set(0, 4.0 + cy, 0.2);
        g.add(lens);
      }
      return g;
    }, 0, 'block', false);
  };
  tl(16, 16);
  tl(-16, 16);
  tl(16, -16);
  tl(-16, -16);
}

// ── city ramps (not shared factory positions) ──────────────────────────────

function addCityRamp(ctx: ArenaBuildContext, x: number, z: number, yaw: number) {
  const rampMat = new THREE.MeshStandardMaterial({
    color: 0x2a3648, roughness: 0.55, metalness: 0.5,
    emissive: 0x0c2033, emissiveIntensity: 0.45,
  });
  const wdt = 5, len = 4.6, hgt = 1.35;
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(len, 0);
  shape.lineTo(len, hgt);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: wdt, bevelEnabled: false });
  geo.translate(-len / 2, 0, -wdt / 2);
  const mesh = new THREE.Mesh(geo, rampMat.clone());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = yaw;
  g.add(mesh);
  ctx.group.add(g);
  const c = Math.abs(Math.cos(yaw));
  const s = Math.abs(Math.sin(yaw));
  const fw = len * c + wdt * s;
  const fd = len * s + wdt * c;
  ctx.colliders.push(colliderFromCenter(x, z, fw, fd, hgt, 'ramp', {
    blocksShots: false,
    blocksSight: false,
  }));
}

function buildCityRamps(ctx: ArenaBuildContext) {
  // parking / approach ramps — keep main cross free
  addCityRamp(ctx, 68, 68, Math.PI * 0.75);
  addCityRamp(ctx, -68, 68, -Math.PI * 0.75);
  addCityRamp(ctx, 68, -68, Math.PI * 0.25);
  addCityRamp(ctx, -68, -68, -Math.PI * 0.25);
  // outer approach
  addCityRamp(ctx, 0, 100, Math.PI);
  addCityRamp(ctx, 0, -108, 0);
  addCityRamp(ctx, 104, 0, Math.PI / 2);
  addCityRamp(ctx, -104, 0, -Math.PI / 2);
}

// ── atmosphere ─────────────────────────────────────────────────────────────

function buildCityAtmosphere(ctx: ArenaBuildContext) {
  const domeGeo = new THREE.CylinderGeometry(ctx.half + 6, ctx.half + 6, 80, 48, 1, true);
  const domeMat = new THREE.MeshBasicMaterial({
    map: hexTexture(),
    transparent: true,
    opacity: 0.04,
    side: THREE.BackSide,
    depthWrite: false,
    color: 0x3a80b0,
    blending: THREE.AdditiveBlending,
  });
  const dome = new THREE.Mesh(domeGeo, domeMat);
  dome.position.y = 34;
  ctx.group.add(dome);
  ctx.setDome(dome);

  const N = 560;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - 0.5) * ARENA.size;
    pos[i * 3 + 1] = 0.4 + Math.random() * 12;
    pos[i * 3 + 2] = (Math.random() - 0.5) * ARENA.size;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color: 0x6ad0ff,
    size: 0.14,
    transparent: true,
    opacity: 0.42,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const dust = new THREE.Points(geo, mat);
  ctx.group.add(dust);
  ctx.setDust(dust);
}
