// ===== Procedural hulls: hunter / viking / mammoth / speedy =====
//
// Each hull is authored as a pile of small primitives (armour plates, road
// wheels, hatches, louvers, rivets, tow hooks) and fused into one geometry per
// material slot by `HullBuilder`. Geometry depends only on `hullId`, so it is
// built once per process and `markShared`; per-tank we only create materials,
// because FX tint `bodyMats` per tank (hit flash, HP darkening, death fade).
//
// Conventions: +Z is forward, +X is right, Y is up, ground at Y=0.
import * as THREE from 'three';
import type { HullId } from '../../core/catalog';
import type { TankBuildContext } from './context';
import { HULL_SLOTS, HullBuilder, slope } from './hullKit';
import type { HullGeometrySet, HullSlot } from './hullKit';

// ---------------------------------------------------------------- track loop

interface TrackSpec {
  /** |X| of the track centreline. */
  x: number;
  /** Band width — kept narrower than the wheels so wheel faces stay visible. */
  width: number;
  /** Road wheel width. */
  wheelWidth: number;
  /** Z of the front / rear end of the loop. */
  front: number;
  rear: number;
  wheelR: number;
  wheelY: number;
  wheelCount: number;
  /** Link thickness (also sets the loop end radius). */
  linkH: number;
  /** Radius of the idler / sprocket hub caps. */
  hubR: number;
}

/**
 * Full running gear for one side: link runs, loop ends, sprocket teeth, road
 * wheels with hubs. Wheels are wider than the band, so from the side the band
 * shows between wheel faces instead of hiding them.
 */
function buildTrack(b: HullBuilder, side: 1 | -1, s: TrackSpec) {
  const x = side * s.x;
  const endR = s.wheelR + s.linkH;
  const bandBottom = s.wheelY - s.wheelR - s.linkH / 2;
  const bandTop = s.wheelY + s.wheelR + s.linkH / 2;
  const frontEndZ = s.front - endR * 0.6;
  const rearEndZ = s.rear + endR * 0.6;

  // Bottom run — discrete links so the tread pattern reads at close range.
  const bottomFrom = s.rear + endR * 0.5;
  const bottomTo = s.front - endR * 0.5;
  const nBottom = Math.max(5, Math.round((bottomTo - bottomFrom) / 0.40));
  const stepB = (bottomTo - bottomFrom) / nBottom;
  for (let i = 0; i < nBottom; i++) {
    b.box(s.width, s.linkH, stepB * 0.78, 'track', x, bandBottom, bottomFrom + stepB * (i + 0.5));
  }

  // Top run — shorter: it does not wrap the loop ends.
  const topFrom = s.rear + endR * 1.05;
  const topTo = s.front - endR * 1.05;
  const nTop = Math.max(4, Math.round((topTo - topFrom) / 0.40));
  const stepT = (topTo - topFrom) / nTop;
  for (let i = 0; i < nTop; i++) {
    b.box(s.width, s.linkH, stepT * 0.78, 'track', x, bandTop, topFrom + stepT * (i + 0.5));
  }

  // Loop ends: idler (front) and drive sprocket (rear) inside the band.
  b.wheel(endR, s.width, 14, 'track', x, s.wheelY, frontEndZ);
  b.wheel(endR, s.width, 14, 'track', x, s.wheelY, rearEndZ);
  b.wheel(s.hubR, s.width + 0.12, 12, 'metal', x, s.wheelY, frontEndZ);
  b.wheel(s.hubR, s.width + 0.12, 12, 'metal', x, s.wheelY, rearEndZ);
  // Sprocket teeth on the rear rim: wider than the loop disc so they read from
  // the side, but clamped inside the loop radius — the band's ground contact
  // line is the lowest point of the hull and teeth must not pierce it.
  const toothR = endR - 0.07;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    b.box(s.width + 0.16, 0.14, 0.13, 'dark',
      x, s.wheelY + Math.cos(a) * toothR, rearEndZ + Math.sin(a) * toothR, a, 0, 0);
  }

  // Road wheels + hubs.
  const firstZ = s.rear + endR * 1.15;
  const lastZ = s.front - endR * 1.15;
  const n = Math.max(2, s.wheelCount);
  for (let i = 0; i < n; i++) {
    const z = firstZ + (i / (n - 1)) * (lastZ - firstZ);
    b.wheel(s.wheelR, s.wheelWidth, 12, 'dark', x, s.wheelY, z);
    b.wheel(s.wheelR * 0.44, s.wheelWidth + 0.06, 8, 'metal', x, s.wheelY, z);
  }
}

