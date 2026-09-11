// ===== Procedural turrets: railgun / flamethrower / cannon =====
//
// Mirror of `hull.ts`. Each turret is authored from dozens of primitives
// (armour shells, mantlets, hatches, optics, stowage, rivets) and fused into
// one geometry per material slot by `TurretBuilder`. Geometry depends only on
// `turretId`, so it is built once per process and `markShared`; per-tank cost
// is materials only (FX tint `bodyMats`, and the railgun drives a per-tank
// emissive material).
//
// The gun lives in its own group: `barrelGroup` is parented to the turret at
// the trunnion and is animated every frame (recoil kick on Z, charge jitter on
// X/Y, droop on death). Its geometry is therefore authored in group-local space
// with +Z forward, starting behind the mantlet, and merged separately from the
// turret shell. `TankAnimationSystem` owns `position.z`, so every turret seats
// the barrel at `BARREL_REST_Z` and only differs in Y.
//
// Conventions: +Z is forward, +X is right, Y is up; turret Y=0 is the ring
// seat (matches the hull's ring collar).
import * as THREE from 'three';
import type { TurretId } from '../../core/catalog';
import type { TankBuildContext } from './context';
import { BARREL_REST_Y, BARREL_REST_Z } from '../tuning';
import { TURRET_SLOTS, TurretBuilder } from './turretKit';
import type { TurretSlot, TurretSlotSet } from './turretKit';

// ----------------------------------------------------------------- shared kit

/** Where the gun is seated and where shots leave it. */
interface TurretLayout {
  /** `barrelGroup.position.y` — barrel axis height in turret space. */
  barrelY: number;
  /** `muzzle.position.z` — shot origin along the barrel's local Z. */
  muzzleZ: number;
}

/** Bolted turret ring — the visible joint with the hull's ring collar. */
function turretRing(b: TurretBuilder, rTop: number, rBot: number) {
  b.cyl(rTop, rBot, 0.30, 24, 'body', 0, 0.15, 0);
  b.cyl(rTop + 0.02, rTop + 0.02, 0.06, 24, 'metal', 0, 0.32, 0);
  b.rivetRing(18, 0.04, 'metal', 0, 0.36, 0, rTop + 0.01);
}

/** Commander cupola: ring, hatch, handle and a ring of periscopes. */
function cupola(b: TurretBuilder, x: number, y: number, z: number, r = 0.42) {
  b.cyl(r * 0.94, r, 0.26, 14, 'body', x, y, z);
  b.cyl(r * 0.99, r * 0.99, 0.05, 14, 'metal', x, y + 0.15, z);
  b.cyl(r * 0.64, r * 0.68, 0.10, 12, 'metal', x, y + 0.22, z);
  b.cyl(0.045, 0.045, 0.14, 8, 'metal', x + r * 0.34, y + 0.30, z);
  for (let i = 0; i < 5; i++) {
    const a = -0.8 + i * 0.4;
    b.box(0.12, 0.10, 0.08, 'dark',
      x + Math.sin(a) * r * 0.8, y + 0.06, z + Math.cos(a) * r * 0.8, 0, a, 0);
  }
}

/** Cluster of three smoke grenade launchers on a turret cheek. */
function smokeLaunchers(b: TurretBuilder, side: 1 | -1, x: number, y: number, z: number) {
  b.box(0.14, 0.54, 0.14, 'metal', side * x, y - 0.17, z - 0.07);
  for (let i = 0; i < 3; i++) {
    const yy = y - i * 0.17;
    b.cyl(0.085, 0.095, 0.36, 8, 'dark', side * x, yy, z, Math.PI / 2 - 0.22, 0, 0);
    b.cyl(0.10, 0.10, 0.06, 8, 'metal', side * x, yy + 0.05, z + 0.16, Math.PI / 2 - 0.22, 0, 0);
  }
}

