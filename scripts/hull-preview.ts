/**
 * Headless hull preview — CPU rasterizer, no WebGL / no browser.
 * Usage: npx vite-node scripts/hull-preview.ts [turret] [palette]
 *   turret  : railgun | flamethrower | cannon   (default railgun)
 *   palette : player | bot                      (default player)
 *
 * Why: `scripts/screenshot.sh` needs a browser + dev server, which is awkward
 * when iterating on procedural models. This builds the real hull/turret code
 * (`hullGeometry` + `buildTurret`), projects the triangles with a camera, and
 * z-buffers them into a PNG sheet (4 views per hull) under
 * `screenshots/hull-preview/`. It also prints per-slot vertex/triangle counts
 * and the bounding box, so detail budget regressions show up as numbers.
 *
 * It renders flat-shaded solid colours per material slot rather than the real
 * camo/lighting — good enough to judge silhouette, proportions and detail.
 */
import * as THREE from 'three';
import zlib from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';
import { hullGeometry } from '../src/game/tank/hull';
import { buildTurret } from '../src/game/tank/turret';
import { HULL_SLOTS } from '../src/game/tank/hullKit';
import { HULL_TURRET_Y } from '../src/game/tank/TankConfig';
import type { HullId, TurretId } from '../src/core/catalog';
import type { TankBuildContext } from '../src/game/tank/context';

// ------------------------------------------------------------------ PNG out
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(w: number, h: number, rgba: Uint8Array): Buffer {
  const stride = w * 4;
  const raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    Buffer.from(rgba.buffer, rgba.byteOffset + y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// -------------------------------------------------------------- rasterizer
type RGB = [number, number, number];

interface Draw {
  positions: Float32Array;
  index: Uint32Array | null;
  matrix: THREE.Matrix4;
  color: RGB;
  emissive: boolean;
}

interface View { az: number; el: number }

const KEY = new THREE.Vector3(0.55, 0.82, 0.42).normalize();
const FILL = new THREE.Vector3(-0.62, 0.3, -0.55).normalize();

function shade(n: THREE.Vector3, base: RGB, emissive: boolean): RGB {
  if (emissive) return base;
  const k = 0.3 + 0.86 * Math.max(0, n.dot(KEY)) + 0.24 * Math.max(0, n.dot(FILL));
  return [base[0] * k, base[1] * k, base[2] * k];
}

function renderView(
  draws: Draw[], view: View,
  W: number, H: number,
  target: THREE.Vector3, dist: number, fovDeg: number,
  out: Uint8Array, outW: number, ox: number, oy: number,
): void {
  const cam = new THREE.PerspectiveCamera(fovDeg, W / H, 0.1, 300);
  const az = (view.az * Math.PI) / 180;
  const el = (view.el * Math.PI) / 180;
  cam.position.set(
    target.x + Math.sin(az) * Math.cos(el) * dist,
    target.y + Math.sin(el) * dist,
    target.z + Math.cos(az) * Math.cos(el) * dist,
  );
  cam.lookAt(target);
  cam.updateMatrixWorld(true);
  const vp = new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);

  // Sky / ground backdrop.
  const horizon = 0.44;
  for (let y = 0; y < H; y++) {
    const t = y / (H - 1);
    let r: number, g: number, b: number;
    if (t < horizon) {
      const u = t / horizon;
      r = 24 + 34 * (1 - u); g = 32 + 40 * (1 - u); b = 44 + 52 * (1 - u);
    } else {
      const u = (t - horizon) / (1 - horizon);
      r = 58 - 20 * u; g = 64 - 22 * u; b = 72 - 24 * u;
    }
    for (let x = 0; x < W; x++) {
      const o = ((oy + y) * outW + ox + x) * 4;
      out[o] = r; out[o + 1] = g; out[o + 2] = b; out[o + 3] = 255;
    }
  }

  const zbuf = new Float32Array(W * H);
  const v0 = new THREE.Vector3(), v1 = new THREE.Vector3(), v2 = new THREE.Vector3();
  const nrm = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3();
  const p = new THREE.Vector4();
  const sx = new Float32Array(3), sy = new Float32Array(3), iw = new Float32Array(3);
  const verts = [v0, v1, v2];

  for (const d of draws) {
    const pos = d.positions;
    const triCount = d.index ? d.index.length / 3 : pos.length / 9;
    for (let t = 0; t < triCount; t++) {
      const i0 = d.index ? d.index[t * 3] : t * 3;
      const i1 = d.index ? d.index[t * 3 + 1] : t * 3 + 1;
      const i2 = d.index ? d.index[t * 3 + 2] : t * 3 + 2;
      v0.set(pos[i0 * 3], pos[i0 * 3 + 1], pos[i0 * 3 + 2]).applyMatrix4(d.matrix);
      v1.set(pos[i1 * 3], pos[i1 * 3 + 1], pos[i1 * 3 + 2]).applyMatrix4(d.matrix);
      v2.set(pos[i2 * 3], pos[i2 * 3 + 1], pos[i2 * 3 + 2]).applyMatrix4(d.matrix);

      e1.subVectors(v1, v0);
      e2.subVectors(v2, v0);
      nrm.crossVectors(e1, e2);
      if (nrm.lengthSq() < 1e-12) continue;
      nrm.normalize();
      e1.subVectors(cam.position, v0);
      if (nrm.dot(e1) <= 0) continue; // backface

      const col = shade(nrm, d.color, d.emissive);

      let visible = true;
      for (let k = 0; k < 3; k++) {
        p.set(verts[k].x, verts[k].y, verts[k].z, 1).applyMatrix4(vp);
        if (p.w <= 0.02) { visible = false; break; }
        const inv = 1 / p.w;
        sx[k] = (p.x * inv * 0.5 + 0.5) * W;
        sy[k] = (1 - (p.y * inv * 0.5 + 0.5)) * H;
        iw[k] = inv;
      }
      if (!visible) continue;

      const area = (sx[1] - sx[0]) * (sy[2] - sy[0]) - (sx[2] - sx[0]) * (sy[1] - sy[0]);
      if (Math.abs(area) < 1e-9) continue;
      const invArea = 1 / area;

      const minX = Math.max(0, Math.floor(Math.min(sx[0], sx[1], sx[2])));
      const maxX = Math.min(W - 1, Math.ceil(Math.max(sx[0], sx[1], sx[2])));
      const minY = Math.max(0, Math.floor(Math.min(sy[0], sy[1], sy[2])));
      const maxY = Math.min(H - 1, Math.ceil(Math.max(sy[0], sy[1], sy[2])));

      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const px = x + 0.5, py = y + 0.5;
          const w0 = ((sx[1] - px) * (sy[2] - py) - (sx[2] - px) * (sy[1] - py)) * invArea;
          const w1 = ((sx[2] - px) * (sy[0] - py) - (sx[0] - px) * (sy[2] - py)) * invArea;
          const w2 = 1 - w0 - w1;
          if (w0 < -0.0005 || w1 < -0.0005 || w2 < -0.0005) continue;
          // 1/w interpolates linearly in screen space — exact depth ordering.
          const depth = w0 * iw[0] + w1 * iw[1] + w2 * iw[2];
          const zi = y * W + x;
          if (depth <= zbuf[zi]) continue;
          zbuf[zi] = depth;
          const o = ((oy + y) * outW + ox + x) * 4;
          out[o] = Math.min(255, col[0] * 255);
          out[o + 1] = Math.min(255, col[1] * 255);
          out[o + 2] = Math.min(255, col[2] * 255);
          out[o + 3] = 255;
        }
      }
    }
  }
}