// ------------------------------------------------------------------- hunter

/** Medium universal MBT: balanced, classic silhouette, bolted appliqué. */
function buildHunter(b: HullBuilder) {
  const TRACK: TrackSpec = {
    x: 1.42, width: 0.70, wheelWidth: 0.86,
    front: 2.18, rear: -2.18,
    wheelR: 0.30, wheelY: 0.46, wheelCount: 6,
    linkH: 0.14, hubR: 0.30,
  };
  for (const side of [-1, 1] as const) buildTrack(b, side, TRACK);

  // --- Hull shell ---
  b.box(2.55, 0.74, 4.30, 'body', 0, 0.87, -0.05); // lower hull
  b.box(2.40, 0.60, 3.30, 'body', 0, 1.56, -0.35); // fighting compartment
  for (const side of [-1, 1] as const) {
    b.box(0.80, 0.30, 4.00, 'body', side * 1.42, 1.20, -0.05); // sponson over the track
    b.box(0.96, 0.08, 4.42, 'metal', side * 1.44, 0.99, -0.05); // fender lip
    b.box(0.84, 0.30, 0.08, 'dark', side * 1.44, 0.86, 2.24); // front mud flap
    b.box(0.84, 0.26, 0.08, 'dark', side * 1.44, 0.88, -2.28); // rear mud flap
  }

  // --- Sloped glacis ---
  const G = slope(0, 1.44, 1.60, 0.55);
  const gl = (w: number, h: number, d: number, slot: HullSlot, u: number, v: number, n = 0) => {
    const [x, y, z] = G(u, v, n);
    b.box(w, h, d, slot, x, y, z, 0.55, 0, 0);
  };
  gl(2.44, 0.16, 1.42, 'body', 0, 0, 0);
  b.box(2.50, 0.68, 0.24, 'body', 0, 0.85, 2.14); // lower nose plate
  b.box(2.40, 0.20, 0.30, 'body', 0, 1.10, 2.24); // nose brow
  b.box(2.42, 0.06, 0.06, 'dark', 0, 1.16, 2.27); // nose seam
  gl(0.70, 0.10, 0.54, 'metal', 0.58, 0.10, 0.13); // driver's hatch
  for (const u of [0.34, 0.58, 0.82]) gl(0.12, 0.09, 0.12, 'dark', u, 0.40, 0.15); // periscopes
  for (let i = 0; i < 4; i++) gl(0.30, 0.11, 0.46, 'dark', -0.62 + i * 0.34, -0.16, 0.13); // spare links
  for (const side of [-1, 1] as const) gl(0.20, 0.18, 0.26, 'metal', side * 0.98, -0.50, 0.10); // tow hooks
  gl(0.62, 0.10, 0.34, 'metal', -0.58, 0.42, 0.14); // MG mount base
  // Bolt row along the glacis top edge.
  for (let i = 0; i < 9; i++) {
    const [bx, by, bz] = G(-1.04 + i * 0.26, -0.64, 0.12);
    b.sphere(0.035, 'metal', bx, by, bz, 6, 4);
  }

  // --- Headlights on the fenders (with brush guards) ---
  for (const side of [-1, 1] as const) {
    b.box(0.30, 0.24, 0.22, 'metal', side * 0.94, 1.22, 2.00);
    b.box(0.22, 0.16, 0.06, 'lamp', side * 0.94, 1.22, 2.12);
    b.box(0.38, 0.04, 0.04, 'metal', side * 0.94, 1.35, 2.10);
    b.box(0.04, 0.30, 0.04, 'metal', side * 0.94, 1.22, 2.13);
    b.box(0.04, 0.30, 0.04, 'metal', side * 0.79, 1.22, 2.13);
    b.box(0.04, 0.30, 0.04, 'metal', side * 1.09, 1.22, 2.13);
  }

  // --- Engine deck ---
  b.box(2.30, 0.10, 1.40, 'body', 0, 1.90, -1.30); // raised deck plate
  b.louvers(5, 1.62, 0.07, 0.20, 'dark', 0, 1.96, -1.84, -0.35);
  for (const side of [-1, 1] as const) {
    b.louvers(3, 0.50, 0.07, 0.20, 'dark', side * 0.82, 1.96, -1.16, -0.35);
    b.cyl(0.12, 0.12, 0.08, 8, 'metal', side * 0.78, 1.98, -0.70); // fuel cap
    b.rivets(5, 0.035, 'metal', side * 1.15, 1.84, -1.30, 0, 0, 1.10);
  }

  // --- Rear plate, exhausts, tow hooks ---
  b.box(2.44, 0.84, 0.20, 'body', 0, 0.95, -2.22);
  for (const side of [-1, 1] as const) {
    b.cyl(0.10, 0.13, 0.80, 10, 'metal', side * 0.74, 1.42, -2.30, -0.45, 0, 0);
    b.cyl(0.11, 0.11, 0.10, 10, 'dark', side * 0.74, 1.75, -2.47, -0.45, 0, 0);
    b.box(0.22, 0.20, 0.26, 'metal', side * 0.86, 0.70, -2.34);
  }

  // --- Rear stowage bin ---
  b.box(1.50, 0.44, 0.54, 'body', 0, 2.06, -1.74);
  b.box(1.56, 0.08, 0.60, 'metal', 0, 2.30, -1.74);
  b.rivets(4, 0.035, 'metal', 0, 2.10, -1.46, 1.10, 0, 0);

  // --- Side appliqué, tow cable, tool boxes, grab handles ---
  for (const side of [-1, 1] as const) {
    b.box(0.07, 0.44, 1.30, 'metal', side * 1.20, 1.50, -0.70);
    b.box(0.06, 0.06, 0.44, 'metal', side * 1.18, 1.78, 0.30);
    b.rivets(6, 0.035, 'metal', side * 1.21, 1.74, -0.75, 0, 0, 1.30);
    b.box(0.06, 0.06, 4.00, 'dark', side * 1.19, 1.30, -0.05); // side seam
    b.cyl(0.05, 0.05, 3.10, 6, 'metal', side * 1.32, 1.36, -0.30, Math.PI / 2, 0, 0); // tow cable
    b.box(0.52, 0.22, 0.82, 'metal', side * 1.44, 1.45, -1.60); // tool box
    b.box(0.56, 0.05, 0.86, 'metal', side * 1.44, 1.58, -1.60);
    b.box(0.34, 0.18, 0.50, 'dark', side * 1.44, 1.44, 1.35); // spare parts box
  }

  // --- Turret ring collar ---
  b.cyl(1.32, 1.38, 0.14, 18, 'body', 0, 1.87, -0.10);
}