/** Welded stowage cage: rails, corner posts and rod walls. */
function basket(b: TurretBuilder, w: number, h: number, d: number, x: number, y: number, z: number) {
  const hw = w / 2;
  const hh = h / 2;
  const hd = d / 2;
  for (const sy of [-hh, hh]) {
    b.box(w, 0.05, 0.05, 'metal', x, y + sy, z - hd);
    b.box(w, 0.05, 0.05, 'metal', x, y + sy, z + hd);
    b.box(0.05, 0.05, d, 'metal', x - hw, y + sy, z);
    b.box(0.05, 0.05, d, 'metal', x + hw, y + sy, z);
  }
  for (const sx of [-hw, hw]) {
    for (const sz of [-hd, hd]) b.box(0.05, h, 0.05, 'metal', x + sx, y, z + sz);
  }
  const rods = 5;
  for (let i = 0; i < rods; i++) {
    const u = -hw + (w * i) / (rods - 1);
    b.box(0.035, h * 0.9, 0.035, 'metal', x + u, y, z + hd);
    b.box(0.035, h * 0.9, 0.035, 'metal', x + u, y, z - hd);
  }
  for (let i = 0; i < 4; i++) {
    b.box(w, 0.035, 0.035, 'dark', x, y - hh + 0.03, z - hd + (d * i) / 3);
  }
}

/** Armoured optic housing with a lit lens. */
function optic(b: TurretBuilder, x: number, y: number, z: number, len: number, r = 0.11) {
  b.box(r * 2.2, r * 2.2, len, 'metal', x, y, z);
  b.box(r * 2.5, r * 2.5, 0.06, 'metal', x, y, z + len / 2 - 0.08);
  b.box(r * 1.6, r * 1.6, 0.05, 'dark', x, y, z + len / 2 + 0.02);
  b.box(r * 1.0, r * 1.0, 0.04, 'lamp', x, y, z + len / 2 + 0.05);
}

/** Spare track links stowed on a turret flank. */
function spareLinks(
  b: TurretBuilder, side: 1 | -1, x: number, y: number, z: number, count: number, step: number,
) {
  for (let i = 0; i < count; i++) {
    b.box(0.09, 0.24, 0.17, 'dark', side * x, y, z + i * step);
  }
}

/** Short hose run that hugs a spherical shell — always just proud of it. */
function shellHose(
  b: TurretBuilder,
  R: number, cy: number, sy: number,
  side: 1 | -1, x: number, zFrom: number, zTo: number, steps: number,
) {
  for (let i = 0; i < steps; i++) {
    const z0 = zFrom + ((zTo - zFrom) * i) / steps;
    const z1 = zFrom + ((zTo - zFrom) * (i + 1)) / steps;
    const zc = (z0 + z1) / 2;
    const lift = Math.sqrt(Math.max(0, R * R - x * x - zc * zc));
    b.cyl(0.055, 0.055, Math.abs(z1 - z0) + 0.05, 8, 'dark',
      side * x, cy + sy * lift + 0.025, zc, Math.PI / 2, 0, 0);
  }
}

/** Muzzle brake: dark slotted body between two collars, ribs across the slots. */
function muzzleBrake(b: TurretBuilder, z: number, len: number, r: number, ribs: number) {
  b.cyl(r + 0.03, r + 0.03, 0.07, 12, 'metal', 0, 0, z - len / 2, Math.PI / 2, 0, 0);
  b.cyl(r, r, len, 12, 'dark', 0, 0, z, Math.PI / 2, 0, 0);
  b.cyl(r + 0.03, r + 0.03, 0.07, 12, 'metal', 0, 0, z + len / 2, Math.PI / 2, 0, 0);
  for (let i = 0; i < ribs; i++) {
    const a = (i / ribs) * Math.PI * 2;
    b.box(0.06, 0.06, len + 0.02, 'metal',
      Math.sin(a) * (r + 0.01), Math.cos(a) * (r + 0.01), z, 0, 0, -a);
  }
}

// ------------------------------------------------------------------- railgun

/**
 * Sniper. Long, low wedge with a capacitor bustle and a twin-rail barrel.
 * The bustle strips and the barrel rails share the `rail` slot, so the whole
 * weapon lights up as the shot charges.
 */
