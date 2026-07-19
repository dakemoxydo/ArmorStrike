// ===== Карта Village: деревня с домами, амбарами, заборами, площадью =====
// Arena half = 150 (ARENA.size 300). Layout graph:
//   Square core  : |x|,|z| < 28  — well landmark + market stalls + soft cover
//   Fire lanes   : N–S x∈[−10,10], E–W z∈[−10,10] clear crossroads through square
//   Barn clusters: NW (~−96,+84) and SE (~96,−84) hard anchors, plus mid barns
//   House rows    : mid-ring |x|,|z|≈76–90 (rotated toward centre, hard cover graph)
//   Paddocks     : linear fence lines between houses/barns (soft peek mazes, no dead ends)
//   Hay platform : raised deck NE, ramp-approached (uses ramp API, blocksShots false)
//   Trees        : trunk-only collision, canopy non-LOS
// Cover hierarchy: hard (houses/barns) · medium (solid wood/hay stacks) · soft (fences/hay/barrels/stalls) · non-LOS (tree canopy)
import * as THREE from 'three';
import { ARENA } from '../constants';
import { colliderFromCenter } from '../engine/physics';
import { barrelTexture, crateTexture, hexTexture } from '../textures';
import type { ArenaBuildContext } from './context';

const GOLD = 0xc8a24a;

/** Village-themed interior: houses, barns, fences, hay, well, market square. */
export function buildVillageContent(ctx: ArenaBuildContext) {
  buildVillageSkyline(ctx);
  buildVillageSquare(ctx);
  buildVillageHouses(ctx);
  buildVillageBarns(ctx);
  buildVillageFences(ctx);
  buildVillageTrees(ctx);
  buildVillageScattered(ctx);
  buildVillageHayPlatform(ctx);
  buildVillageRamps(ctx);
  buildVillageWindmill(ctx);
  buildVillageBanners(ctx);
  buildVillageFireflies(ctx);
  buildVillageFoliage(ctx);
  buildVillageAtmosphere(ctx);
}

function woodMat(color = 0x8b6914) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.05 });
}

function plasterMat(color = 0xc4b8a0) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0.02 });
}

function roofMat(color = 0x6b3030) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0.1 });
}

function stoneMat(color = 0x6a6a5e) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0.02 });
}

function shutterMat(color = 0x4a5a38) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0.02 });
}

// ── skyline (low farmhouse/hill silhouettes ringing the arena) ─────────────

function buildVillageSkyline(ctx: ArenaBuildContext) {
  const dark = new THREE.MeshStandardMaterial({
    color: 0x1a1810, roughness: 1, emissive: 0x1a1408, emissiveIntensity: 0.25,
  });
  const hillMat = new THREE.MeshStandardMaterial({
    color: 0x14180e, roughness: 1, emissive: 0x0e1408, emissiveIntensity: 0.2,
  });
  const warm = new THREE.MeshBasicMaterial({ color: 0xffc266 });
  // rolling hill silhouettes (distant, low, wide)
  for (let i = 0; i < 22; i++) {
    const ang = (i / 22) * Math.PI * 2 + (Math.random() - 0.5) * 0.1;
    const r = 190 + Math.random() * 70;
    const rad = 26 + Math.random() * 40;
    const hill = new THREE.Mesh(new THREE.SphereGeometry(rad, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), hillMat);
    hill.position.set(Math.cos(ang) * r, -rad * 0.35, Math.sin(ang) * r);
    hill.scale.y = 0.42;
    ctx.group.add(hill);
  }
  // low farmhouses with warm windows
  for (let i = 0; i < 30; i++) {
    const ang = (i / 30) * Math.PI * 2 + (Math.random() - 0.5) * 0.08;
    const r = 168 + Math.random() * 54;
    const w = 12 + Math.random() * 22;
    const h = 7 + Math.random() * 14;
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, w * 0.7), dark);
    m.position.set(Math.cos(ang) * r, h / 2 - 0.4, Math.sin(ang) * r);
    m.rotation.y = Math.random() * Math.PI;
    ctx.group.add(m);
    // pitched roof cap
    const roof = new THREE.Mesh(new THREE.BoxGeometry(w * 1.1, h * 0.4, w * 0.8), hillMat);
    roof.position.set(m.position.x, h + h * 0.15, m.position.z);
    roof.rotation.y = m.rotation.y;
    ctx.group.add(roof);
    if (Math.random() > 0.3) {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.32, h * 0.16), warm);
      win.position.set(m.position.x, h * 0.45, m.position.z);
      win.lookAt(0, win.position.y, 0);
      ctx.group.add(win);
    }
  }
}

// ── house (hard cover, pitched roof) ────────────────────────────────────────

