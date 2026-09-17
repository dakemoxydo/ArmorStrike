// ===== Procedural hulls: hunter / viking / mammoth / speedy / titan =====
//
// Each hull is authored as a pile of small primitives (armour plates, road
// wheels, hatches, louvers, rivets, tow hooks) and fused into one geometry per
// material slot by `HullBuilder`. Geometry depends only on `hullId`, so it is
// built once per process and `markShared`; per-tank we only create materials,
// because FX tint `bodyMats` per tank (hit flash, HP darkening, death fade).
//
// Conventions: +Z is forward, +X is right, Y is up, ground at Y=0.
import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
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
 * Full running gear for one side: continuous closed-loop track belt with UVs mapped along
 * the perimeter, sprocket teeth, road wheels with rubber tires and steel hubs.
 */
function buildTrack(b: HullBuilder, side: 1 | -1, s: TrackSpec) {
  const x = side * s.x;
  const slot: HullSlot = side === -1 ? 'trackLeft' : 'trackRight';
  const endR = s.wheelR + s.linkH * 0.5;
  const frontEndZ = s.front - endR * 0.5;
  const rearEndZ = s.rear + endR * 0.5;

  // Continuous closed track loop: outer tread, inner face, side walls with seamless UVs
  b.trackLoop(slot, x, s.width, s.linkH, s.wheelR, s.wheelY, frontEndZ, rearEndZ);

  // Loop ends: idler (front) and drive sprocket (rear) inside the band.
  b.wheel(s.wheelR * 0.94, s.width * 0.92, 14, 'dark', x, s.wheelY, frontEndZ);
  b.wheel(s.wheelR * 0.94, s.width * 0.92, 14, 'dark', x, s.wheelY, rearEndZ);
  b.wheel(s.hubR, s.width + 0.12, 12, 'metal', x, s.wheelY, frontEndZ);
  b.wheel(s.hubR, s.width + 0.12, 12, 'metal', x, s.wheelY, rearEndZ);
  b.wheel(s.hubR * 0.45, s.width + 0.16, 8, 'dark', x, s.wheelY, frontEndZ);
  b.wheel(s.hubR * 0.45, s.width + 0.16, 8, 'dark', x, s.wheelY, rearEndZ);

  // Sprocket teeth on the rear rim: inside the loop radius
  const toothR = endR - 0.05;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    b.box(s.width + 0.10, 0.12, 0.10, 'metal',
      x, s.wheelY + Math.cos(a) * toothR, rearEndZ + Math.sin(a) * toothR, a, 0, 0);
  }

  // Road wheels + rubber tires + metal hubs
  const firstZ = rearEndZ + endR * 1.15;
  const lastZ = frontEndZ - endR * 1.15;
  const n = Math.max(2, s.wheelCount);
  for (let i = 0; i < n; i++) {
    const z = firstZ + (i / (n - 1)) * (lastZ - firstZ);
    // Road wheel outer rubber tire
    b.wheel(s.wheelR * 0.94, s.wheelWidth, 12, 'dark', x, s.wheelY, z);
    // Road wheel dish & hub
    b.wheel(s.wheelR * 0.65, s.wheelWidth + 0.04, 10, 'metal', x, s.wheelY, z);
    b.wheel(s.wheelR * 0.30, s.wheelWidth + 0.08, 8, 'dark', x, s.wheelY, z);
  }
}

// ------------------------------------------------------------------- hunter

/** Medium universal MBT (внешняя генерация, итерация 1): lofted-ванна + фасеточный
 * верхний корпус, chamfer-панели (Extrude), шланги-трубы, асимметричный ЗИП.
 * Адаптация: chamferBoxGeo обёрнут в mergeVertices — сырой ExtrudeGeometry
 * неиндексированный и ронял бы mergeGeometries всего слота (build() бросает).
 */