// ------------------------------------------------------------------- viking

/** Fast assault hull: very low, long tapered wedge, skirted running gear. */
function buildViking(b: HullBuilder) {
  const TRACK: TrackSpec = {
    x: 1.46, width: 0.66, wheelWidth: 0.82,
    front: 2.30, rear: -2.30,
    wheelR: 0.27, wheelY: 0.41, wheelCount: 5,
    linkH: 0.12, hubR: 0.27,
  };
  for (const side of [-1, 1] as const) buildTrack(b, side, TRACK);

  // --- Low, wide hull ---
  b.box(2.50, 0.56, 4.50, 'body', 0, 0.76, -0.05); // lower hull
  b.box(2.30, 0.42, 3.60, 'body', 0, 1.22, -0.35); // upper hull
  for (const side of [-1, 1] as const) {
    b.box(0.78, 0.26, 4.30, 'body', side * 1.44, 1.07, -0.05); // sponson
    b.box(0.94, 0.07, 4.60, 'metal', side * 1.46, 0.87, -0.05); // fender lip
    b.box(0.10, 0.34, 4.30, 'body', side * 1.90, 0.86, -0.05); // side skirt
    b.box(0.18, 0.08, 4.20, 'metal', side * 1.86, 1.03, -0.05); // skirt bracket
    b.box(0.06, 0.06, 4.20, 'dark', side * 1.95, 1.02, -0.05); // skirt seam
    b.box(0.80, 0.26, 0.07, 'dark', side * 1.46, 0.72, 2.36); // front mud flap
    b.box(0.80, 0.22, 0.07, 'dark', side * 1.46, 0.74, -2.40); // rear mud flap
    b.box(0.48, 0.20, 0.74, 'metal', side * 1.44, 1.30, -1.45); // tool box
    b.box(0.52, 0.05, 0.78, 'metal', side * 1.44, 1.42, -1.45);
    b.cyl(0.05, 0.05, 2.80, 6, 'metal', side * 1.32, 1.22, -0.20, Math.PI / 2, 0, 0); // tow cable
    b.rivets(6, 0.03, 'metal', side * 1.19, 1.40, -0.60, 0, 0, 1.00);
  }
  // Skirt ribs — break up the long flat slab.
  for (const side of [-1, 1] as const) {
    for (let i = 0; i < 6; i++) {
      b.box(0.14, 0.30, 0.11, 'metal', side * 1.92, 0.86, -1.80 + i * 0.72);
    }
  }

  // --- Long tapered glacis ---
  const G = slope(0, 1.08, 1.62, 0.40);
  const gl = (w: number, h: number, d: number, slot: HullSlot, u: number, v: number, n = 0) => {
    const [x, y, z] = G(u, v, n);
    b.box(w, h, d, slot, x, y, z, 0.40, 0, 0);
  };
  gl(2.32, 0.14, 1.60, 'body', 0, 0, 0);
  b.box(2.34, 0.46, 0.22, 'body', 0, 0.72, 2.20); // lower nose plate
  b.box(2.28, 0.06, 0.06, 'dark', 0, 0.98, 2.29); // nose seam
  gl(0.66, 0.09, 0.46, 'metal', -0.50, 0.12, 0.11); // driver's hatch
  for (const u of [-0.72, -0.50, -0.28]) gl(0.11, 0.08, 0.11, 'dark', u, 0.40, 0.13);
  for (let i = 0; i < 3; i++) gl(0.28, 0.10, 0.42, 'dark', 0.46 + i * 0.32, -0.14, 0.12); // spare links
  gl(0.20, 0.16, 0.24, 'metal', 0, -0.58, 0.09); // central tow hook
  // Bolt row along the glacis top edge.
  for (let i = 0; i < 8; i++) {
    const [bx, by, bz] = G(-0.98 + i * 0.28, -0.72, 0.10);
    b.sphere(0.03, 'metal', bx, by, bz, 6, 4);
  }

  // --- Wedge nose + low headlights ---
  for (const side of [-1, 1] as const) {
    b.box(0.26, 0.14, 0.18, 'metal', side * 0.96, 0.98, 2.10);
    b.box(0.20, 0.10, 0.05, 'lamp', side * 0.96, 0.98, 2.19);
  }

  // --- Rear deck sloping down, angled vents ---
  b.box(2.24, 0.12, 1.30, 'body', 0, 1.40, -1.40, -0.12, 0, 0);
  b.louvers(4, 1.30, 0.06, 0.18, 'dark', 0, 1.44, -1.62, -0.30);
  b.box(2.34, 0.62, 0.18, 'body', 0, 0.86, -2.34); // rear plate

  // --- Twin side exhausts with heat shields ---
  for (const side of [-1, 1] as const) {
    b.cyl(0.08, 0.10, 0.72, 10, 'metal', side * 1.24, 1.12, -2.02, -0.62, 0, 0);
    b.cyl(0.09, 0.09, 0.09, 10, 'dark', side * 1.24, 1.41, -2.23, -0.62, 0, 0);
    b.box(0.24, 0.28, 0.46, 'metal', side * 1.24, 1.10, -1.98);
    b.box(0.20, 0.16, 0.22, 'metal', side * 1.24, 0.72, -2.42); // tow hook
    b.box(0.06, 0.06, 0.40, 'metal', side * 1.18, 1.44, -0.10); // grab handle
    b.rivets(5, 0.03, 'metal', side * 1.20, 1.42, -0.55, 0, 0, 0.90);
  }

  // --- Small rear stowage + turret ring collar ---
  b.box(1.10, 0.34, 0.46, 'body', 0, 1.52, -1.78);
  b.box(1.16, 0.07, 0.52, 'metal', 0, 1.70, -1.78);
  b.cyl(1.28, 1.34, 0.12, 18, 'body', 0, 1.48, -0.10);
}