function house(
  ctx: ArenaBuildContext,
  x: number, z: number,
  w: number, d: number, h: number,
  yaw = 0,
) {
  const plasters = [0xb8aa90, 0xc4b8a0, 0xa89880, 0xc8bca8];
  const roofs = [0x6b3030, 0x4a5a38, 0x5a4030, 0x7a4028];
  const body = plasterMat(plasters[Math.floor(Math.random() * plasters.length)]);
  const roof = roofMat(roofs[Math.floor(Math.random() * roofs.length)]);
  const beamMat = woodMat(0x5a4526);
  ctx.addColliderBlock(x, z, w, d, h + 1.6, false, () => {
    const g = new THREE.Group();
    const base = ctx.box(w, h, d, body);
    base.rotation.y = yaw;
    g.add(base);
    // exposed corner timber beams (identity detail)
    for (const cx of [-w * 0.46, w * 0.46]) {
      for (const cz of [-d * 0.46, d * 0.46]) {
        const beam = ctx.box(0.35, h, 0.35, beamMat);
        const rx = Math.cos(yaw) * cx - Math.sin(yaw) * cz;
        const rz = Math.sin(yaw) * cx + Math.cos(yaw) * cz;
        beam.position.set(rx, h / 2, rz);
        g.add(beam);
      }
    }
    // half-timber (фахверк) on the front facade — horizontal ledgers + vertical studs
    const timber = new THREE.Group();
    timber.rotation.y = yaw;
    for (const ty of [h * 0.22, h * 0.78]) {
      const ledger = ctx.box(w * 0.92, 0.22, 0.1, beamMat);
      ledger.position.set(0, ty, d / 2 + 0.03);
      timber.add(ledger);
    }
    for (let i = -2; i <= 2; i++) {
      if (i === 0) continue; // keep the door opening clear
      const stud = ctx.box(0.2, h * 0.86, 0.08, beamMat);
      stud.position.set((i / 2) * w * 0.36, h * 0.5, d / 2 + 0.02);
      timber.add(stud);
    }
    g.add(timber);
    // stone plinth — grounds the facade, breaks the "floating box" look
    const plinth = ctx.box(w * 1.02, 0.6, d * 1.02, stoneMat());
    plinth.position.y = 0.3;
    plinth.rotation.y = yaw;
    g.add(plinth);
    // pitched roof (prism ridge) — taller peak + wider eaves
    const roofMesh = ridgeRoof(w * 1.18, d * 1.18, 2.3, roof);
    roofMesh.position.y = h + 0.1;
    roofMesh.rotation.y = yaw;
    roofMesh.castShadow = true;
    g.add(roofMesh);
    // chimney with cap — registers a smoke emitter for hearth-smoke
    const chimX = w * 0.18, chimZ = d * 0.12;
    const chimRx = Math.cos(yaw) * chimX - Math.sin(yaw) * chimZ;
    const chimRz = Math.sin(yaw) * chimX + Math.cos(yaw) * chimZ;
    const chimney = ctx.box(0.7, 2.3, 0.7, stoneMat(0x5a5044));
    chimney.position.set(chimRx, h + 1.6, chimRz);
    chimney.castShadow = true;
    g.add(chimney);
    const cap = ctx.box(1.0, 0.3, 1.0, stoneMat(0x46403a));
    cap.position.set(chimRx, h + 2.75, chimRz);
    g.add(cap);
    ctx.smokeEmitters.push(new THREE.Vector3(x + chimRx, h + 2.9, z + chimRz));
    // door (frame + canopy) — single yaw on wrapper (no double-rotation)
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x3a2818, roughness: 0.9 });
    const doorWrap = new THREE.Group();
    doorWrap.rotation.y = yaw;
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.4, 0.15), doorMat);
    door.position.set(0, 1.2, d / 2 + 0.05);
    door.castShadow = true;
    doorWrap.add(door);
    const doorFrame = ctx.box(1.9, 2.7, 0.12, beamMat);
    doorFrame.position.set(0, 1.35, d / 2 + 0.02);
    doorWrap.add(doorFrame);
    const canopy = ctx.box(2.2, 0.16, 0.9, beamMat);
    canopy.position.set(0, 2.75, d / 2 + 0.42);
    doorWrap.add(canopy);
    g.add(doorWrap);
    // warm window lights + frames + shutters + sills
    const winMat = new THREE.MeshBasicMaterial({ color: 0xffd080 });
    const winWrap = new THREE.Group();
    winWrap.rotation.y = yaw;
    for (const wx of [-w * 0.28, w * 0.28]) {
      const wy = h * 0.55;
      const frame = ctx.box(1.6, 1.5, 0.12, beamMat);
      frame.position.set(wx, wy, d / 2 + 0.02);
      winWrap.add(frame);
      const win = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.1, 0.12), winMat);
      win.position.set(wx, wy, d / 2 + 0.06);
      winWrap.add(win);
      for (const s of [-1, 1]) {
        const shutter = ctx.box(0.34, 1.3, 0.08, shutterMat());
        shutter.position.set(wx + s * 1.02, wy, d / 2 + 0.06);
        winWrap.add(shutter);
      }
      const sill = ctx.box(1.7, 0.14, 0.24, beamMat);
      sill.position.set(wx, wy - 0.82, d / 2 + 0.06);
      winWrap.add(sill);
    }
    g.add(winWrap);
    return g;
  }, 0, 'wall');
}