function buildHunter(b: HullBuilder) {
  for (const side of [-1, 1] as const) buildTrack(b, side, {
    x: 1.42, width: 0.70, wheelWidth: 0.86,
    front: 2.18, rear: -2.18,
    wheelR: 0.30, wheelY: 0.46, wheelCount: 6,
    linkH: 0.14, hubR: 0.30,
  });

  type Slot = 'body' | 'metal' | 'dark' | 'lamp';
  type LoftStation = {
    z: number;
    yb: number;
    ys: number;
    yt: number;
    hb: number;
    hs: number;
    ht: number;
  };

  const loftGeo = (stations: LoftStation[]): THREE.BufferGeometry => {
    const ringSize = 6;
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (const s of stations) {
      const ring = [
        [-s.hb, s.yb],
        [s.hb, s.yb],
        [s.hs, s.ys],
        [s.ht, s.yt],
        [-s.ht, s.yt],
        [-s.hs, s.ys],
      ];

      for (const [x, y] of ring) {
        positions.push(x, y, s.z);
        uvs.push((x + 2.0) / 4.0, (s.z + 2.6) / 5.2);
      }
    }

    for (let i = 0; i < stations.length - 1; i++) {
      for (let j = 0; j < ringSize; j++) {
        const k = (j + 1) % ringSize;
        const a = i * ringSize + j;
        const c = i * ringSize + k;
        const d = (i + 1) * ringSize + j;
        const e = (i + 1) * ringSize + k;
        indices.push(a, e, d, a, c, e);
      }
    }

    for (let j = 1; j < ringSize - 1; j++) {
      indices.push(0, j + 1, j);
    }

    const front = (stations.length - 1) * ringSize;
    for (let j = 1; j < ringSize - 1; j++) {
      indices.push(front, front + j, front + j + 1);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geo.setAttribute(
      'uv',
      new THREE.Float32BufferAttribute(uvs, 2),
    );
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  };

  const chamferBoxGeo = (
    w: number,
    h: number,
    d: number,
    chamfer: number,
  ): THREE.BufferGeometry => {
    const hw = w * 0.5;
    const hh = h * 0.5;
    const c = Math.min(chamfer, hw * 0.49, hh * 0.49);
    const shape = new THREE.Shape();

    shape.moveTo(-hw + c, -hh);
    shape.lineTo(hw - c, -hh);
    shape.lineTo(hw, -hh + c);
    shape.lineTo(hw, hh - c);
    shape.lineTo(hw - c, hh);
    shape.lineTo(-hw + c, hh);
    shape.lineTo(-hw, hh - c);
    shape.lineTo(-hw, -hh + c);
    shape.closePath();

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: d,
      steps: 1,
      bevelEnabled: false,
      curveSegments: 1,
    });
    geo.translate(0, 0, -d * 0.5);
    // Сырой Extrude неиндексированный — без mergeVertices роняет merge слота.
    return mergeVertices(geo);
  };

  const addChamfer = (
    w: number,
    h: number,
    d: number,
    chamfer: number,
    slot: Slot,
    x: number,
    y: number,
    z: number,
    rx = 0,
    ry = 0,
    rz = 0,
  ): void => {
    b.add(
      chamferBoxGeo(w, h, d, chamfer),
      slot,
      x, y, z,
      rx, ry, rz,
      1, 1, 1,
    );
  };

  const glacisAngle = 0.49;
  const glacisY = (z: number): number =>
    1.80 - (z - 1.05) * (0.75 / 1.37);

  const glacisBox = (
    w: number,
    h: number,
    d: number,
    slot: Slot,
    x: number,
    z: number,
    lift: number,
    ry = 0,
    rz = 0,
  ): void => {
    b.box(
      w, h, d, slot,
      x, glacisY(z) + lift, z,
      glacisAngle, ry, rz,
    );
  };

  // Narrow armored bathtub: kept inside the inner edges of the tracks.
  b.add(
    loftGeo([
      {
        z: -2.31,
        yb: 0.30, ys: 0.72, yt: 0.98,
        hb: 0.78, hs: 0.94, ht: 0.98,
      },
      {
        z: -1.62,
        yb: 0.24, ys: 0.82, yt: 1.07,
        hb: 0.96, hs: 1.03, ht: 1.08,
      },
      {
        z: 1.54,
        yb: 0.24, ys: 0.81, yt: 1.04,
        hb: 0.96, hs: 1.03, ht: 1.07,
      },
      {
        z: 2.42,
        yb: 0.37, ys: 0.70, yt: 0.87,
        hb: 0.66, hs: 0.84, ht: 0.79,
      },
    ]),
    'body',
    0, 0, 0,
    0, 0, 0,
    1, 1, 1,
  );

  b.box(
    1.82, 0.075, 3.55, 'dark',
    0, 0.285, -0.04,
    0, 0, 0,
  );

  // Main faceted upper shell and long sloped glacis.
  b.add(
    loftGeo([
      {
        z: -2.28,
        yb: 0.82, ys: 1.08, yt: 1.42,
        hb: 0.93, hs: 1.24, ht: 1.06,
      },
      {
        z: -1.62,
        yb: 0.92, ys: 1.27, yt: 1.72,
        hb: 1.01, hs: 1.44, ht: 1.20,
      },
      {
        z: -1.35,
        yb: 0.94, ys: 1.31, yt: 1.80,
        hb: 1.02, hs: 1.45, ht: 1.22,
      },
      {
        z: 1.05,
        yb: 0.94, ys: 1.30, yt: 1.80,
        hb: 1.02, hs: 1.44, ht: 1.20,
      },
      {
        z: 2.42,
        yb: 0.71, ys: 0.99, yt: 1.05,
        hb: 0.75, hs: 1.08, ht: 0.87,
      },
    ]),
    'body',
    0, 0, 0,
    0, 0, 0,
    1, 1, 1,
  );

  // Full over-track fenders with tapered front ends.
  for (const side of [-1, 1] as const) {
    b.box(
      0.60, 0.12, 3.46, 'body',
      side * 1.64, 1.02, -0.20,
      0, 0, 0,
    );
    b.box(
      0.54, 0.12, 0.92, 'body',
      side * 1.55, 1.02, 1.92,
      0, -side * 0.16, 0,
    );
    b.box(
      0.58, 0.12, 0.36, 'body',
      side * 1.64, 1.02, -2.10,
      0, 0, 0,
    );
    b.box(
      0.05, 0.17, 3.44, 'body',
      side * 1.93, 1.065, -0.20,
      0, 0, 0,
    );

    // Rubber rear mud flaps sit behind, not inside, the standard loop.
    b.box(
      0.56, 0.46, 0.055, 'dark',
      side * 1.64, 0.72, -2.37,
      0, 0, 0,
    );

    // M3-inspired segmented side sponsons.
    addChamfer(
      0.46, 0.34, 1.04, 0.075, 'body',
      side * 1.53, 1.29, 0.83,
    );
    addChamfer(
      0.50, 0.40, 0.78, 0.085, 'body',
      side * 1.53, 1.34, -0.18,
    );
    addChamfer(
      0.46, 0.38, 0.90, 0.08, 'body',
      side * 1.53, 1.32, -1.22,
    );

    for (const z of [0.29, -0.67, -1.72]) {
      b.box(
        0.025, 0.22, 0.075, 'dark',
        side * 1.77, 1.29, z,
        0, 0, 0,
      );
    }

    // Fender hinges and supports, all above the track band.
    for (const z of [-1.78, -0.88, 0.03, 0.94]) {
      b.box(
        0.13, 0.12, 0.07, 'body',
        side * 1.82, 1.12, z,
        0, 0, 0,
      );
    }
  }

  // Broad, flat turret deck and clean 1.3-radius interface.
  addChamfer(
    2.86, 0.10, 2.50, 0.15, 'body',
    0, 1.81, -0.12,
  );

  b.cyl(
    1.28, 1.32, 0.10, 48, 'body',
    0, 1.89, -0.10,
    0, 0, 0,
  );

  b.add(
    new THREE.TorusGeometry(1.30, 0.025, 6, 48),
    'dark',
    0, 1.915, -0.10,
    Math.PI * 0.5, 0, 0,
    1, 1, 1,
  );

  // Offset driver's hatch on the upper glacis.
  addChamfer(
    0.68, 0.035, 0.52, 0.08, 'dark',
    -0.38, glacisY(1.43) + 0.025, 1.43,
    glacisAngle,
  );
  addChamfer(
    0.60, 0.060, 0.45, 0.075, 'body',
    -0.38, glacisY(1.43) + 0.060, 1.43,
    glacisAngle,
  );

  // Driver periscopes with small armored brows.
  for (const x of [-0.56, -0.38, -0.20]) {
    b.box(
      0.15, 0.060, 0.10, 'body',
      x, glacisY(1.24) + 0.070, 1.24,
      glacisAngle, 0, 0,
    );
    b.box(
      0.10, 0.035, 0.045, 'dark',
      x, glacisY(1.27) + 0.085, 1.27,
      glacisAngle, 0, 0,
    );
  }

  // Lower central glacis appliqué.
  addChamfer(
    1.34, 0.030, 0.68, 0.07, 'dark',
    0, glacisY(2.00) + 0.020, 2.00,
    glacisAngle,
  );
  addChamfer(
    1.18, 0.055, 0.58, 0.07, 'body',
    0, glacisY(2.00) + 0.055, 2.00,
    glacisAngle,
  );

  for (const x of [-0.48, -0.29, -0.10, 0.10, 0.29, 0.48]) {
    b.sphere(
      0.025, 'metal',
      x, glacisY(1.79) + 0.075, 1.79,
      7, 5,
    );
  }

  // Hunter's characteristic paired front-side intake recesses.
  for (const side of [-1, 1] as const) {
    addChamfer(
      0.31, 0.045, 0.48, 0.06, 'dark',
      side * 1.01, glacisY(1.80) + 0.042, 1.80,
      glacisAngle,
    );

    for (const z of [1.67, 1.82, 1.97]) {
      glacisBox(
        0.30, 0.025, 0.045, 'body',
        side * 1.01, z, 0.072,
      );
    }

    // Slender reinforcing strips guide the eye toward the turret ring.
    glacisBox(
      0.09, 0.045, 0.70, 'body',
      side * 0.77, 1.62, 0.055,
      -side * 0.09,
    );
  }

  // Low, armored prow.
  addChamfer(
    1.56, 0.22, 0.20, 0.055, 'body',
    0, 0.76, 2.34,
  );
  b.box(
    1.22, 0.045, 0.035, 'dark',
    0, 0.72, 2.445,
    0, 0, 0,
  );

  // Deep-set headlights: lamp is used nowhere else.
  for (const side of [-1, 1] as const) {
    b.box(
      0.34, 0.070, 0.085, 'body',
      side * 0.74, 1.075, 2.39,
      0, 0, 0,
    );
    b.cyl(
      0.16, 0.16, 0.070, 16, 'dark',
      side * 0.74, 0.94, 2.445,
      Math.PI * 0.5, 0, 0,
    );
    b.cyl(
      0.105, 0.105, 0.022, 16, 'lamp',
      side * 0.74, 0.94, 2.482,
      Math.PI * 0.5, 0, 0,
    );

    b.add(
      new THREE.TorusGeometry(0.085, 0.024, 6, 14),
      'metal',
      side * 0.55, 0.56, 2.465,
      0, 0, 0,
      1, 1, 1,
    );
  }

  // Raised rear engine-deck volume.
  addChamfer(
    2.28, 0.18, 0.66, 0.11, 'body',
    0, 1.69, -1.84,
  );

  // Twin inset radiator grilles with strong body-colored ribs.
  for (const side of [-1, 1] as const) {
    b.box(
      0.94, 0.022, 0.54, 'dark',
      side * 0.55, 1.795, -1.84,
      0, 0, 0,
    );

    for (let j = -2; j <= 2; j++) {
      b.box(
        0.045, 0.030, 0.50, 'body',
        side * 0.55 + j * 0.17, 1.818, -1.84,
        0, 0, 0,
      );
    }
  }

  b.box(
    0.16, 0.045, 0.61, 'body',
    0, 1.82, -1.84,
    0, 0, 0,
  );

  b.box(
    1.72, 0.022, 0.13, 'dark',
    0, 1.795, -2.13,
    0, 0, 0,
  );
  for (const x of [-0.72, -0.48, -0.24, 0, 0.24, 0.48, 0.72]) {
    b.box(
      0.045, 0.030, 0.11, 'body',
      x, 1.818, -2.13,
      0, 0, 0,
    );
  }

  // Rear access recess and bolted transmission cover.
  b.box(
    1.40, 0.40, 0.028, 'dark',
    0, 1.04, -2.292,
    0, 0, 0,
  );
  addChamfer(
    0.90, 0.25, 0.035, 0.055, 'body',
    0, 1.03, -2.317,
  );
  b.rivets(
    5, 0.026, 'metal',
    -0.38, 0.91, -2.34,
    0.19, 0, 0,
  );

  // HD-inspired twin rear exhaust shrouds and dark outlet pipes.
  for (const side of [-1, 1] as const) {
    addChamfer(
      0.42, 0.28, 0.25, 0.065, 'body',
      side * 0.75, 1.31, -2.18,
    );
    b.cyl(
      0.18, 0.19, 0.09, 16, 'body',
      side * 0.75, 1.31, -2.30,
      Math.PI * 0.5, 0, 0,
    );
    b.pipe(
      0.14, 0.15, 0.28, 16, 'dark',
      side * 0.75, 1.31, -2.41,
      side * 0.05, 0,
    );

    b.add(
      new THREE.TorusGeometry(0.075, 0.022, 6, 12),
      'metal',
      side * 0.54, 0.54, -2.33,
      0, 0, 0,
      1, 1, 1,
    );
  }

  // Right-side armored stowage box.
  addChamfer(
    0.22, 0.27, 0.62, 0.045, 'body',
    1.69, 1.55, -1.13,
  );
  b.box(
    0.025, 0.20, 0.52, 'dark',
    1.815, 1.55, -1.13,
    0, 0, 0,
  );

  // Left-side cylindrical stowage canister.
  b.pipe(
    0.115, 0.115, 0.56, 12, 'body',
    -1.69, 1.49, -1.13,
    0, 0,
  );
  b.cyl(
    0.09, 0.09, 0.026, 12, 'dark',
    -1.69, 1.49, -1.425,
    Math.PI * 0.5, 0, 0,
  );
  b.cyl(
    0.09, 0.09, 0.026, 12, 'dark',
    -1.69, 1.49, -0.835,
    Math.PI * 0.5, 0, 0,
  );

  // Spare links on the right-front fender.
  for (const z of [0.55, 0.76, 0.97, 1.18]) {
    b.box(
      0.34, 0.070, 0.15, 'body',
      1.66, 1.145, z,
      0, 0, 0,
    );
    b.box(
      0.18, 0.022, 0.065, 'dark',
      1.66, 1.192, z,
      0, 0, 0,
    );
  }

  // Shovel/tool on the left fender.
  b.pipe(
    0.022, 0.022, 0.92, 8, 'metal',
    -1.83, 1.145, 0.70,
    0, 0,
  );
  addChamfer(
    0.18, 0.045, 0.22, 0.025, 'body',
    -1.83, 1.15, 1.25,
  );
  b.box(
    0.09, 0.055, 0.12, 'body',
    -1.83, 1.15, 0.17,
    0, 0, 0,
  );

  // Tow cable following the left sponson line.
  const cableCurve = new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(-1.78, 1.43, -1.55),
      new THREE.Vector3(-1.83, 1.52, -0.82),
      new THREE.Vector3(-1.83, 1.47, 0.12),
      new THREE.Vector3(-1.79, 1.36, 1.26),
    ],
    false,
    'centripetal',
  );
  b.add(
    new THREE.TubeGeometry(cableCurve, 24, 0.025, 6, false),
    'metal',
    0, 0, 0,
    0, 0, 0,
    1, 1, 1,
  );

  for (const z of [-1.25, -0.28, 0.72]) {
    b.box(
      0.07, 0.10, 0.10, 'body',
      -1.79, 1.43, z,
      0, 0, 0,
    );
  }

  // Fuel cap opposite an asymmetric antenna mount.
  b.cyl(
    0.105, 0.13, 0.075, 16, 'body',
    -1.18, 1.82, -1.47,
    0, 0, 0,
  );
  b.cyl(
    0.065, 0.065, 0.022, 14, 'dark',
    -1.18, 1.87, -1.47,
    0, 0, 0,
  );

  b.cyl(
    0.11, 0.15, 0.12, 14, 'body',
    1.20, 1.84, -1.47,
    0, 0, 0,
  );
  b.cyl(
    0.018, 0.026, 0.36, 8, 'metal',
    1.20, 2.05, -1.47,
    0, 0, 0,
  );
  b.sphere(
    0.025, 'metal',
    1.20, 2.245, -1.47,
    8, 6,
  );

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