// ------------------------------------------------------------------ mammoth

/** Super-heavy assault hull: layered armour, dozer blade, stacks, drums. */
function buildMammoth(b: HullBuilder) {
  const TRACK: TrackSpec = {
    x: 1.74, width: 0.92, wheelWidth: 1.06,
    front: 2.45, rear: -2.45,
    wheelR: 0.36, wheelY: 0.56, wheelCount: 7,
    linkH: 0.18, hubR: 0.38,
  };
  for (const side of [-1, 1] as const) buildTrack(b, side, TRACK);

  // --- Massive hull shell ---
  b.box(3.10, 0.95, 4.65, 'body', 0, 1.06, -0.05); // lower hull
  b.box(2.66, 0.66, 3.60, 'body', 0, 2.00, -0.30); // fighting compartment
  for (const side of [-1, 1] as const) {
    b.box(1.00, 0.42, 4.45, 'body', side * 1.72, 1.46, -0.05); // sponson
    b.box(1.16, 0.10, 4.75, 'metal', side * 1.74, 1.21, -0.05); // fender lip
    b.box(0.12, 0.44, 4.40, 'body', side * 2.26, 1.40, -0.05); // spaced skirt armour
    for (let i = 0; i < 5; i++) {
      b.box(0.18, 0.36, 0.14, 'metal', side * 2.26, 1.40, -1.85 + i * 0.92); // skirt ribs
    }
    b.box(1.00, 0.32, 0.10, 'dark', side * 1.74, 1.02, 2.42); // front mud flap
    b.box(1.00, 0.28, 0.10, 'dark', side * 1.74, 1.04, -2.52); // rear mud flap
    b.box(0.08, 0.50, 1.70, 'metal', side * 1.38, 1.98, -0.45); // side appliqué panel
    b.rivets(7, 0.04, 'metal', side * 1.40, 2.20, -1.20, 0, 0, 1.50);
    b.rivets(7, 0.04, 'metal', side * 1.40, 1.76, -1.20, 0, 0, 1.50);
    b.box(0.62, 0.26, 1.00, 'metal', side * 1.72, 1.70, -1.90); // stowage rack
    b.box(0.10, 0.42, 4.40, 'dark', side * 2.32, 1.38, -0.05); // skirt shadow line
  }
  // Spare track links stowed on the front fenders.
  for (const side of [-1, 1] as const) {
    for (let i = 0; i < 4; i++) {
      b.box(0.44, 0.10, 0.24, 'dark', side * 1.74, 1.28, 1.70 + i * 0.30);
    }
  }

  // --- Sloped glacis with layered appliqué ---
  const G = slope(0, 1.86, 1.72, 0.48);
  const gl = (w: number, h: number, d: number, slot: HullSlot, u: number, v: number, n = 0) => {
    const [x, y, z] = G(u, v, n);
    b.box(w, h, d, slot, x, y, z, 0.48, 0, 0);
  };
  gl(2.74, 0.22, 1.50, 'body', 0, 0, 0);
  gl(2.30, 0.14, 0.80, 'metal', 0, 0.18, 0.17); // upper appliqué plate
  gl(2.30, 0.12, 0.62, 'metal', 0, -0.42, 0.16); // lower appliqué plate
  for (let i = 0; i < 7; i++) gl(0.10, 0.08, 0.08, 'dark', -0.94 + i * 0.31, 0.56, 0.24);
  b.box(3.10, 0.90, 0.30, 'body', 0, 1.05, 2.30); // lower nose plate
  b.box(3.06, 0.08, 0.08, 'dark', 0, 1.46, 2.42); // nose seam
  // Bolt rows on the appliqué edges.
  for (const v of [0.60, 0.02, -0.14, -0.72]) {
    for (let i = 0; i < 8; i++) {
      const [bx, by, bz] = G(-0.98 + i * 0.28, v, 0.14);
      b.sphere(0.04, 'metal', bx, by, bz, 6, 4);
    }
  }

  // --- Dozer blade with ribs and hydraulic arms ---
  b.box(3.30, 1.05, 0.22, 'metal', 0, 0.88, 2.52, -0.25, 0, 0);
  for (let i = 0; i < 5; i++) {
    b.box(0.14, 0.86, 0.14, 'dark', -1.30 + i * 0.65, 0.88, 2.60, -0.25, 0, 0);
  }
  for (const side of [-1, 1] as const) {
    b.box(0.18, 0.18, 1.05, 'metal', side * 1.05, 1.36, 2.05, -0.42, 0, 0); // arm
    b.cyl(0.13, 0.13, 0.60, 10, 'metal', side * 1.05, 1.05, 2.00, -0.9, 0, 0); // ram
  }

  // --- Big headlights with guards ---
  for (const side of [-1, 1] as const) {
    b.box(0.36, 0.30, 0.26, 'metal', side * 1.18, 1.62, 2.06);
    b.box(0.26, 0.20, 0.07, 'lamp', side * 1.18, 1.62, 2.20);
    b.box(0.44, 0.05, 0.05, 'metal', side * 1.18, 1.79, 2.18);
    b.box(0.05, 0.36, 0.05, 'metal', side * 1.18, 1.62, 2.21);
    b.box(0.05, 0.36, 0.05, 'metal', side * 1.00, 1.62, 2.21);
    b.box(0.05, 0.36, 0.05, 'metal', side * 1.36, 1.62, 2.21);
  }

  // --- Engine deck: louvers, fuel drums, hatches ---
  b.box(2.56, 0.12, 1.50, 'body', 0, 2.34, -1.30);
  b.louvers(6, 1.60, 0.08, 0.21, 'dark', 0, 2.40, -1.90, -0.35);
  for (const side of [-1, 1] as const) {
    b.louvers(3, 0.42, 0.08, 0.21, 'dark', side * 0.92, 2.40, -1.10, -0.35);
    b.cyl(0.16, 0.16, 0.10, 8, 'metal', side * 1.02, 2.42, -0.66); // fuel cap
  }
  b.box(0.72, 0.12, 0.72, 'metal', -0.66, 2.46, -0.34); // commander hatch
  b.cyl(0.20, 0.22, 0.10, 10, 'dark', -0.66, 2.55, -0.34);
  b.box(0.62, 0.10, 0.62, 'metal', 0.72, 2.45, -0.30); // loader hatch
  // Rear fuel drums on the deck.
  for (const side of [-1, 1] as const) {
    b.cyl(0.34, 0.34, 0.80, 14, 'metal', side * 0.78, 2.20, -1.95, 0, 0, Math.PI / 2);
    b.cyl(0.34, 0.34, 0.06, 14, 'dark', side * 1.20, 2.20, -1.95, 0, 0, Math.PI / 2);
  }

  // --- Rear plate, exhaust stacks with heat shields ---
  b.box(2.86, 1.00, 0.22, 'body', 0, 1.10, -2.50);
  for (const side of [-1, 1] as const) {
    b.cyl(0.16, 0.18, 1.05, 12, 'metal', side * 1.34, 1.85, -2.34, -0.16, 0, 0);
    b.box(0.36, 0.44, 0.36, 'dark', side * 1.34, 1.58, -2.32); // heat shield
    b.box(0.44, 0.10, 0.44, 'metal', side * 1.34, 2.36, -2.42); // stack cap
    b.box(0.34, 0.24, 0.30, 'metal', side * 1.16, 0.78, -2.66); // tow hook
  }

  // --- Turret ring collar ---
  b.cyl(1.42, 1.48, 0.16, 20, 'body', 0, 2.32, -0.10);
}