/** Triangular-prism pitched roof mesh (ridge along X). */
function ridgeRoof(w: number, d: number, peak: number, mat: THREE.Material): THREE.Mesh {
  const shape = new THREE.Shape();
  shape.moveTo(-d / 2, 0);
  shape.lineTo(d / 2, 0);
  shape.lineTo(0, peak);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: w, bevelEnabled: false });
  geo.translate(0, 0, -w / 2);
  geo.rotateY(Math.PI / 2);
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  return m;
}

/** Gambrel (barn) roof mesh — двускатная с изломом, характерный силуэт амбара. */
function gambrelRoof(w: number, d: number, peak: number, mat: THREE.Material): THREE.Mesh {
  const shape = new THREE.Shape();
  shape.moveTo(-d / 2, 0);
  shape.lineTo(-d * 0.26, peak * 0.55);
  shape.lineTo(0, peak);
  shape.lineTo(d * 0.26, peak * 0.55);
  shape.lineTo(d / 2, 0);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: w, bevelEnabled: false });
  geo.translate(0, 0, -w / 2);
  geo.rotateY(Math.PI / 2);
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  return m;
}

// ── market square (well landmark + stalls) ─────────────────────────────────

function buildVillageSquare(ctx: ArenaBuildContext) {
  // well at centre — landmark
  ctx.addColliderBlock(0, 0, 6.5, 6.5, 3.4, false, () => {
    const g = new THREE.Group();
    const stone = new THREE.MeshStandardMaterial({ color: 0x6a6a62, roughness: 0.9, metalness: 0.05 });
    g.add(ctx.box(6.0, 2.4, 6.0, stone));
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.7, 0.6, 14), stone);
    rim.position.y = 2.7;
    rim.castShadow = true;
    g.add(rim);
    const postMat = woodMat(0x5a4020);
    for (const sx of [-2.1, 2.1]) {
      const post = ctx.box(0.5, 4.8, 0.5, postMat);
      post.position.set(sx, 2.4, 0);
      g.add(post);
    }
    const beam = ctx.box(4.8, 0.45, 0.45, postMat);
    beam.position.y = 5.0;
    g.add(beam);
    // well-sweep (журавль): вертикальная стрела + поворотный рычаг с верёвкой и ведром
    const sweepBase = ctx.box(0.4, 4.4, 0.4, postMat);
    sweepBase.position.set(0, 2.2, 2.3);
    g.add(sweepBase);
    const arm = new THREE.Group();
    arm.position.set(0, 4.4, 2.3);
    arm.rotation.y = 0.6;
    const armBeam = ctx.box(0.22, 0.22, 3.4, postMat);
    armBeam.position.set(0, 0, -1.2);
    arm.add(armBeam);
    const rope = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 1.6, 6),
      new THREE.MeshStandardMaterial({ color: 0x3a2e1a, roughness: 1 }),
    );
    rope.position.set(0, -0.8, -2.7);
    arm.add(rope);
    const bucket = ctx.box(0.5, 0.45, 0.5, woodMat(0x5a4526));
    bucket.position.set(0, -1.75, -2.7);
    arm.add(bucket);
    g.add(arm);
    // little pitched shelter over the well
    const shelter = ridgeRoof(5.4, 3.2, 1.1, roofMat(0x5a4030));
    shelter.position.y = 5.0;
    g.add(shelter);
    // gold lantern accent
    const lantern = new THREE.Mesh(
      new THREE.SphereGeometry(0.34, 8, 8),
      new THREE.MeshBasicMaterial({ color: GOLD }),
    );
    lantern.position.y = 4.7;
    g.add(lantern);
    return g;
  }, 0, 'wall');

  // market stalls ringing the square (destructible soft cover)
  const stall = (x: number, z: number, yaw: number, canvasCol: number) => {
    const canvas = new THREE.MeshStandardMaterial({ color: canvasCol, roughness: 0.7, metalness: 0.05 });
    const wood = woodMat();
    ctx.addColliderBlock(x, z, 6.4, 4.2, 3.4, true, () => {
      const g = new THREE.Group();
      const table = ctx.box(6.0, 1.1, 3.4, wood);
      table.rotation.y = yaw;
      g.add(table);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.2, 4.6), canvas);
      roof.position.y = 3.2;
      roof.rotation.y = yaw;
      roof.rotation.x = -0.15;
      roof.castShadow = true;
      g.add(roof);
      for (const sx of [-2.7, 2.7]) {
        const leg = ctx.box(0.3, 3.1, 0.3, wood);
        const rx = Math.cos(yaw) * sx;
        const rz = Math.sin(yaw) * sx;
        leg.position.set(rx, 1.55, rz);
        g.add(leg);
      }
      return g;
    }, 75);
  };
  stall(18, 15, 0.2, 0xc45a3a);
  stall(-19, 14, -0.15, 0x3a7a5a);
  stall(16, -18, 0.4, 0xc4a03a);
  stall(-18, -16, -0.3, 0x8a4a7a);
}