function buildRailgun(t: TurretBuilder, g: TurretBuilder): TurretLayout {
  turretRing(t, 1.22, 1.28);

  // --- Low wedge shell ---
  t.box(2.02, 0.52, 2.40, 'body', 0, 0.48, -0.10); // lower shell
  t.box(1.88, 0.12, 1.75, 'body', 0, 0.80, -0.35); // roof plate
  // Nose wedge: rear-top corner meets the roof, front-bottom drops to the chin.
  t.box(1.96, 0.20, 1.35, 'body', 0, 0.92, 0.78, 0.66, 0, 0);
  t.box(1.80, 0.44, 0.42, 'body', 0, 0.40, 1.16); // lower nose block
  for (const side of [-1, 1] as const) {
    t.box(0.10, 0.40, 2.30, 'metal', side * 1.02, 0.50, -0.10); // side appliqué
    t.box(0.07, 0.07, 2.30, 'dark', side * 1.07, 0.62, -0.10); // weld seam
    t.rivets(7, 0.035, 'metal', side * 1.05, 0.36, -0.10, 0, 0, 2.10);
    t.box(0.34, 0.18, 0.52, 'metal', side * 1.04, 0.30, 0.60); // wedge cheek appliqué
  }

  // --- Rear capacitor bustle (charges with the shot) ---
  t.box(1.80, 0.62, 0.90, 'body', 0, 0.62, -1.36);
  t.box(1.86, 0.09, 0.98, 'metal', 0, 0.96, -1.36);
  for (const x of [-0.60, 0, 0.60]) {
    t.cyl(0.20, 0.20, 0.52, 12, 'metal', x, 0.64, -1.90, 0, 0, Math.PI / 2);
    t.cyl(0.22, 0.22, 0.07, 12, 'dark', x, 0.64, -1.90, 0, 0, Math.PI / 2);
    t.box(0.44, 0.05, 0.10, 'rail', x, 0.86, -1.90); // capacitor strip
  }
  t.box(1.72, 0.05, 0.09, 'rail', 0, 0.92, -1.90); // bus bar ties the banks
  t.box(1.20, 0.30, 0.34, 'metal', 0, 0.62, -2.06); // armour cover
  t.rivets(6, 0.035, 'metal', 0, 0.99, -1.36, 1.60, 0, 0);

  // --- Crew hatches, optics, sensor mast ---
  cupola(t, -0.50, 0.86, -0.62, 0.40);
  t.cyl(0.32, 0.34, 0.10, 12, 'metal', 0.52, 0.90, -0.52); // loader hatch
  t.cyl(0.06, 0.06, 0.12, 8, 'metal', 0.52, 0.97, -0.52);
  optic(t, 0.66, 0.70, 0.62, 0.80); // gunner's sight
  t.box(0.10, 0.34, 0.10, 'metal', -0.66, 1.00, 0.30); // sensor mast
  t.box(0.24, 0.14, 0.18, 'metal', -0.66, 1.20, 0.30);
  t.box(0.14, 0.08, 0.05, 'lamp', -0.66, 1.20, 0.40);

  // --- Cheek details ---
  for (const side of [-1, 1] as const) {
    smokeLaunchers(t, side, 0.92, 0.72, 0.42);
    spareLinks(t, side, 1.06, 0.62, 0.10, 3, 0.28);
    t.box(0.10, 0.10, 0.50, 'metal', side * 1.02, 0.76, -0.72); // grab handle
  }
  basket(t, 1.10, 0.34, 0.44, 0.62, 0.44, -1.72);
  t.cyl(0.05, 0.06, 0.14, 8, 'metal', 0.86, 0.94, -1.10); // antenna base

  // --- Mantlet ---
  t.box(1.04, 0.82, 0.42, 'metal', 0, 0.52, 1.20);
  t.cyl(0.34, 0.38, 0.22, 14, 'dark', 0, 0.52, 1.34, Math.PI / 2, 0, 0);
  for (const side of [-1, 1] as const) {
    t.cyl(0.10, 0.10, 0.50, 10, 'metal', side * 0.56, 0.28, 1.02, Math.PI / 2, 0, 0);
  }

  // --- Barrel: open rail housing with twin glowing rails on top, ringed by
  //     accelerator coils, ending in a focusing array.
  g.box(0.56, 0.56, 0.66, 'metal', 0, 0, 0.33); // breech
  g.box(0.42, 0.42, 0.26, 'metal', 0, 0, 0.78); // transition
  g.pipe(0.17, 0.21, 2.00, 14, 'metal', 0, 0, 1.44); // main bore (spans 0.44..2.44)
  for (const side of [-1, 1] as const) {
    g.box(0.11, 0.18, 2.00, 'metal', side * 0.11, 0.18, 1.50); // rail housing
    g.box(0.06, 0.13, 2.02, 'rail', side * 0.11, 0.20, 1.50); // glowing rail
  }
  for (const z of [0.92, 1.22, 1.52, 1.82, 2.12]) {
    g.box(0.30, 0.07, 0.08, 'metal', 0, 0.26, z); // cross bridge
  }
  for (const z of [1.00, 1.35, 1.70, 2.05]) {
    g.cyl(0.28, 0.28, 0.10, 14, 'metal', 0, 0, z, Math.PI / 2, 0, 0); // coil ring
    g.cyl(0.22, 0.22, 0.13, 10, 'dark', 0, 0, z, Math.PI / 2, 0, 0);
  }
  // Focusing muzzle array
  g.cyl(0.26, 0.30, 0.16, 14, 'metal', 0, 0, 2.56, Math.PI / 2, 0, 0);
  g.cyl(0.22, 0.22, 0.18, 12, 'dark', 0, 0, 2.66, Math.PI / 2, 0, 0);
  g.cyl(0.20, 0.17, 0.12, 12, 'metal', 0, 0, 2.80, Math.PI / 2, 0, 0);
  g.box(0.05, 0.24, 0.08, 'rail', 0, 0, 2.92); // final emitter

  return { barrelY: BARREL_REST_Y, muzzleZ: 3.20 };
}

