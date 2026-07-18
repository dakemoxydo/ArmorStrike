// ===== Карта City: grid-авеню, 4 квартала-districts, плаза, short overpass =====
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
  ctx.addColliderBlock(x, z, w, d, 4.0, false, () => {
    const g = new THREE.Group();
    g.add(ctx.box(w, 4.0, d, body));
    // podium ledge
    const ledge = ctx.box(w * 1.04, 0.35, d * 1.04, concrete(0x555e6e));
    ledge.position.y = 0.15;
    g.add(ledge);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(w * 0.88, 0.38, 0.22), neon);
    strip.position.set(0, 3.5, (d / 2 + 0.08) * faceSignZ);
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

function kiosk(ctx: ArenaBuildContext, x: number, z: number, neonColor: number = NEON.magenta) {
  ctx.addColliderBlock(x, z, 3.2, 3.2, 2.6, true, () => {
    const g = new THREE.Group();
    g.add(ctx.box(3.0, 2.2, 3.0, concrete(0x5a6270)));
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(3.4, 0.25, 3.4),
      new THREE.MeshBasicMaterial({ color: neonColor }),
    );
    roof.position.y = 2.35;
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

// ── skyline (decorative, outside playable) ─────────────────────────────────

function buildCitySkyline(ctx: ArenaBuildContext) {
  const dark = new THREE.MeshStandardMaterial({
    color: 0x0a1018, roughness: 1, emissive: 0x0a1828, emissiveIntensity: 0.4,
  });
  const neon = [
    new THREE.MeshBasicMaterial({ color: NEON.cyan }),
    new THREE.MeshBasicMaterial({ color: NEON.magenta }),
    new THREE.MeshBasicMaterial({ color: NEON.lime }),
  ];
  for (let i = 0; i < 36; i++) {
    const ang = (i / 36) * Math.PI * 2 + (Math.random() - 0.5) * 0.04;
    const r = 112 + Math.random() * 42;
    const w = 10 + Math.random() * 24;
    const h = 16 + Math.random() * 44;
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, w * 0.85), dark);
    m.position.set(Math.cos(ang) * r, h / 2 - 0.3, Math.sin(ang) * r);
    m.rotation.y = Math.random() * 0.35;
    ctx.group.add(m);
    if (Math.random() > 0.28) {
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
  // civic monument / fountain base
  ctx.addColliderBlock(0, 0, 9, 9, 7.2, false, () => {
    const g = new THREE.Group();
    const base = concrete(0x6a7588);
    g.add(ctx.box(9, 1.1, 9, base));
    // fountain ring (visual, low)
    const basin = new THREE.Mesh(
      new THREE.TorusGeometry(3.6, 0.35, 8, 28),
      concrete(0x708090),
    );
    basin.rotation.x = Math.PI / 2;
    basin.position.y = 1.15;
    g.add(basin);
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(1.35, 1.75, 5.4, 12),
      concrete(0x90a0b4),
    );
    pillar.position.y = 3.9;
    pillar.castShadow = true;
    g.add(pillar);
    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(3.4, 0.5, 3.4),
      new THREE.MeshStandardMaterial({
        color: NEON.cyan, roughness: 0.3, metalness: 0.8,
        emissive: 0x1a4060, emissiveIntensity: 0.65,
      }),
    );
    cap.position.y = 6.9;
    g.add(cap);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(2.15, 0.12, 8, 24),
      new THREE.MeshBasicMaterial({ color: NEON.cyan }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 6.15;
    g.add(ring);
    ctx.setObelisk(cap, ring);
    return g;
  }, 0, 'wall');

  // soft ring — planters (not only 4 corners)
  const ring: [number, number][] = [
    [12, 12], [-12, 12], [12, -12], [-12, -12],
    [16, 0], [-16, 0], [0, 16], [0, -16],
    [11, 5], [-11, 5], [11, -5], [-11, -5],
  ];
  for (const [x, z] of ring) planter(ctx, x, z);

  // low hard cover on plaza approaches (peek points)
  jersey(ctx, 0, 20, 6.5, 1.4, false);
  jersey(ctx, 0, -20, 6.5, 1.4, false);
  jersey(ctx, 20, 0, 1.4, 6.5, false);
  jersey(ctx, -20, 0, 1.4, 6.5, false);
}

// ── grid blocks (L-shape per quadrant, avenues clear) ──────────────────────
// Main avenues: |x| < 7, |z| < 7. Secondary corridors ~|x|≈28, |z|≈28.

function buildCityBlocks(ctx: ArenaBuildContext) {
  // ── NE (+x, +z): Parking-facing mall towers ──
  office(ctx, 17, 17, 10, 10, 9, NEON.cyan, 'ac', 'bands');
  office(ctx, 17, 48, 12, 10, 12, NEON.lime, 'neon', 'grid');
  office(ctx, 48, 17, 10, 12, 10, NEON.cyan, 'ac', 'fins');
  office(ctx, 48, 48, 12, 12, 14, NEON.magenta, 'neon', 'bands');
  shop(ctx, 17, 10, 10, 5, NEON.cyan, -1);
  shop(ctx, 10, 17, 5, 10, NEON.cyan, 1);

  // ── NW (−x, +z): Construction / mid-rise ──
  office(ctx, -17, 17, 10, 10, 8, NEON.magenta, 'tank', 'fins');
  office(ctx, -17, 48, 12, 10, 11, NEON.cyan, 'ac', 'bands');
  office(ctx, -48, 17, 10, 12, 10, NEON.lime, 'neon', 'grid');
  office(ctx, -48, 48, 12, 12, 13, NEON.magenta, 'tank', 'bands');
  shop(ctx, -17, 10, 10, 5, NEON.magenta, -1);
  shop(ctx, -10, 17, 5, 10, NEON.magenta, 1);

  // ── SE (+x, −z): Residential lower ──
  office(ctx, 17, -17, 10, 10, 7, NEON.lime, 'ac', 'grid');
  office(ctx, 17, -48, 12, 10, 9, NEON.cyan, 'tank', 'bands');
  office(ctx, 48, -17, 10, 12, 8, NEON.lime, 'ac', 'fins');
  office(ctx, 48, -48, 12, 12, 11, NEON.cyan, 'neon', 'bands');
  shop(ctx, 17, -10, 10, 5, NEON.lime, 1);
  shop(ctx, 10, -17, 5, 10, NEON.lime, 1);

  // ── SW (−x, −z): Neon market mid-rises ──
  office(ctx, -17, -17, 10, 10, 9, NEON.magenta, 'neon', 'bands');
  office(ctx, -17, -48, 12, 10, 12, NEON.magenta, 'neon', 'grid');
  office(ctx, -48, -17, 10, 12, 10, NEON.cyan, 'ac', 'fins');
  office(ctx, -48, -48, 12, 12, 14, NEON.lime, 'neon', 'bands');
  shop(ctx, -17, -10, 10, 5, NEON.magenta, 1);
  shop(ctx, -10, -17, 5, 10, NEON.magenta, 1);

  // mid-ring solid barriers at secondary cross (channel fire without sealing)
  const bar = concrete(0x555e6e);
  ctx.addColliderBlock(28, 12, 2.4, 6, 2.6, false, () => ctx.box(2.4, 2.6, 6, bar.clone()), 0, 'block');
  ctx.addColliderBlock(-28, -12, 2.4, 6, 2.6, false, () => ctx.box(2.4, 2.6, 6, bar.clone()), 0, 'block');
  ctx.addColliderBlock(12, -28, 6, 2.4, 2.6, false, () => ctx.box(6, 2.6, 2.4, bar.clone()), 0, 'block');
  ctx.addColliderBlock(-12, 28, 6, 2.4, 2.6, false, () => ctx.box(6, 2.6, 2.4, bar.clone()), 0, 'block');
}

// ── district soft cover ────────────────────────────────────────────────────

function buildCityDistricts(ctx: ArenaBuildContext) {
  // NE — Parking lot
  const lotCars: [number, number, number, 'sedan' | 'van' | 'taxi'][] = [
    [38, 32, 0, 'sedan'], [38, 36, 0, 'taxi'], [38, 40, 0, 'sedan'],
    [54, 28, Math.PI, 'van'], [54, 33, Math.PI, 'sedan'], [54, 38, Math.PI, 'taxi'],
    [42, 54, Math.PI / 2, 'sedan'], [46, 54, Math.PI / 2, 'van'],
  ];
  const carCols = [0x2a4060, 0x602a2a, 0x2a5030, 0x404050, 0x503020, 0x1a1a2a];
  lotCars.forEach(([x, z, yaw, v], i) => car(ctx, x, z, yaw, carCols[i % carCols.length], v));
  // lot walls (low hard)
  jersey(ctx, 36, 56, 14, 1.3, false);
  jersey(ctx, 56, 36, 1.3, 14, false);
  // ticket booth
  kiosk(ctx, 32, 28, NEON.cyan);

  // NW — Construction
  jersey(ctx, -36, 36, 5, 1.3, true);
  jersey(ctx, -41, 36, 5, 1.3, true);
  jersey(ctx, -46, 36, 5, 1.3, true);
  jersey(ctx, -36, 40, 1.3, 5, true);
  jersey(ctx, -36, 45, 1.3, 5, true);
  deliveryCrate(ctx, -40, 52, 4.5, 3.5, 2.2);
  deliveryCrate(ctx, -52, 40, 3.5, 4.5, 2.4);
  deliveryCrate(ctx, -32, 42, 3.5, 3.5, 2.0);
  // scaffold frame (visual hard poles as thin blocks)
  ctx.addColliderBlock(-54, 54, 8, 2.5, 5.5, false, () => {
    const g = new THREE.Group();
    const steel = concrete(0x8899aa);
    for (const sx of [-3, 3]) {
      for (const sz of [-0.8, 0.8]) {
        const p = ctx.box(0.3, 5.5, 0.3, steel);
        p.position.set(sx, 2.75, sz);
        g.add(p);
      }
    }
    const beam = ctx.box(7, 0.3, 2.2, steel);
    beam.position.y = 5.2;
    g.add(beam);
    return g;
  }, 0, 'block');

  // SW — Neon market
  kiosk(ctx, -24, -24, NEON.magenta);
  kiosk(ctx, -32, -22, NEON.lime);
  kiosk(ctx, -22, -34, NEON.cyan);
  dumpster(ctx, -38, -28, 0.2);
  dumpster(ctx, -28, -40, Math.PI / 2);
  dumpster(ctx, -44, -36, -0.3);
  deliveryCrate(ctx, -52, -28, 4, 3.5, 2.2);
  car(ctx, -36, -52, Math.PI / 2, 0x2a4060, 'taxi');
  car(ctx, -42, -52, Math.PI / 2, 0x503020, 'sedan');
  billboard(ctx, -28, -14, 0.4, NEON.magenta);
  billboard(ctx, -14, -30, -0.5, NEON.lime);

  // SE — Residential
  planter(ctx, 24, -24, 0x3a6a38);
  planter(ctx, 32, -24, 0x2a5a30);
  planter(ctx, 24, -32, 0x355a32);
  planter(ctx, 36, -36, 0x2a5a30);
  planter(ctx, 52, -24, 0x3a6a38);
  planter(ctx, 24, -52, 0x2a5a30);
  busStop(ctx, 36, -10, true);
  busStop(ctx, 10, -36, false);
  car(ctx, 52, -36, Math.PI, 0x404050, 'sedan');
  car(ctx, 52, -42, Math.PI, 0x2a5030, 'van');

  // mid-ring soft along secondary corridors (linear, not only corners)
  car(ctx, 28, -8, 0.1, 0x2a4060, 'sedan');
  car(ctx, -28, 8, Math.PI + 0.1, 0x602a2a, 'taxi');
  car(ctx, 8, 28, Math.PI / 2, 0x404050, 'sedan');
  car(ctx, -8, -28, -Math.PI / 2, 0x503020, 'van');
  jersey(ctx, 28, 0, 1.3, 5, true);
  jersey(ctx, -28, 0, 1.3, 5, true);
  jersey(ctx, 0, 28, 5, 1.3, true);
  jersey(ctx, 0, -28, 5, 1.3, true);

  // outer delivery / one loading-dock container stack (city-not-factory)
  const ctex = containerTexture('#2a6a9a', 'CITY', '#1a3a5a');
  const mat = new THREE.MeshStandardMaterial({
    map: ctex, roughness: 0.55, metalness: 0.45, color: 0x8ab4d0,
  });
  ctx.addColliderBlock(58, -52, 6.5, 2.6, 5.2, false, () => {
    const g = new THREE.Group();
    const low = ctx.box(6.5, 2.6, 2.6, mat);
    low.position.y = 1.3;
    g.add(low);
    const up = ctx.box(6.5, 2.6, 2.6, mat);
    up.position.y = 3.9;
    up.rotation.y = 0.06;
    g.add(up);
    return g;
  }, 0, 'block');

  // edge billboards
  billboard(ctx, 0, 58, 0, NEON.cyan);
  billboard(ctx, 0, -58, Math.PI, NEON.magenta);
  billboard(ctx, 58, 0, Math.PI / 2, NEON.lime);
  billboard(ctx, -58, 0, -Math.PI / 2, NEON.cyan);
}

// ── short overpass (EW spine south of center) ──────────────────────────────

function buildCityOverpass(ctx: ArenaBuildContext) {
  const z = -40;
  const pillarH = 6.2;
  const deckY = 7.0;
  const pillarMat = concrete(0x5a6575);
  const deckMat = new THREE.MeshStandardMaterial({
    color: 0x3a4454, roughness: 0.65, metalness: 0.35,
    emissive: 0x0a1520, emissiveIntensity: 0.25,
  });
  const railMat = new THREE.MeshBasicMaterial({ color: NEON.cyan });

  // pillars — solid hard cover under the span
  for (const px of [-32, -12, 12, 32]) {
    ctx.addColliderBlock(px, z, 3.2, 3.2, pillarH, false, () => {
      const g = new THREE.Group();
      g.add(ctx.box(3.0, pillarH, 3.0, pillarMat));
      const cap = ctx.box(3.6, 0.4, 3.6, concrete(0x4a5565));
      cap.position.y = pillarH + 0.15;
      g.add(cap);
      return g;
    }, 0, 'wall');
  }

  // deck + rails — visual only (tanks pass under; no shot-block slab)
  const deck = new THREE.Mesh(new THREE.BoxGeometry(72, 0.7, 8), deckMat);
  deck.position.set(0, deckY, z);
  deck.castShadow = true;
  deck.receiveShadow = true;
  ctx.group.add(deck);

  for (const side of [-3.6, 3.6]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(72, 0.35, 0.25), railMat);
    rail.position.set(0, deckY + 0.7, z + side);
    ctx.group.add(rail);
  }

  // neon under-glow strip
  const glow = new THREE.Mesh(
    new THREE.BoxGeometry(70, 0.15, 0.4),
    new THREE.MeshBasicMaterial({ color: NEON.magenta }),
  );
  glow.position.set(0, deckY - 0.45, z);
  ctx.group.add(glow);

  // approach ramps at ends (blocksShots false)
  addCityRamp(ctx, -40, z + 10, Math.PI * 0.15);
  addCityRamp(ctx, 40, z + 10, -Math.PI * 0.15);
  addCityRamp(ctx, -40, z - 10, Math.PI * 0.85);
  addCityRamp(ctx, 40, z - 10, -Math.PI * 0.85);
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

  const edge = 62;
  for (const p of [-50, -30, -10, 10, 30, 50]) {
    lamp(p, -edge);
    lamp(p, edge);
    lamp(-edge, p);
    lamp(edge, p);
  }
  // intersection lamps at main × secondary
  for (const s of [1, -1]) {
    lamp(s * 8, s * 8);
    lamp(s * 8, -s * 8);
    lamp(s * 28, 8);
    lamp(s * 28, -8);
    lamp(8, s * 28);
    lamp(-8, s * 28);
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
  tl(9, 9);
  tl(-9, 9);
  tl(9, -9);
  tl(-9, -9);
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
  addCityRamp(ctx, 34, 34, Math.PI * 0.75);
  addCityRamp(ctx, -34, 34, -Math.PI * 0.75);
  addCityRamp(ctx, 34, -34, Math.PI * 0.25);
  addCityRamp(ctx, -34, -34, -Math.PI * 0.25);
  // outer approach
  addCityRamp(ctx, 0, 50, Math.PI);
  addCityRamp(ctx, 0, -54, 0);
  addCityRamp(ctx, 52, 0, Math.PI / 2);
  addCityRamp(ctx, -52, 0, -Math.PI / 2);
}

// ── atmosphere ─────────────────────────────────────────────────────────────

function buildCityAtmosphere(ctx: ArenaBuildContext) {
  const domeGeo = new THREE.CylinderGeometry(ctx.half + 6, ctx.half + 6, 52, 48, 1, true);
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
  dome.position.y = 22;
  ctx.group.add(dome);
  ctx.setDome(dome);

  const N = 280;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - 0.5) * ARENA.size;
    pos[i * 3 + 1] = 0.4 + Math.random() * 10;
    pos[i * 3 + 2] = (Math.random() - 0.5) * ARENA.size;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color: 0x6ad0ff,
    size: 0.12,
    transparent: true,
    opacity: 0.42,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const dust = new THREE.Points(geo, mat);
  ctx.group.add(dust);
  ctx.setDust(dust);
}