// ── houses (hard-cover graph on mid-ring) ──────────────────────────────────

function buildVillageHouses(ctx: ArenaBuildContext) {
  // north row (facing south toward centre)
  house(ctx, -56, -84, 16, 13, 7.5, 0.05);
  house(ctx, -20, -96, 15, 12, 7.0, -0.1);
  house(ctx, 24, -90, 18, 13, 8.2, 0.08);
  house(ctx, 60, -80, 15, 15, 6.8, -0.05);
  // south row (facing north)
  house(ctx, -64, 84, 16, 13, 8.0, Math.PI + 0.1);
  house(ctx, -16, 96, 14, 12, 6.8, Math.PI - 0.08);
  house(ctx, 36, 88, 20, 15, 8.6, Math.PI + 0.04);
  house(ctx, 84, 76, 15, 13, 7.2, Math.PI - 0.12);
  // east / west rows (facing inward)
  house(ctx, 96, -24, 15, 17, 7.6, -Math.PI / 2);
  house(ctx, 100, 28, 14, 15, 7.0, -Math.PI / 2 + 0.08);
  house(ctx, -100, -16, 15, 17, 7.4, Math.PI / 2);
  house(ctx, -96, 36, 14, 15, 6.8, Math.PI / 2 - 0.1);
  // inner ring cottages (closer, create peek angles near square)
  house(ctx, 44, 44, 13, 11, 6.0, -Math.PI * 0.75);
  house(ctx, -46, -44, 13, 11, 6.2, Math.PI * 0.25);
}

// ── barns (large hard anchors) ─────────────────────────────────────────────

function buildVillageBarns(ctx: ArenaBuildContext) {
  const barn = (x: number, z: number, w: number, d: number, h: number, yaw = 0) => {
    const body = woodMat(0x7a5a28);
    const roof = roofMat(0x4a3830);
    ctx.addColliderBlock(x, z, w, d, h + 1.8, false, () => {
      const g = new THREE.Group();
      const base = ctx.box(w, h, d, body);
      base.rotation.y = yaw;
      g.add(base);
      // stone plinth
      const plinth = ctx.box(w * 1.02, 0.7, d * 1.02, stoneMat(0x5e5e52));
      plinth.position.y = 0.35;
      plinth.rotation.y = yaw;
      g.add(plinth);
      // plank stripes
      const plank = woodMat(0x8a6832);
      for (let i = -2; i <= 2; i++) {
        const s = ctx.box(w * 1.005, 0.5, 0.2, plank);
        s.position.set(0, h * 0.5 + i * (h * 0.18), d / 2 + 0.02);
        s.rotation.y = yaw;
        const wrap = new THREE.Group(); wrap.rotation.y = yaw; wrap.add(s); g.add(wrap);
      }
      const r = gambrelRoof(w * 1.14, d * 1.12, 3.2, roof);
      r.position.y = h + 0.1;
      r.rotation.y = yaw;
      r.castShadow = true;
      g.add(r);
      // barn door + frame + X-brace
      const doorMat = new THREE.MeshStandardMaterial({ color: 0x3a2810, roughness: 0.9 });
      const dw = new THREE.Group(); dw.rotation.y = yaw;
      const door = new THREE.Mesh(new THREE.BoxGeometry(w * 0.42, h * 0.72, 0.25), doorMat);
      door.position.set(0, h * 0.36, d / 2 + 0.05);
      door.castShadow = true;
      dw.add(door);
      const frame = ctx.box(w * 0.48, h * 0.78, 0.14, woodMat(0x5a4526));
      frame.position.set(0, h * 0.39, d / 2 + 0.02);
      dw.add(frame);
      // X-brace (планки по диагонали) — характерная деталь амбарных ворот
      const braceMat = woodMat(0x8a6832);
      const braceLen = Math.hypot(w * 0.42, h * 0.72);
      const braceAng = Math.atan2(h * 0.72, w * 0.42);
      for (const s of [-1, 1]) {
        const brace = ctx.box(braceLen, 0.3, 0.06, braceMat);
        brace.position.set(0, h * 0.36, d / 2 + 0.16);
        brace.rotation.z = s * braceAng;
        dw.add(brace);
      }
      g.add(dw);
      return g;
    }, 0, 'wall');
  };
  // NW cluster
  barn(-96, 84, 24, 17, 10.5, 0.05);
  barn(-72, 108, 18, 14, 8.5, Math.PI / 2);
  // SE cluster
  barn(96, -84, 22, 18, 10.0, -0.05);
  barn(74, -108, 18, 15, 8.5, Math.PI / 2);
  // mid barns (flank anchors)
  barn(-84, -46, 20, 16, 9.0, 0.1);
  barn(80, 48, 19, 15, 8.8, -0.08);
}