// -------------------------------------------------------------- flamethrower

/**
 * Close-assault. Rounded cast dome with external fuel drums feeding a twin
 * nozzle. Soft silhouette to contrast with the railgun's wedge.
 */
function buildFlamethrower(t: TurretBuilder, g: TurretBuilder): TurretLayout {
  // Dome surface helper: sphere of radius R centred at cy, squashed by sy on Y.
  const R = 1.10;
  const CY = 0.36;
  const SY = 0.70;
  const domeY = (x: number, z: number) =>
    CY + SY * Math.sqrt(Math.max(0, R * R - x * x - z * z));

  turretRing(t, 1.24, 1.30);
  t.cyl(1.26, 1.32, 0.36, 24, 'body', 0, 0.18, 0); // base band
  t.cyl(1.28, 1.28, 0.06, 24, 'metal', 0, 0.38, 0);

  // --- Cast dome ---
  t.add(new THREE.SphereGeometry(R, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.5), 'body',
    0, CY, 0, 0, 0, 0, 1, SY, 1);
  t.cyl(1.06, 1.06, 0.08, 24, 'body', 0, CY + 0.02, 0); // closes the shell
  t.cyl(1.02, 1.04, 0.11, 24, 'metal', 0, 0.66, 0); // appliqué belt
  t.rivetRing(20, 0.035, 'metal', 0, 0.72, 0, 1.03);

  // --- Rear fuel drums on a rack ---
  t.box(1.62, 0.10, 0.52, 'metal', 0, 0.40, -1.12);
  for (const side of [-1, 1] as const) {
    const x = side * 0.62;
    t.cyl(0.30, 0.30, 0.86, 14, 'metal', x, 0.62, -1.15, Math.PI / 2, 0, 0);
    t.cyl(0.31, 0.31, 0.07, 14, 'dark', x, 0.62, -0.74, Math.PI / 2, 0, 0);
    t.cyl(0.31, 0.31, 0.07, 14, 'dark', x, 0.62, -1.56, Math.PI / 2, 0, 0);
    t.cyl(0.32, 0.32, 0.06, 14, 'metal', x, 0.62, -0.98, Math.PI / 2, 0, 0);
    t.cyl(0.32, 0.32, 0.06, 14, 'metal', x, 0.62, -1.32, Math.PI / 2, 0, 0);
    t.cyl(0.11, 0.11, 0.06, 10, 'metal', x, 0.62, -1.62, Math.PI / 2, 0, 0); // valve
    t.box(0.16, 0.22, 0.30, 'metal', x, 0.50, -1.10); // cradle
    // Hose from the drum head, over the shoulder, down to the mantlet.
    shellHose(t, R, CY, SY, side, 0.62, -0.72, 0.98, 9);
  }
  t.box(0.52, 0.26, 0.34, 'metal', 0, 0.62, -0.86); // manifold

  // --- Crew hatches, vision ports ---
  cupola(t, -0.34, domeY(-0.34, -0.22) + 0.06, -0.22, 0.38);
  t.cyl(0.30, 0.32, 0.10, 12, 'metal', 0.46, domeY(0.46, -0.10) + 0.03, -0.10);
  for (const x of [-0.26, 0.26]) {
    t.box(0.22, 0.10, 0.08, 'dark', x, 0.62, 1.00); // vision slit
  }
  t.box(0.50, 0.12, 0.10, 'metal', 0, 0.86, 0.86); // sight hood

  // --- Cheek details ---
  for (const side of [-1, 1] as const) {
    t.box(0.34, 0.26, 0.52, 'metal', side * 0.98, 0.52, -0.30); // stowage box
    t.box(0.38, 0.06, 0.56, 'metal', side * 0.98, 0.67, -0.30);
    t.cyl(0.05, 0.05, 0.34, 8, 'metal', side * 1.06, 0.44, -0.30, 0, 0, Math.PI / 2);
    t.rivets(4, 0.03, 'metal', side * 1.10, 0.62, -0.30, 0, 0, 0.42);
  }
  t.cyl(0.05, 0.06, 0.14, 8, 'metal', -0.78, domeY(-0.78, -0.55) + 0.05, -0.55);

  // --- Mantlet ---
  t.box(0.88, 0.66, 0.38, 'metal', 0, 0.45, 1.14);
  t.cyl(0.28, 0.32, 0.18, 14, 'dark', 0, 0.45, 1.28, Math.PI / 2, 0, 0);
  for (const side of [-1, 1] as const) {
    t.box(0.10, 0.30, 0.28, 'metal', side * 0.50, 0.26, 1.00);
  }

  // --- Barrel: twin nozzles with igniter rings ---
  g.box(0.54, 0.34, 0.44, 'metal', 0, 0, 0.28); // nozzle block
  g.box(0.66, 0.18, 0.30, 'metal', 0, 0.20, 0.62); // pressure manifold
  for (const side of [-1, 1] as const) {
    g.pipe(0.13, 0.16, 1.32, 10, 'metal', side * 0.24, 0, 1.02);
    g.cyl(0.19, 0.15, 0.22, 10, 'metal', side * 0.24, 0, 1.76, Math.PI / 2, 0, 0);
    g.cyl(0.21, 0.21, 0.09, 10, 'metal', side * 0.24, 0, 1.90, Math.PI / 2, 0, 0);
    g.box(0.20, 0.20, 0.05, 'lamp', side * 0.24, 0, 1.96); // pilot flame
    g.box(0.08, 0.30, 0.10, 'metal', side * 0.42, 0.04, 0.86); // igniter rod
  }
  g.box(0.72, 0.09, 0.86, 'metal', 0, 0.24, 1.10); // heat shield
  g.cyl(0.05, 0.05, 0.70, 8, 'dark', -0.24, -0.16, 0.95, Math.PI / 2 - 0.35, 0, 0);
  g.cyl(0.05, 0.05, 0.70, 8, 'dark', 0.24, -0.16, 0.95, Math.PI / 2 - 0.35, 0, 0);

  return { barrelY: 0.45, muzzleZ: 1.95 };
}