// ----------------------------------------------------------------- harness
const PALETTES = {
  // buildPlayerStyle() teal camo + accent 0x274a58.
  player: {
    body: [0.20, 0.62, 0.51] as RGB, turret: [0.16, 0.50, 0.42] as RGB,
    metal: [0.20, 0.31, 0.37] as RGB, dark: [0.10, 0.11, 0.13] as RGB,
    track: [0.15, 0.17, 0.21] as RGB, lamp: [1.0, 0.83, 0.45] as RGB,
  },
  // buildBotStyle(): body = teamColor * 0.55, accent 0x2b2f36.
  bot: {
    body: [0.36, 0.10, 0.09] as RGB, turret: [0.30, 0.09, 0.08] as RGB,
    metal: [0.17, 0.18, 0.21] as RGB, dark: [0.09, 0.09, 0.11] as RGB,
    track: [0.13, 0.14, 0.17] as RGB, lamp: [1.0, 0.30, 0.25] as RGB,
  },
};

const VIEWS: View[] = [
  { az: 40, el: 20 },   // three-quarter front
  { az: 90, el: 6 },    // side profile
  { az: 4, el: 14 },    // front
  { az: 208, el: 24 },  // three-quarter rear
];

function buildDraws(
  hullId: HullId, turretId: TurretId, P: (typeof PALETTES)['player'],
): { draws: Draw[]; stats: string[] } {
  const group = new THREE.Group();
  const hull = new THREE.Group();
  group.add(hull);

  const mBody = new THREE.MeshStandardMaterial();
  const mTurret = new THREE.MeshStandardMaterial();
  const mMetal = new THREE.MeshStandardMaterial();
  const mDark = new THREE.MeshStandardMaterial();
  const mTrack = new THREE.MeshStandardMaterial();
  const mLamp = new THREE.MeshBasicMaterial();

  const set = hullGeometry(hullId);
  const slotMat: Record<string, THREE.Material> = {
    body: mBody, metal: mMetal, dark: mDark, track: mTrack, lamp: mLamp,
  };

  const stats: string[] = [];
  for (const slot of HULL_SLOTS) {
    const geo = set[slot];
    if (!geo) continue;
    const tris = (geo.index ? geo.index.count : geo.attributes.position.count) / 3;
    stats.push(`  ${slot.padEnd(6)} verts=${String(geo.attributes.position.count).padStart(6)} tris=${String(tris).padStart(6)}`);
    hull.add(new THREE.Mesh(geo, slotMat[slot]));
  }

  const turret = new THREE.Group();
  const ctx = {
    style: { glow: 0xffd27a, antenna: false },
    bodyMats: [mBody], bodyMat: mBody, turretMat: mTurret, metalMat: mMetal,
    darkMat: mDark, lampMat: mLamp, trackTex: null as unknown as THREE.CanvasTexture,
    trackMat: mTrack, group, hull, turret,
    barrelGroup: new THREE.Group(), muzzle: new THREE.Object3D(), railGlowMat: undefined,
  } as unknown as TankBuildContext;
  buildTurret(ctx, turretId);
  turret.position.set(0, HULL_TURRET_Y[hullId], -0.1);
  group.add(turret);
  group.updateMatrixWorld(true);

  const colorOf = new Map<THREE.Material, RGB>();
  colorOf.set(mBody, P.body);
  colorOf.set(mTurret, P.turret);
  colorOf.set(mMetal, P.metal);
  colorOf.set(mDark, P.dark);
  colorOf.set(mTrack, P.track);
  colorOf.set(mLamp, P.lamp);
  if (ctx.railGlowMat) colorOf.set(ctx.railGlowMat, P.lamp);

  const draws: Draw[] = [];
  group.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    const g = o.geometry as THREE.BufferGeometry;
    const mat = Array.isArray(o.material) ? o.material[0] : o.material;
    draws.push({
      positions: g.attributes.position.array as Float32Array,
      index: g.index ? (g.index.array as Uint32Array) : null,
      matrix: o.matrixWorld.clone(),
      color: colorOf.get(mat) ?? [0.8, 0.1, 0.8],
      emissive: mat instanceof THREE.MeshBasicMaterial,
    });
  });

  const box = new THREE.Box3().setFromObject(group);
  const size = box.getSize(new THREE.Vector3());
  const hullBox = new THREE.Box3().setFromObject(hull);
  const hullSize = hullBox.getSize(new THREE.Vector3());
  stats.push(`  hull bbox  L=${hullSize.z.toFixed(2)} W=${hullSize.x.toFixed(2)} H=${hullSize.y.toFixed(2)}`);
  stats.push(`  full bbox  L=${size.z.toFixed(2)} W=${size.x.toFixed(2)} H=${size.y.toFixed(2)} (with turret)`);
  stats.push(`  meshes (draw calls): ${draws.length}`);
  return { draws, stats };
}