// ── fence paddocks (linear soft peek mazes, open ends — no dead pens) ───────

function buildVillageFences(ctx: ArenaBuildContext) {
  const postMat = woodMat(0x5c4020);
  const railMat = woodMat(0x6a4a28);
  const segment = (x: number, z: number, len: number, yaw: number) => {
    const w = Math.abs(Math.cos(yaw)) * len + Math.abs(Math.sin(yaw)) * 0.4;
    const d = Math.abs(Math.sin(yaw)) * len + Math.abs(Math.cos(yaw)) * 0.4;
    ctx.addColliderBlock(x, z, Math.max(w, 0.8), Math.max(d, 0.8), 1.5, true, () => {
      const g = new THREE.Group();
      const posts = Math.max(4, Math.round(len / 3));
      for (let i = 0; i < posts; i++) {
        const t = (i / (posts - 1) - 0.5) * len;
        const post = ctx.box(0.3, 1.45, 0.3, postMat);
        post.position.set(Math.cos(yaw) * t, 0.72, Math.sin(yaw) * t);
        g.add(post);
      }
      for (const hy of [0.5, 1.1]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.14, 0.14), railMat);
        rail.position.y = hy;
        rail.rotation.y = yaw;
        rail.castShadow = true;
        g.add(rail);
      }
      return g;
    }, 50);
  };
  // NW paddock (L-shape, open corner toward centre)
  segment(-96, 56, 26, 0);
  segment(-110, 42, 26, Math.PI / 2);
  // SE paddock
  segment(96, -56, 26, 0);
  segment(110, -42, 26, Math.PI / 2);
  // central approach fences (channel fire toward square, gaps at ends)
  segment(0, 42, 32, 0);
  segment(0, -42, 32, 0);
  segment(42, 0, 32, Math.PI / 2);
  segment(-42, 0, 32, Math.PI / 2);
  // mid-ring diagonal paddock lines (flank peek cover)
  segment(-56, -20, 22, 0);
  segment(58, 22, 22, 0);
  segment(-20, 58, 22, Math.PI / 2);
  segment(22, -58, 22, Math.PI / 2);
}

// ── trees (trunk-only collision, canopy non-LOS) ───────────────────────────

function buildVillageTrees(ctx: ArenaBuildContext) {
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3420, roughness: 0.9, metalness: 0 });
  const leafMats = [
    new THREE.MeshStandardMaterial({ color: 0x3a6b2e, roughness: 0.95, metalness: 0 }),
    new THREE.MeshStandardMaterial({ color: 0x4a7a34, roughness: 0.95, metalness: 0 }),
    new THREE.MeshStandardMaterial({ color: 0x2e5a26, roughness: 0.95, metalness: 0 }),
  ];
  const tree = (x: number, z: number, scale = 1) => {
    const leafMat = leafMats[Math.floor(Math.random() * leafMats.length)];
    ctx.addColliderBlock(x, z, 1.6 * scale, 1.6 * scale, 4.0 * scale, false, () => {
      const g = new THREE.Group();
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.42 * scale, 0.6 * scale, 3.8 * scale, 8),
        trunkMat,
      );
      trunk.position.y = 1.9 * scale;
      trunk.castShadow = true;
      trunk.receiveShadow = true;
      g.add(trunk);
      // layered canopy for fuller silhouette
      for (const [cy, r] of [[4.6, 2.8], [5.6, 2.2], [6.4, 1.5]] as const) {
        const canopy = new THREE.Mesh(new THREE.SphereGeometry(r * scale, 10, 8), leafMat);
        canopy.position.y = cy * scale;
        canopy.position.x = (Math.random() - 0.5) * 0.8 * scale;
        canopy.castShadow = true;
        canopy.receiveShadow = true;
        g.add(canopy);
      }
      return g;
    }, 0, 'block', false);
  };
  const spots: [number, number, number?][] = [
    [-40, -60], [44, -64], [-36, 64], [48, 60],
    [-110, 0], [110, -10], [-30, -120], [30, 116],
    [100, 100], [-96, -100], [0, 110], [0, -116],
    [64, -36, 1.2], [-68, 24, 0.9], [16, 40, 0.85], [-16, -40, 0.9],
    [120, 40], [-120, -40], [60, 120], [-60, -120],
  ];
  for (const [x, z, s] of spots) tree(x, z, s ?? 1);
}

// ── scattered soft cover (hay, barrels) + medium solid blocks ──────────────