// -------------------------------------------------------------------- speedy

/**
 * Ultra-light interceptor hull: the flattest, narrowest chassis in the game.
 * A wide sled-like deck with raised side rails carries one oversized turret
 * ring plate; the whole lower half is a single dark track guard pierced by
 * vent windows, the nose is a long wedge glacis with a bolted appliqué plate
 * and a light bar, and a stepped engine deck closes the rear.
 *
 * Two-tone is the point: the guard slab is the only large `metal` mass in the
 * hull set. `metal` is `style.accent` (dark slate for the player, near-black
 * for bots), which is exactly the "dark lower half" the silhouette needs —
 * unlike the thin trim strips elsewhere, this mass carries no fine detail, so
 * nothing is lost when accent is dark.
 */
function buildSpeedy(b: HullBuilder) {
  const TRACK: TrackSpec = {
    x: 1.22, width: 0.56, wheelWidth: 0.68,
    front: 2.04, rear: -2.04,
    wheelR: 0.26, wheelY: 0.40, wheelCount: 5,
    linkH: 0.12, hubR: 0.26,
  };
  for (const side of [-1, 1] as const) buildTrack(b, side, TRACK);

  // --- Flat sled hull ---
  b.box(2.34, 0.50, 4.10, 'body', 0, 0.74, -0.05); // lower hull
  b.box(2.30, 0.34, 3.40, 'body', 0, 1.18, -0.30); // fighting compartment
  b.box(2.26, 0.10, 3.40, 'body', 0, 1.40, -0.30); // flat deck plate

  // --- Dark track guard: the reference's lower half ---
  for (const side of [-1, 1] as const) {
    b.box(0.60, 0.26, 3.90, 'body', side * 1.40, 1.04, -0.05); // sponson over the band
    b.box(0.26, 0.58, 3.70, 'metal', side * 1.68, 0.66, -0.05); // guard slab
    b.box(0.32, 0.09, 3.80, 'body', side * 1.68, 0.98, -0.05); // guard top rail
    b.box(0.28, 0.07, 3.80, 'metal', side * 1.68, 0.38, -0.05); // guard bottom rail
    for (let i = 0; i < 4; i++) {
      b.box(0.07, 0.26, 0.46, 'dark', side * 1.81, 0.66, -1.30 + i * 0.88); // vent window
    }
    b.box(0.06, 0.07, 0.24, 'lamp', side * 1.81, 0.86, 1.60); // side marker light
    b.box(0.26, 0.20, 0.08, 'dark', side * 1.68, 0.50, 1.86); // front mud flap
    b.box(0.26, 0.18, 0.08, 'dark', side * 1.68, 0.52, -1.94); // rear mud flap

    // Stowed tow cable above the sponson, on welded brackets.
    b.cyl(0.045, 0.045, 2.70, 6, 'metal', side * 1.52, 1.24, -0.35, Math.PI / 2, 0, 0);
    b.box(0.06, 0.14, 0.06, 'metal', side * 1.52, 1.16, -1.20);
    b.box(0.06, 0.14, 0.06, 'metal', side * 1.52, 1.16, 0.30);

    // Fender tool box, seated on the sponson beside the compartment.
    b.box(0.42, 0.16, 0.66, 'metal', side * 1.36, 1.26, -1.45);
    b.box(0.46, 0.05, 0.70, 'metal', side * 1.36, 1.36, -1.45);

    // Grab handle on the compartment wall.
    b.box(0.06, 0.06, 0.34, 'metal', side * 1.16, 1.26, 0.30);
    b.rivets(4, 0.028, 'metal', side * 1.16, 1.26, 0.30, 0, 0, 0.30);
  }

  // --- Deck rails: the reference's raised green tray edges ---
  for (const side of [-1, 1] as const) {
    b.box(0.18, 0.14, 3.30, 'body', side * 1.13, 1.53, -0.30);
    b.box(0.20, 0.05, 3.34, 'metal', side * 1.13, 1.62, -0.30);
  }

  // --- Long wedge glacis with a bolted appliqué plate ---
  const G = slope(0, 1.11, 1.805, 0.598);
  const gl = (w: number, h: number, d: number, slot: HullSlot, u: number, v: number, n = 0) => {
    const [x, y, z] = G(u, v, n);
    b.box(w, h, d, slot, x, y, z, 0.598, 0, 0);
  };
  gl(2.30, 0.15, 1.10, 'body', 0, 0, 0);
  gl(1.40, 0.14, 0.70, 'metal', -0.22, 0.02, 0.15); // raised appliqué plate
  gl(0.54, 0.09, 0.40, 'metal', 0.62, 0.22, 0.12); // driver's hatch
  for (const u of [0.48, 0.62, 0.76]) gl(0.10, 0.07, 0.10, 'dark', u, 0.50, 0.14); // periscopes
  for (const u of [-0.92, -0.60]) gl(0.26, 0.09, 0.36, 'dark', u, -0.36, 0.12); // spare links
  for (const side of [-1, 1] as const) gl(0.18, 0.14, 0.22, 'metal', side * 1.04, -0.38, 0.10); // tow hooks
  // Bolt row along the glacis top edge.
  for (let i = 0; i < 9; i++) {
    const [bx, by, bz] = G(-0.96 + i * 0.25, -0.46, 0.10);
    b.sphere(0.03, 'metal', bx, by, bz, 6, 4);
  }

  // --- Nose: lower plate and a full-width light bar ---
  b.box(2.30, 0.40, 0.16, 'body', 0, 0.70, 2.02);
  b.box(1.70, 0.08, 0.06, 'lamp', 0, 0.60, 2.11);

  // --- Rear plate, slanted exhausts, tow hooks ---
  b.box(2.30, 0.50, 0.16, 'body', 0, 0.76, -2.14);
  for (const side of [-1, 1] as const) {
    b.cyl(0.085, 0.105, 0.55, 10, 'metal', side * 1.00, 1.22, -2.00, -0.6, 0, 0);
    b.cyl(0.095, 0.095, 0.08, 10, 'dark', side * 1.00, 1.447, -2.155, -0.6, 0, 0);
    b.box(0.24, 0.30, 0.34, 'dark', side * 1.00, 1.16, -1.92); // heat shield
    b.box(0.20, 0.16, 0.20, 'metal', side * 0.80, 0.66, -2.24); // tow hook
    b.cyl(0.10, 0.10, 0.07, 8, 'metal', side * 0.68, 1.50, -0.95); // fuel cap
  }

  // --- Stepped rear engine deck: louvers, hatch, drum ---
  b.box(2.02, 0.16, 0.94, 'body', 0, 1.49, -1.50);
  b.louvers(3, 1.10, 0.06, 0.17, 'dark', 0, 1.585, -1.68, -0.34);
  b.box(0.54, 0.05, 0.36, 'metal', -0.44, 1.585, -1.50); // hatch
  b.rivetRing(6, 0.026, 'metal', -0.44, 1.615, -1.50, 0.18);
  b.cyl(0.26, 0.26, 0.07, 14, 'body', 0.48, 1.585, -1.50); // engine drum
  b.cyl(0.20, 0.20, 0.03, 14, 'dark', 0.48, 1.625, -1.50);

  // --- Oversized turret ring plate + collar ---
  b.cyl(1.30, 1.34, 0.10, 24, 'body', 0, 1.43, 0.06);
  b.cyl(1.24, 1.28, 0.13, 20, 'body', 0, 1.44, 0.06);
  b.cyl(1.32, 1.32, 0.05, 24, 'metal', 0, 1.375, 0.06); // ring bezel
  b.rivetRing(16, 0.032, 'metal', 0, 1.49, 0.06, 1.20);
}

// -------------------------------------------------------------------- wiring

const PART_BUILDERS: Record<HullId, (b: HullBuilder) => void> = {
  hunter: buildHunter,
  viking: buildViking,
  mammoth: buildMammoth,
  speedy: buildSpeedy,
};

const geometryCache = new Map<HullId, HullGeometrySet>();

/** Merged hull geometry for a hull id — built once, shared for the process. */
export function hullGeometry(hullId: HullId): HullGeometrySet {
  let set = geometryCache.get(hullId);
  if (!set) {
    const builder = new HullBuilder();
    PART_BUILDERS[hullId](builder);
    set = builder.build();
    geometryCache.set(hullId, set);
  }
  return set;
}

export function buildHull(ctx: TankBuildContext, hullId: HullId) {
  const set = hullGeometry(hullId);
  const materials: Record<HullSlot, THREE.Material> = {
    body: ctx.bodyMat,
    metal: ctx.metalMat,
    dark: ctx.darkMat,
    track: ctx.trackMat,
    lamp: ctx.lampMat,
  };
  for (const slot of HULL_SLOTS) {
    const geo = set[slot];
    if (!geo) continue;
    ctx.hull.add(new THREE.Mesh(geo, materials[slot]));
  }
}
