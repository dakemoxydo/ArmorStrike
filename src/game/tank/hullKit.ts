import * as THREE from 'three';
import { PartBuilder } from './partKit';

export { slope } from './partKit';

/** Hull material slots — one merged mesh each. Left and right tracks separated for animation. */
export const HULL_SLOTS = ['body', 'metal', 'dark', 'trackLeft', 'trackRight', 'lamp'] as const;
export type HullSlot = (typeof HULL_SLOTS)[number];

export type HullGeometrySet = Partial<Record<HullSlot, THREE.BufferGeometry>>;

interface ProfilePoint {
  yOut: number;
  zOut: number;
  yIn: number;
  zIn: number;
  ny: number;
  nz: number;
  v: number;
}

/**
 * Builds a continuous closed-loop 3D track belt geometry with seamless UV coordinates
 * along the perimeter. Outer tread, inner face, and side rims are all included with
 * proper normals.
 */
export function createTrackLoopGeometry(
  x: number,
  width: number,
  thickness: number,
  wheelR: number,
  wheelY: number,
  frontZ: number,
  rearZ: number,
  nominalLinkLen = 0.22,
): THREE.BufferGeometry {
  const rOut = wheelR + thickness * 0.5;
  const rIn = Math.max(0.05, wheelR - thickness * 0.5);

  const straightLen = Math.max(0.1, frontZ - rearZ);
  const turnLen = Math.PI * rOut;
  const totalPerimeter = 2 * straightLen + 2 * turnLen;
  const linkCount = Math.max(8, Math.round(totalPerimeter / nominalLinkLen));

  const nBottom = Math.max(6, Math.round(straightLen / 0.25));
  const nFront = 10;
  const nTop = Math.max(6, Math.round(straightLen / 0.25));
  const nRear = 10;

  const points: ProfilePoint[] = [];

  // 1. Bottom run (rearZ -> frontZ)
  for (let i = 0; i <= nBottom; i++) {
    const t = i / nBottom;
    const z = rearZ + t * straightLen;
    const d = t * straightLen;
    points.push({
      yOut: wheelY - rOut,
      zOut: z,
      yIn: wheelY - rIn,
      zIn: z,
      ny: -1,
      nz: 0,
      v: (d / totalPerimeter) * linkCount,
    });
  }

  // 2. Front idler turn (-PI/2 -> +PI/2)
  for (let i = 1; i <= nFront; i++) {
    const t = i / nFront;
    const angle = -Math.PI / 2 + t * Math.PI;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const d = straightLen + t * turnLen;
    points.push({
      yOut: wheelY + rOut * sin,
      zOut: frontZ + rOut * cos,
      yIn: wheelY + rIn * sin,
      zIn: frontZ + rIn * cos,
      ny: sin,
      nz: cos,
      v: (d / totalPerimeter) * linkCount,
    });
  }

  // 3. Top run (frontZ -> rearZ)
  for (let i = 1; i <= nTop; i++) {
    const t = i / nTop;
    const z = frontZ - t * straightLen;
    const d = straightLen + turnLen + t * straightLen;
    points.push({
      yOut: wheelY + rOut,
      zOut: z,
      yIn: wheelY + rIn,
      zIn: z,
      ny: 1,
      nz: 0,
      v: (d / totalPerimeter) * linkCount,
    });
  }

  // 4. Rear sprocket turn (+PI/2 -> +3PI/2)
  for (let i = 1; i <= nRear; i++) {
    const t = i / nRear;
    const angle = Math.PI / 2 + t * Math.PI;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const d = 2 * straightLen + turnLen + t * turnLen;
    points.push({
      yOut: wheelY + rOut * sin,
      zOut: rearZ + rOut * cos,
      yIn: wheelY + rIn * sin,
      zIn: rearZ + rIn * cos,
      ny: sin,
      nz: cos,
      v: (d / totalPerimeter) * linkCount,
    });
  }

  const segmentCount = points.length - 1;
  // 4 quads per segment (outer, inner, left, right) = 16 vertices, 24 indices per segment
  const vertexCount = segmentCount * 16;
  const indexCount = segmentCount * 24;

  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);
  const indices = new Uint16Array(indexCount);

  const xL = x - width * 0.5;
  const xR = x + width * 0.5;

  let vPtr = 0;
  let iPtr = 0;

  for (let i = 0; i < segmentCount; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];

    // --- Outer Face (tread) ---
    const baseOuter = vPtr;
    positions[vPtr * 3] = xL;     positions[vPtr * 3 + 1] = p0.yOut; positions[vPtr * 3 + 2] = p0.zOut;
    normals[vPtr * 3] = 0;        normals[vPtr * 3 + 1] = p0.ny;     normals[vPtr * 3 + 2] = p0.nz;
    uvs[vPtr * 2] = 0;            uvs[vPtr * 2 + 1] = p0.v;
    vPtr++;

    positions[vPtr * 3] = xR;     positions[vPtr * 3 + 1] = p0.yOut; positions[vPtr * 3 + 2] = p0.zOut;
    normals[vPtr * 3] = 0;        normals[vPtr * 3 + 1] = p0.ny;     normals[vPtr * 3 + 2] = p0.nz;
    uvs[vPtr * 2] = 1;            uvs[vPtr * 2 + 1] = p0.v;
    vPtr++;

    positions[vPtr * 3] = xR;     positions[vPtr * 3 + 1] = p1.yOut; positions[vPtr * 3 + 2] = p1.zOut;
    normals[vPtr * 3] = 0;        normals[vPtr * 3 + 1] = p1.ny;     normals[vPtr * 3 + 2] = p1.nz;
    uvs[vPtr * 2] = 1;            uvs[vPtr * 2 + 1] = p1.v;
    vPtr++;

    positions[vPtr * 3] = xL;     positions[vPtr * 3 + 1] = p1.yOut; positions[vPtr * 3 + 2] = p1.zOut;
    normals[vPtr * 3] = 0;        normals[vPtr * 3 + 1] = p1.ny;     normals[vPtr * 3 + 2] = p1.nz;
    uvs[vPtr * 2] = 0;            uvs[vPtr * 2 + 1] = p1.v;
    vPtr++;

    indices[iPtr++] = baseOuter;
    indices[iPtr++] = baseOuter + 1;
    indices[iPtr++] = baseOuter + 2;
    indices[iPtr++] = baseOuter;
    indices[iPtr++] = baseOuter + 2;
    indices[iPtr++] = baseOuter + 3;

    // --- Right Side Wall (+X) ---
    const baseRight = vPtr;
    positions[vPtr * 3] = xR;     positions[vPtr * 3 + 1] = p0.yOut; positions[vPtr * 3 + 2] = p0.zOut;
    normals[vPtr * 3] = 1;        normals[vPtr * 3 + 1] = 0;         normals[vPtr * 3 + 2] = 0;
    uvs[vPtr * 2] = 1;            uvs[vPtr * 2 + 1] = p0.v;
    vPtr++;

    positions[vPtr * 3] = xR;     positions[vPtr * 3 + 1] = p0.yIn;  positions[vPtr * 3 + 2] = p0.zIn;
    normals[vPtr * 3] = 1;        normals[vPtr * 3 + 1] = 0;         normals[vPtr * 3 + 2] = 0;
    uvs[vPtr * 2] = 0.95;         uvs[vPtr * 2 + 1] = p0.v;
    vPtr++;

    positions[vPtr * 3] = xR;     positions[vPtr * 3 + 1] = p1.yIn;  positions[vPtr * 3 + 2] = p1.zIn;
    normals[vPtr * 3] = 1;        normals[vPtr * 3 + 1] = 0;         normals[vPtr * 3 + 2] = 0;
    uvs[vPtr * 2] = 0.95;         uvs[vPtr * 2 + 1] = p1.v;
    vPtr++;

    positions[vPtr * 3] = xR;     positions[vPtr * 3 + 1] = p1.yOut; positions[vPtr * 3 + 2] = p1.zOut;
    normals[vPtr * 3] = 1;        normals[vPtr * 3 + 1] = 0;         normals[vPtr * 3 + 2] = 0;
    uvs[vPtr * 2] = 1;            uvs[vPtr * 2 + 1] = p1.v;
    vPtr++;

    indices[iPtr++] = baseRight;
    indices[iPtr++] = baseRight + 1;
    indices[iPtr++] = baseRight + 2;
    indices[iPtr++] = baseRight;
    indices[iPtr++] = baseRight + 2;
    indices[iPtr++] = baseRight + 3;

    // --- Left Side Wall (-X) ---
    const baseLeft = vPtr;
    positions[vPtr * 3] = xL;     positions[vPtr * 3 + 1] = p0.yOut; positions[vPtr * 3 + 2] = p0.zOut;
    normals[vPtr * 3] = -1;       normals[vPtr * 3 + 1] = 0;         normals[vPtr * 3 + 2] = 0;
    uvs[vPtr * 2] = 0;            uvs[vPtr * 2 + 1] = p0.v;
    vPtr++;

    positions[vPtr * 3] = xL;     positions[vPtr * 3 + 1] = p1.yOut; positions[vPtr * 3 + 2] = p1.zOut;
    normals[vPtr * 3] = -1;       normals[vPtr * 3 + 1] = 0;         normals[vPtr * 3 + 2] = 0;
    uvs[vPtr * 2] = 0;            uvs[vPtr * 2 + 1] = p1.v;
    vPtr++;

    positions[vPtr * 3] = xL;     positions[vPtr * 3 + 1] = p1.yIn;  positions[vPtr * 3 + 2] = p1.zIn;
    normals[vPtr * 3] = -1;       normals[vPtr * 3 + 1] = 0;         normals[vPtr * 3 + 2] = 0;
    uvs[vPtr * 2] = 0.05;         uvs[vPtr * 2 + 1] = p1.v;
    vPtr++;

    positions[vPtr * 3] = xL;     positions[vPtr * 3 + 1] = p0.yIn;  positions[vPtr * 3 + 2] = p0.zIn;
    normals[vPtr * 3] = -1;       normals[vPtr * 3 + 1] = 0;         normals[vPtr * 3 + 2] = 0;
    uvs[vPtr * 2] = 0.05;         uvs[vPtr * 2 + 1] = p0.v;
    vPtr++;

    indices[iPtr++] = baseLeft;
    indices[iPtr++] = baseLeft + 1;
    indices[iPtr++] = baseLeft + 2;
    indices[iPtr++] = baseLeft;
    indices[iPtr++] = baseLeft + 2;
    indices[iPtr++] = baseLeft + 3;

    // --- Inner Face (facing road wheels) ---
    const baseInner = vPtr;
    positions[vPtr * 3] = xR;     positions[vPtr * 3 + 1] = p0.yIn;  positions[vPtr * 3 + 2] = p0.zIn;
    normals[vPtr * 3] = 0;        normals[vPtr * 3 + 1] = -p0.ny;    normals[vPtr * 3 + 2] = -p0.nz;
    uvs[vPtr * 2] = 1;            uvs[vPtr * 2 + 1] = p0.v;
    vPtr++;

    positions[vPtr * 3] = xL;     positions[vPtr * 3 + 1] = p0.yIn;  positions[vPtr * 3 + 2] = p0.zIn;
    normals[vPtr * 3] = 0;        normals[vPtr * 3 + 1] = -p0.ny;    normals[vPtr * 3 + 2] = -p0.nz;
    uvs[vPtr * 2] = 0;            uvs[vPtr * 2 + 1] = p0.v;
    vPtr++;

    positions[vPtr * 3] = xL;     positions[vPtr * 3 + 1] = p1.yIn;  positions[vPtr * 3 + 2] = p1.zIn;
    normals[vPtr * 3] = 0;        normals[vPtr * 3 + 1] = -p1.ny;    normals[vPtr * 3 + 2] = -p1.nz;
    uvs[vPtr * 2] = 0;            uvs[vPtr * 2 + 1] = p1.v;
    vPtr++;

    positions[vPtr * 3] = xR;     positions[vPtr * 3 + 1] = p1.yIn;  positions[vPtr * 3 + 2] = p1.zIn;
    normals[vPtr * 3] = 0;        normals[vPtr * 3 + 1] = -p1.ny;    normals[vPtr * 3 + 2] = -p1.nz;
    uvs[vPtr * 2] = 1;            uvs[vPtr * 2 + 1] = p1.v;
    vPtr++;

    indices[iPtr++] = baseInner;
    indices[iPtr++] = baseInner + 1;
    indices[iPtr++] = baseInner + 2;
    indices[iPtr++] = baseInner;
    indices[iPtr++] = baseInner + 2;
    indices[iPtr++] = baseInner + 3;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(new THREE.BufferAttribute(indices, 1));
  return geo;
}

/** Hull authoring builder — `PartBuilder` bound to `HULL_SLOTS`. */
export class HullBuilder extends PartBuilder<HullSlot> {
  constructor() {
    super(HULL_SLOTS);
  }

  /** Adds a continuous closed-loop track belt with smooth UVs. */
  trackLoop(
    slot: HullSlot,
    x: number,
    width: number,
    thickness: number,
    wheelR: number,
    wheelY: number,
    frontZ: number,
    rearZ: number,
    nominalLinkLen = 0.22,
  ): this {
    const geo = createTrackLoopGeometry(
      x, width, thickness, wheelR, wheelY, frontZ, rearZ, nominalLinkLen,
    );
    this.add(geo, slot);
    return this;
  }
}