function buildVillageScattered(ctx: ArenaBuildContext) {
  const hayMap = crateTexture('#c9a84c');
  const hay = (x: number, z: number, w: number, d: number, h: number) => {
    const mat = new THREE.MeshStandardMaterial({
      map: hayMap, roughness: 0.9, metalness: 0.05, color: 0xd4b85a,
    });
    ctx.addColliderBlock(x, z, w, d, h, true, () => {
      const g = new THREE.Group();
      g.add(ctx.box(w, h, d, mat));
      return g;
    }, 60);
  };
  // hay lines along fire lanes (linear soft cover)
  hay(28, -34, 5.0, 3.6, 2.8);
  hay(-30, 30, 4.6, 4.0, 2.6);
  hay(58, -54, 5.6, 4.2, 3.0);
  hay(-54, 58, 5.0, 4.2, 2.8);
  hay(36, 54, 4.4, 4.4, 2.7);
  hay(-38, -42, 4.6, 3.8, 2.9);
  hay(88, 0, 4.4, 4.4, 2.8);
  hay(-90, 8, 5.0, 4.0, 2.6);
  hay(0, 68, 4.6, 3.8, 2.7);
  hay(0, -70, 4.6, 3.8, 2.7);

  // barrels near stalls / lanes
  const bcolors = ['#8a4a28', '#5a6a2a', '#6a4020'];
  let bi = 0;
  const barrels = (x: number, z: number) => {
    const col = bcolors[(bi++) % bcolors.length];
    const mat = new THREE.MeshStandardMaterial({
      map: barrelTexture(col), roughness: 0.6, metalness: 0.25,
    });
    ctx.addColliderBlock(x, z, 3.0, 3.0, 1.6, true, () => {
      const g = new THREE.Group();
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        const b = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 1.5, 10), mat);
        b.position.set(Math.cos(a) * 0.85, 0.75, Math.sin(a) * 0.85);
        b.castShadow = true;
        g.add(b);
      }
      return g;
    }, 50);
  };
  barrels(22, 22);
  barrels(-24, -22);
  barrels(64, -34);
  barrels(-60, 38);
  barrels(12, -62);
  barrels(-14, 64);
  barrels(72, 68);
  barrels(-70, -66);

  // medium solid wood blocks (cover on lane approaches, non-destructible)
  const solid = woodMat(0x6a5030);
  ctx.addColliderBlock(0, 46, 10, 5, 4.0, false, () => ctx.box(10, 4, 5, solid.clone()), 0, 'block');
  ctx.addColliderBlock(0, -48, 10, 5, 4.0, false, () => ctx.box(10, 4, 5, solid.clone()), 0, 'block');
  ctx.addColliderBlock(52, 20, 5, 10, 4.0, false, () => ctx.box(5, 4, 10, solid.clone()), 0, 'block');
  ctx.addColliderBlock(-54, -20, 5, 10, 4.0, false, () => ctx.box(5, 4, 10, solid.clone()), 0, 'block');
}

// ── raised hay platform (ramp-approached vantage, NE) ──────────────────────

function buildVillageHayPlatform(ctx: ArenaBuildContext) {
  const px = 64, pz = 64;
  const deckH = 2.6;
  const wood = woodMat(0x7a5a30);
  const hayMap = crateTexture('#c9a84c');
  const hayMat = new THREE.MeshStandardMaterial({
    map: hayMap, roughness: 0.9, metalness: 0.05, color: 0xd4b85a,
  });
  // platform base = medium hard cover (walkable top via ramps, blocks shots at base)
  ctx.addColliderBlock(px, pz, 14, 14, deckH, false, () => {
    const g = new THREE.Group();
    g.add(ctx.box(14, deckH, 14, wood));
    // hay bales stacked on top (visual)
    for (const [hx, hz] of [[-3.5, -3.5], [3.5, -3.5], [-3.5, 3.5], [3.5, 3.5], [0, 0]] as const) {
      const bale = ctx.box(3.0, 1.6, 2.4, hayMat);
      bale.position.set(hx, deckH + 0.8, hz);
      g.add(bale);
    }
    return g;
  }, 0, 'block');
}

// ── village ramps (local — scaled for half=150, not shared factory positions) ──