// -------------------------------------------------------------------- cannon

/** Rapid-fire autocannon: boxy autoloader turret, slotted brake, feed chute. */
function buildCannon(t: TurretBuilder, g: TurretBuilder): TurretLayout {
  turretRing(t, 1.22, 1.28);

  // --- Boxy shell with a sloped nose ---
  t.box(2.12, 0.54, 2.20, 'body', 0, 0.48, -0.14); // lower shell
  t.box(1.86, 0.44, 1.55, 'body', 0, 0.95, -0.32); // fighting compartment
  t.box(1.92, 0.12, 1.70, 'body', 0, 1.19, -0.34); // roof plate
  // Wedge: top-rear corner meets the roof's front edge, nose drops to the chin.
  t.box(1.80, 0.44, 1.05, 'body', 0, 0.90, 0.90, 0.55, 0, 0);
  t.box(1.94, 0.50, 0.52, 'body', 0, 0.44, 1.12); // lower nose block
  for (const side of [-1, 1] as const) {
    t.box(0.12, 0.42, 2.10, 'metal', side * 1.08, 0.52, -0.14); // side skirt
    t.box(0.07, 0.07, 2.10, 'dark', side * 1.13, 0.66, -0.14);
    t.rivets(7, 0.035, 'metal', side * 1.11, 0.38, -0.14, 0, 0, 1.90);
    spareLinks(t, side, 1.16, 0.60, 0.20, 4, 0.26);
  }

  // --- Autoloader bustle with ammo drums and a feed chute ---
  t.box(1.72, 0.72, 0.88, 'body', 0, 0.92, -1.34);
  t.box(1.78, 0.10, 0.96, 'metal', 0, 1.30, -1.34);
  for (const side of [-1, 1] as const) {
    t.cyl(0.26, 0.26, 0.74, 12, 'metal', side * 0.44, 1.46, -1.34, Math.PI / 2, 0, 0);
    t.cyl(0.28, 0.28, 0.07, 12, 'dark', side * 0.44, 1.46, -1.02, Math.PI / 2, 0, 0);
    t.cyl(0.28, 0.28, 0.07, 12, 'dark', side * 0.44, 1.46, -1.66, Math.PI / 2, 0, 0);
  }
  t.box(0.34, 0.26, 0.62, 'metal', 0, 1.06, -0.86); // feed chute
  t.box(0.30, 0.06, 0.66, 'dark', 0, 1.20, -0.86);
  t.box(1.24, 0.28, 0.40, 'metal', 0, 0.72, -1.78); // ready-rack cover
  t.rivets(6, 0.035, 'metal', 0, 1.33, -1.34, 1.50, 0, 0);

  // --- Crew hatches, optics, MG ---
  cupola(t, -0.52, 1.25, -0.52, 0.40);
  t.cyl(0.32, 0.34, 0.10, 12, 'metal', 0.54, 1.29, -0.44);
  t.cyl(0.06, 0.06, 0.12, 8, 'metal', 0.54, 1.36, -0.44);
  optic(t, 0.70, 0.86, 0.66, 0.72);
  t.cyl(0.09, 0.09, 0.34, 10, 'metal', 0.34, 1.44, 0.10, Math.PI / 2, 0, 0); // MG barrel
  t.box(0.18, 0.20, 0.26, 'metal', 0.34, 1.38, -0.10); // MG mount

  // --- Cheek details ---
  for (const side of [-1, 1] as const) {
    smokeLaunchers(t, side, 1.00, 0.94, 0.46);
    t.box(0.10, 0.10, 0.46, 'metal', side * 1.10, 0.80, -0.70);
  }
  basket(t, 1.16, 0.36, 0.46, 0.66, 0.50, -1.74);
  t.cyl(0.05, 0.06, 0.14, 8, 'metal', -0.92, 1.28, -1.02); // antenna base

  // --- Mantlet ---
  t.box(1.06, 0.84, 0.42, 'metal', 0, 0.55, 1.24);
  t.cyl(0.30, 0.34, 0.20, 14, 'dark', 0, 0.55, 1.38, Math.PI / 2, 0, 0);
  for (const side of [-1, 1] as const) {
    t.cyl(0.10, 0.10, 0.52, 10, 'metal', side * 0.56, 0.30, 1.04, Math.PI / 2, 0, 0);
  }

  // --- Barrel: evacuator, thermal sleeve rings, slotted brake ---
  g.box(0.50, 0.50, 0.60, 'metal', 0, 0, 0.30); // breech
  g.pipe(0.20, 0.23, 1.80, 14, 'metal', 0, 0, 1.20); // main tube
  g.cyl(0.30, 0.30, 0.42, 12, 'metal', 0, 0, 1.14, Math.PI / 2, 0, 0); // evacuator
  g.cyl(0.32, 0.32, 0.07, 12, 'dark', 0, 0, 0.95, Math.PI / 2, 0, 0);
  g.cyl(0.32, 0.32, 0.07, 12, 'dark', 0, 0, 1.33, Math.PI / 2, 0, 0);
  g.cyl(0.26, 0.26, 0.10, 12, 'metal', 0, 0, 0.70, Math.PI / 2, 0, 0);
  g.cyl(0.26, 0.26, 0.10, 12, 'metal', 0, 0, 1.70, Math.PI / 2, 0, 0);
  for (const side of [-1, 1] as const) {
    g.pipe(0.11, 0.11, 0.96, 8, 'metal', side * 0.30, -0.14, 0.90); // recoil cylinder
  }
  muzzleBrake(g, 2.40, 0.50, 0.25, 6);
  g.cyl(0.21, 0.23, 0.10, 12, 'metal', 0, 0, 2.72, Math.PI / 2, 0, 0);

  return { barrelY: 0.55, muzzleZ: 2.80 };
}