const turretId = (process.argv[2] as TurretId) ?? 'railgun';
const paletteName = (process.argv[3] as keyof typeof PALETTES) ?? 'player';
const palette = PALETTES[paletteName] ?? PALETTES.player;
const hullIds: HullId[] = ['hunter', 'viking', 'mammoth', 'speedy', 'titan'];

const CELL_W = 640;
const CELL_H = 480;
const SHEET_W = CELL_W * 2;
const SHEET_H = CELL_H * 2;

const outDir = path.join('screenshots', 'hull-preview');
fs.mkdirSync(outDir, { recursive: true });

for (const hullId of hullIds) {
  const { draws, stats } = buildDraws(hullId, turretId, palette);
  const buf = new Uint8Array(SHEET_W * SHEET_H * 4);
  VIEWS.forEach((view, i) => {
    renderView(
      draws, view, CELL_W, CELL_H,
      new THREE.Vector3(0, 1.05, 0), 10.5, 34,
      buf, SHEET_W, (i % 2) * CELL_W, Math.floor(i / 2) * CELL_H,
    );
  });
  const file = path.join(outDir, `${hullId}-${turretId}-${paletteName}.png`);
  fs.writeFileSync(file, encodePng(SHEET_W, SHEET_H, buf));
  console.log(`\n=== ${hullId} / ${turretId} / ${paletteName} -> ${file}`);
  console.log(stats.join('\n'));
}