function buildVillageRamps(ctx: ArenaBuildContext) {
  const rampMat = new THREE.MeshStandardMaterial({
    color: 0x6a5028, roughness: 0.8, metalness: 0.1,
    emissive: 0x1a1206, emissiveIntensity: 0.3,
  });
  const addRamp = (x: number, z: number, yaw: number) => {
    const wdt = 5, len = 5.4, hgt = 2.6;
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(len, 0);
    shape.lineTo(len, hgt);
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: wdt, bevelEnabled: false });
    geo.translate(-len / 2, 0, -wdt / 2);
    const mesh = new THREE.Mesh(geo, rampMat.clone());
    mesh.castShadow = true; mesh.receiveShadow = true;
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = yaw;
    g.add(mesh);
    ctx.group.add(g);
    const c = Math.abs(Math.cos(yaw)), s = Math.abs(Math.sin(yaw));
    const fw = len * c + wdt * s, fd = len * s + wdt * c;
    ctx.colliders.push(colliderFromCenter(x, z, fw, fd, hgt, 'ramp', { blocksShots: false, blocksSight: false }));
  };
  // hay-platform approach ramps (NE, both sides)
  addRamp(53, 64, Math.PI / 2);
  addRamp(64, 53, 0);
  // scattered village approach ramps (paddock hops, keep centre lanes clear)
  addRamp(72, -72, Math.PI * 0.25);
  addRamp(-72, 72, -Math.PI * 0.75);
  addRamp(-72, -72, -Math.PI * 0.25);
  addRamp(0, 108, Math.PI);
  addRamp(0, -110, 0);
  addRamp(-108, 0, -Math.PI / 2);
}

// ── windmill (анимированный ландмарк на окраине) ──────────────────────────

function buildVillageWindmill(ctx: ArenaBuildContext) {
  const x = 118, z = 108; // outer NE, за пределами плотного боя
  const baseMat = plasterMat(0xb0a084);
  const capMat = roofMat(0x5a4030);
  ctx.addColliderBlock(x, z, 8, 8, 15, false, () => {
    const g = new THREE.Group();
    // tapering tower
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 4.6, 13, 10), baseMat);
    tower.position.y = 6.5;
    tower.castShadow = true;
    tower.receiveShadow = true;
    g.add(tower);
    // cap
    const cap = new THREE.Mesh(new THREE.ConeGeometry(3.8, 2.6, 10), capMat);
    cap.position.y = 14.2;
    cap.castShadow = true;
    g.add(cap);
    // rotor hub + 4 blades (анимируется)
    const rotor = new THREE.Group();
    rotor.position.set(0, 12.8, -3.9); // на фасаде, смотрит к центру
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.9, 8), woodMat(0x4a3620));
    hub.rotation.x = Math.PI / 2;
    rotor.add(hub);
    const bladeMat = woodMat(0x7a5a30);
    for (let i = 0; i < 4; i++) {
      const blade = new THREE.Group();
      const spar = ctx.box(0.28, 6.4, 0.12, bladeMat);
      spar.position.y = 3.0;
      blade.add(spar);
      const sail = ctx.box(1.5, 4.6, 0.05, new THREE.MeshStandardMaterial({
        color: 0xd8c9a0, roughness: 0.9, metalness: 0.02, side: THREE.DoubleSide,
      }));
      sail.position.set(0.7, 3.4, 0);
      sail.castShadow = true;
      blade.add(sail);
      blade.rotation.z = (i / 4) * Math.PI * 2;
      rotor.add(blade);
    }
    g.add(rotor);
    ctx.animNodes.push((dt) => { rotor.rotation.z += dt * 0.7; });
    return g;
  }, 0, 'wall');
}

// ── market banners / flags (покачивание на ветру) ─────────────────────────

function buildVillageBanners(ctx: ArenaBuildContext) {
  const colors = [0xc45a3a, 0x3a7a5a, 0xc4a03a, 0x8a4a7a];
  const spots: [number, number, number][] = [
    [12, 8, 0.3], [-12, 9, -0.4], [9, -12, 0.5], [-10, -11, -0.2],
  ];
  spots.forEach(([x, z, yaw], i) => {
    const col = colors[i % colors.length];
    const poleMat = woodMat(0x5c4020);
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = yaw;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 4.6, 8), poleMat);
    pole.position.y = 2.3;
    pole.castShadow = true;
    g.add(pole);
    const cross = ctx.box(1.6, 0.1, 0.1, poleMat);
    cross.position.set(0.7, 4.4, 0);
    g.add(cross);
    const cloth = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 1.0, 6, 3),
      new THREE.MeshStandardMaterial({
        color: col, roughness: 0.9, metalness: 0.02, side: THREE.DoubleSide,
      }),
    );
    cloth.position.set(0.75, 3.85, 0);
    cloth.castShadow = true;
    g.add(cloth);
    ctx.group.add(g);
    // волна ткани (вершинная анимация) + лёгкое покачивание флага
    const posAttr = (cloth.geometry as THREE.PlaneGeometry).attributes.position as THREE.BufferAttribute;
    const base = posAttr.array.slice() as Float32Array;
    const phase = i * 1.7;
    ctx.animNodes.push((_dt, elapsed) => {
      const t = elapsed * 3 + phase;
      for (let v = 0; v < posAttr.count; v++) {
        const bx = base[v * 3];
        const wave = Math.sin(t + bx * 2.2) * 0.06 * (bx + 0.75);
        posAttr.setZ(v, wave);
      }
      posAttr.needsUpdate = true;
      g.rotation.y = yaw + Math.sin(elapsed * 0.8 + phase) * 0.12;
    });
  });
}