// ------------------------------------------------------------------- wiring

/** Authors `(turret, barrel)` builders; returns where the gun is seated. */
type TurretAuthor = (t: TurretBuilder, g: TurretBuilder) => TurretLayout;

const TURRET_BUILDERS: Record<TurretId, TurretAuthor> = {
  railgun: buildRailgun,
  flamethrower: buildFlamethrower,
  cannon: buildCannon,
};

interface TurretGeometry {
  shell: TurretSlotSet;
  barrel: TurretSlotSet;
  layout: TurretLayout;
}

const geometryCache = new Map<TurretId, TurretGeometry>();

/** Merged turret geometry for a turret id — built once, shared for the process. */
export function turretGeometry(turretId: TurretId): TurretGeometry {
  let set = geometryCache.get(turretId);
  if (!set) {
    const shell = new TurretBuilder();
    const barrel = new TurretBuilder();
    const layout = TURRET_BUILDERS[turretId](shell, barrel);
    set = { shell: shell.build(), barrel: barrel.build(), layout };
    geometryCache.set(turretId, set);
  }
  return set;
}

export function buildTurret(ctx: TankBuildContext, turretId: TurretId) {
  const { shell, barrel, layout } = turretGeometry(turretId);

  // The rail slot only exists where a per-tank emissive material is wanted:
  // charge FX animates `emissiveIntensity`, so it cannot be the shared accent.
  if (shell.rail || barrel.rail) {
    ctx.railGlowMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      emissive: new THREE.Color(ctx.style.glow),
      emissiveIntensity: 0.15,
      roughness: 0.2,
      metalness: 0.8,
    });
  }

  const materials: Partial<Record<TurretSlot, THREE.Material>> = {
    body: ctx.turretMat,
    metal: ctx.metalMat,
    dark: ctx.darkMat,
    lamp: ctx.lampMat,
    rail: ctx.railGlowMat,
  };

  const attach = (group: THREE.Object3D, set: TurretSlotSet) => {
    for (const slot of TURRET_SLOTS) {
      const geo = set[slot];
      const mat = materials[slot];
      if (!geo || !mat) continue;
      group.add(new THREE.Mesh(geo, mat));
    }
  };

  attach(ctx.turret, shell);

  ctx.barrelGroup.position.set(0, layout.barrelY, BARREL_REST_Z);
  ctx.turret.add(ctx.barrelGroup);
  attach(ctx.barrelGroup, barrel);

  ctx.muzzle.position.z = layout.muzzleZ;
  ctx.barrelGroup.add(ctx.muzzle);
}