// -------------------------------------------------------------------- titan

/**
 * Super-heavy flagship hull — the widest, longest and tallest chassis in the
 * game, and the only one whose rear deck is dominated by a circular engine
 * grille instead of louver banks.
 *
 * Reference read: a low-poly heavy MBT in olive over a dark lower half. The
 * silhouette is built from four masses: a long shallow glacis carrying layered
 * appliqué and two nose light clusters, a wide slab hull with spaced side
 * skirts ribbed along their length, a raised engine deck closed by a round
 * fan grille with radial spokes, and an eight-wheel running gear that sets the
 * overall length (the tracks overhang the hull front and rear on purpose).
 *
 * Two-tone is deliberate, as on `speedy`: the skirt slab is the second large
 * `metal` mass in the hull set, because the reference's defining feature is a
 * dark lower half under an olive upper hull. `metal` is `style.accent` — dark
 * slate for the player, near-black for bots — which is exactly that dark grey.
 * The slab carries no fine detail of its own (the ribs are separate `dark`
 * parts), so nothing is lost when accent goes near-black.
 */
function buildTitan(b: HullBuilder) {
  const TRACK: TrackSpec = {
    x: 1.86, width: 0.96, wheelWidth: 1.02,
    front: 2.72, rear: -2.72,
    wheelR: 0.38, wheelY: 0.60, wheelCount: 8,
    linkH: 0.20, hubR: 0.40,
  };
  for (const side of [-1, 1] as const) buildTrack(b, side, TRACK);

  // --- Slab hull: wider and taller than anything else in the catalog ---
  b.box(3.36, 1.02, 4.98, 'body', 0, 1.10, -0.05); // lower hull
  b.box(2.90, 0.72, 3.86, 'body', 0, 2.08, -0.30); // fighting compartment
  for (const side of [-1, 1] as const) {
    b.box(1.06, 0.44, 4.76, 'body', side * 1.88, 1.50, -0.05); // sponson over the band
    b.box(1.20, 0.10, 5.06, 'body', side * 1.90, 1.26, -0.05); // olive fender lip
    b.box(1.04, 0.34, 0.10, 'dark', side * 1.88, 1.06, 2.54); // front mud flap
    b.box(1.04, 0.30, 0.10, 'dark', side * 1.88, 1.08, -2.60); // rear mud flap

    // Dark skirt slab, ribbed so the long face never reads as one flat sheet.
    b.box(0.16, 0.52, 4.72, 'metal', side * 2.40, 1.40, -0.05);
    for (let i = 0; i < 6; i++) {
      b.box(0.20, 0.42, 0.15, 'dark', side * 2.40, 1.40, -1.95 + i * 0.78);
    }
    b.box(0.12, 0.20, 4.72, 'dark', side * 2.40, 1.12, -0.05); // skirt lower lip
    b.box(0.06, 0.46, 4.68, 'dark', side * 2.34, 1.38, -0.05); // skirt shadow line

    // Side appliqué panel with two bolt rows — the layered-armour read.
    b.box(0.09, 0.50, 1.80, 'metal', side * 1.42, 1.96, -0.55);
    b.rivets(7, 0.042, 'metal', side * 1.44, 2.16, -1.30, 0, 0, 1.50);
    b.rivets(7, 0.042, 'metal', side * 1.44, 1.76, -1.30, 0, 0, 1.50);

    // Stowage rack on the rear sponson + tool box on the front one.
    b.box(0.66, 0.28, 1.20, 'metal', side * 1.78, 1.86, -1.95);
    b.box(0.54, 0.22, 0.90, 'metal', side * 1.88, 1.80, 1.10);
    b.box(0.58, 0.05, 0.94, 'metal', side * 1.88, 1.93, 1.10);
    b.cyl(0.05, 0.05, 3.20, 6, 'metal', side * 1.52, 1.74, -0.30, Math.PI / 2, 0, 0); // tow cable
    b.box(0.07, 0.07, 0.42, 'metal', side * 1.50, 2.20, 0.60); // grab handle
  }
  // Spare track links stowed on the front sponsons.
  for (const side of [-1, 1] as const) {
    for (let i = 0; i < 4; i++) {
      b.box(0.50, 0.10, 0.24, 'dark', side * 1.88, 1.76, 1.72 + i * 0.30);
    }
  }

  // --- Long shallow glacis: olive face, grey trim, panels kept small ---
  const G = slope(0, 1.76, 2.16, 0.52);
  const gl = (w: number, h: number, d: number, slot: HullSlot, u: number, v: number, n = 0) => {
    const [x, y, z] = G(u, v, n);
    b.box(w, h, d, slot, x, y, z, 0.52, 0, 0);
  };
  gl(3.06, 0.28, 1.66, 'body', 0, 0, 0);
  gl(3.02, 0.12, 0.18, 'metal', 0, -0.72, 0.14); // trim strip along the top edge
  gl(1.26, 0.16, 0.54, 'metal', -0.10, 0.40, 0.18); // lower centre appliqué
  gl(0.78, 0.12, 0.56, 'metal', -0.90, -0.34, 0.17); // driver's hatch
  gl(0.70, 0.14, 0.50, 'metal', 1.02, -0.30, 0.17); // gunner's plate
  for (const u of [-0.66, -0.48, -0.30]) gl(0.14, 0.10, 0.14, 'dark', u, 0.06, 0.19); // periscopes
  for (const u of [0.52, 0.86]) gl(0.30, 0.12, 0.44, 'dark', u, 0.58, 0.15); // spare links
  for (const side of [-1, 1] as const) gl(0.24, 0.22, 0.30, 'metal', side * 1.30, 0.62, 0.13); // tow hooks
  // Bolt rows along the glacis top edge and the appliqué lower edge.
  for (const v of [-0.62, 0.16]) {
    for (let i = 0; i < 9; i++) {
      const [bx, by, bz] = G(-1.10 + i * 0.275, v, 0.16);
      b.sphere(0.042, 'metal', bx, by, bz, 6, 4);
    }
  }

  // --- Nose: lower plate, brow, and the reference's twin light clusters ---
  b.box(3.36, 0.92, 0.34, 'body', 0, 1.04, 2.64); // lower nose plate
  b.box(3.26, 0.22, 0.34, 'body', 0, 1.48, 2.72); // nose brow
  b.box(3.28, 0.08, 0.08, 'dark', 0, 1.61, 2.84); // nose seam
  for (const side of [-1, 1] as const) {
    gl(0.58, 0.24, 0.16, 'metal', side * 1.02, 0.76, 0.16); // lamp housing
    gl(0.42, 0.14, 0.06, 'lamp', side * 1.02, 0.76, 0.27); // lamp lens
  }
  // Sensor block with a vision window, mirroring the reference's nose box.
  gl(0.64, 0.30, 0.44, 'metal', -1.16, -0.18, 0.24);
  gl(0.44, 0.15, 0.07, 'lamp', -1.16, -0.18, 0.37);

  // --- Engine deck: louver bank forward, round fan grille aft ---
  b.box(2.84, 0.16, 1.80, 'body', 0, 2.48, -1.68);
  b.louvers(4, 1.92, 0.10, 0.20, 'dark', 0, 2.58, -1.30, -0.32);
  for (const side of [-1, 1] as const) {
    b.louvers(3, 0.46, 0.09, 0.20, 'dark', side * 1.14, 2.58, -1.30, -0.32);
    b.cyl(0.17, 0.17, 0.10, 8, 'metal', side * 0.86, 2.60, -1.06); // fuel cap
  }
  // The round grille is the deck's signature: bezel, recessed disc, hub, spokes.
  b.cyl(0.68, 0.68, 0.06, 22, 'metal', 0, 2.58, -2.02);
  b.cyl(0.60, 0.60, 0.10, 22, 'dark', 0, 2.62, -2.02);
  b.cyl(0.22, 0.22, 0.07, 14, 'metal', 0, 2.67, -2.02);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    b.box(0.09, 0.05, 0.50, 'metal', Math.sin(a) * 0.32, 2.67, -2.02 + Math.cos(a) * 0.32, 0, a, 0);
  }

  // --- Rear plate, exhaust stacks with heat shields, tow hooks ---
  b.box(3.12, 1.06, 0.26, 'body', 0, 1.14, -2.66);
  for (const side of [-1, 1] as const) {
    b.cyl(0.18, 0.20, 1.10, 12, 'metal', side * 1.48, 1.92, -2.48, -0.16, 0, 0);
    b.box(0.40, 0.46, 0.40, 'dark', side * 1.48, 1.64, -2.44); // heat shield
    b.box(0.50, 0.12, 0.50, 'metal', side * 1.48, 2.48, -2.56); // stack cap
    b.box(0.36, 0.26, 0.32, 'metal', side * 1.26, 0.78, -2.82); // tow hook
  }

  // --- Turret ring collar ---
  b.cyl(1.50, 1.56, 0.18, 22, 'body', 0, 2.38, -0.10);
  b.cyl(1.56, 1.56, 0.06, 22, 'metal', 0, 2.32, -0.10);
  b.rivetRing(18, 0.036, 'metal', 0, 2.48, -0.10, 1.44);
}

// -------------------------------------------------------------------- wiring

const PART_BUILDERS: Record<HullId, (b: HullBuilder) => void> = {
  hunter: buildHunter,
  viking: buildViking,
  mammoth: buildMammoth,
  speedy: buildSpeedy,
  titan: buildTitan,
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
    trackLeft: ctx.trackLeftMat ?? ctx.trackMat,
    trackRight: ctx.trackRightMat ?? ctx.trackMat,
    lamp: ctx.lampMat,
  };
  for (const slot of HULL_SLOTS) {
    const geo = set[slot];
    if (!geo) continue;
    ctx.hull.add(new THREE.Mesh(geo, materials[slot]));
  }
}