// ── fireflies / pollen in dusk light (не-LOS, атмосфера) ───────────────────

function buildVillageFireflies(ctx: ArenaBuildContext) {
  const N = 90;
  const pos = new Float32Array(N * 3);
  const seed = new Float32Array(N * 2);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 220;
    pos[i * 3 + 1] = 0.6 + Math.random() * 3.4;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 220;
    seed[i * 2] = Math.random() * Math.PI * 2;
    seed[i * 2 + 1] = 0.4 + Math.random() * 0.9;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xffe08a, size: 0.32, transparent: true, opacity: 0.85,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const pts = new THREE.Points(geo, mat);
  ctx.group.add(pts);
  const attr = geo.attributes.position as THREE.BufferAttribute;
  const base = pos.slice();
  ctx.animNodes.push((_dt, elapsed) => {
    for (let i = 0; i < N; i++) {
      const p = seed[i * 2], s = seed[i * 2 + 1];
      attr.setX(i, base[i * 3] + Math.sin(elapsed * s + p) * 1.6);
      attr.setY(i, base[i * 3 + 1] + Math.sin(elapsed * s * 1.3 + p * 2) * 0.5);
      attr.setZ(i, base[i * 3 + 2] + Math.cos(elapsed * s * 0.8 + p) * 1.6);
    }
    attr.needsUpdate = true;
    mat.opacity = 0.6 + Math.sin(elapsed * 2.4) * 0.3;
  });
}

// ── foliage: instanced grass/wheat tufts (non-LOS, производительно) ────────

function buildVillageFoliage(ctx: ArenaBuildContext) {
  // один InstancedMesh на все пучки — дёшево по draw-calls
  const tuftGeo = new THREE.ConeGeometry(0.5, 1.4, 5);
  tuftGeo.translate(0, 0.7, 0);
  const tuftMat = new THREE.MeshStandardMaterial({
    color: 0x7a8a3a, roughness: 0.95, metalness: 0.0,
  });
  const COUNT = 420;
  const inst = new THREE.InstancedMesh(tuftGeo, tuftMat, COUNT);
  inst.receiveShadow = true;
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  let placed = 0;
  let guard = 0;
  // держимся вне fire-lanes (|x|<14 или |z|<14) и площади (|x|,|z|<30)
  while (placed < COUNT && guard < COUNT * 30) {
    guard++;
    const x = (Math.random() - 0.5) * 280;
    const z = (Math.random() - 0.5) * 280;
    if (Math.abs(x) < 15 || Math.abs(z) < 15) continue;
    if (Math.abs(x) < 32 && Math.abs(z) < 32) continue;
    const wheat = (x < -66 && z > 34) || (x > 64 && z < -60) || (x > 28 && z > 90);
    const s = wheat ? 1.5 + Math.random() * 0.9 : 0.7 + Math.random() * 0.8;
    dummy.position.set(x, 0, z);
    dummy.rotation.y = Math.random() * Math.PI;
    dummy.scale.set(s, s * (0.9 + Math.random() * 0.5), s);
    dummy.updateMatrix();
    inst.setMatrixAt(placed, dummy.matrix);
    color.setHex(wheat ? 0xc0a04a : [0x6a7a34, 0x7a8a3a, 0x5a6e2e][placed % 3]);
    color.offsetHSL(0, 0, (Math.random() - 0.5) * 0.06);
    inst.setColorAt(placed, color);
    placed++;
  }
  inst.count = placed;
  if (inst.instanceMatrix) inst.instanceMatrix.needsUpdate = true;
  if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
  ctx.group.add(inst);
}

// ── atmosphere (warm dusk dust) ────────────────────────────────────────────

function buildVillageAtmosphere(ctx: ArenaBuildContext) {
  const domeGeo = new THREE.CylinderGeometry(ctx.half + 6, ctx.half + 6, 76, 48, 1, true);
  const domeMat = new THREE.MeshBasicMaterial({
    map: hexTexture(),
    transparent: true,
    opacity: 0.03,
    side: THREE.BackSide,
    depthWrite: false,
    color: GOLD,
    blending: THREE.AdditiveBlending,
  });
  const dome = new THREE.Mesh(domeGeo, domeMat);
  dome.position.y = 32;
  ctx.group.add(dome);
  ctx.setDome(dome);

  const N = 520;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - 0.5) * ARENA.size;
    pos[i * 3 + 1] = 0.4 + Math.random() * 12;
    pos[i * 3 + 2] = (Math.random() - 0.5) * ARENA.size;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xd4c090,
    size: 0.2,
    transparent: true,
    opacity: 0.4,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const dust = new THREE.Points(geo, mat);
  ctx.group.add(dust);
  ctx.setDust(dust);
}
