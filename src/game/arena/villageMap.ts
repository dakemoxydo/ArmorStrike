// ===== Карта Village: деревня с домами, амбарами, часовней, полями =====
// Arena half = 150 (ARENA.size 300). Layout graph:
//   Square core  : |x|,|z| < 30  — paved plaza, well landmark NW edge, stalls,
//                  trough, wagon, string lights; CP-A sits in the open centre
//   Fire lanes   : N–S x∈[−10,10], E–W z∈[−10,10] clear crossroads (no collider)
//   Inner ring   : 30<r<58 — paddock fence wings, hay lines, barrels, wood piles,
//                  orchard (SW), pond + jetty + reeds (NW), flower beds, scarecrow
//   House ring   : mid-ring r≈58–72 — 14 timber-framed houses, hard-cover graph
//   Barns        : NW (−98,82) pair · SE (98,−82) pair · 2 mid barns — hard anchors
//   Chapel       : SW outer (−104,−100) — nave + bell tower, tallest landmark
//   Windmill     : NE outer (118,108) — animated rotor
//   Fields       : wheat/tilled patches with haystacks (soft cover)
//   Spawn aprons : x∈[−78,78] with |z|∈[84,130] kept clear (teams spawn there)
//   Ramps        : decorative wedges, blocksShots/Sight = false
// Cover hierarchy: hard (houses/barns/chapel/well) · medium (solid wood piles)
//                  · soft (fences/hay/barrels/stalls/wagon/reeds/haystacks)
//                  · non-LOS (tree canopy, water, lights)
import * as THREE from 'three';
import { ARENA } from '../constants';
import { colliderFromCenter } from '../engine/physics';
import {
  duskGlowTexture,
  fieldstoneTexture,
  hayBaleTexture,
  oakBarrelTexture,
  plankTexture,
  plasterTexture,
  shingleTexture,
  thatchTexture,
} from '../textures';
import type { ArenaBuildContext } from './context';
import { buildTowerRing, ringSlots } from './skyline';

const GOLD = 0xc8a24a;
const STRAW = '#c2a04e';

/** Village-themed interior: square, chapel, houses, barns, orchard, pond. */
export function buildVillageContent(ctx: ArenaBuildContext) {
  buildVillageSkyline(ctx);
  buildVillageSquare(ctx);
  buildVillageChapel(ctx);
  buildVillageHouses(ctx);
  buildVillageBarns(ctx);
  buildVillageFences(ctx);
  buildVillageOrchard(ctx);
  buildVillagePond(ctx);
  buildVillageTrees(ctx);
  buildVillageScattered(ctx);
  buildVillageHaystacks(ctx);
  buildVillageHayPlatform(ctx);
  buildVillageRamps(ctx);
  buildVillageWindmill(ctx);
  buildVillageBanners(ctx);
  buildVillageFlowers(ctx);
  buildVillageFireflies(ctx);
  buildVillageFoliage(ctx);
  buildVillageAtmosphere(ctx);
}

// ── materials (village-native textures; no factory assets) ─────────────────

function plasterMat(tone: string) {
  return new THREE.MeshStandardMaterial({ map: plasterTexture(tone), roughness: 0.92, metalness: 0.02 });
}
function plankMat(tone = '#8a6836', vertical = false) {
  return new THREE.MeshStandardMaterial({ map: plankTexture(tone, vertical), roughness: 0.86, metalness: 0.04 });
}
function thatchMat(tone = STRAW) {
  return new THREE.MeshStandardMaterial({ map: thatchTexture(tone), roughness: 0.95, metalness: 0.0 });
}
function shingleMat(tone = '#7a4436') {
  return new THREE.MeshStandardMaterial({ map: shingleTexture(tone), roughness: 0.8, metalness: 0.06 });
}
function stoneMat(tone = '#8a8578') {
  return new THREE.MeshStandardMaterial({ map: fieldstoneTexture(tone), roughness: 0.95, metalness: 0.02 });
}
/** Dark structural timber — beams, studs, frames (untextured, cheap). */
function woodMat(color = 0x4a3520) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.88, metalness: 0.04 });
}
function shutterMat(color = 0x4a5a38) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0.02 });
}

const PLASTER_TONES = ['#d8cbb2', '#cdbfa2', '#c2b394', '#e0d6c0'];
const ROOF_TONES = ['#7a4436', '#5a4a3a', '#6a3a30', '#4e5a44'];
const PLANK_TONES = ['#8a6836', '#6f5228', '#9a7a44'];

// ── skyline (rolling hills + low farmhouses + a distant steeple) ───────────

function buildVillageSkyline(ctx: ArenaBuildContext) {
  const dark = new THREE.MeshStandardMaterial({
    color: 0x1a1810, roughness: 1, emissive: 0x1a1408, emissiveIntensity: 0.25,
  });
  const hillMat = new THREE.MeshStandardMaterial({
    color: 0x14180e, roughness: 1, emissive: 0x0e1408, emissiveIntensity: 0.2,
  });
  const warm = new THREE.MeshBasicMaterial({ color: 0xffc266 });
  // rolling hill silhouettes (distant, low, wide)
  for (const { x, z } of ringSlots(22, 0.1, 190, 260)) {
    const rad = 26 + Math.random() * 40;
    const hill = new THREE.Mesh(new THREE.SphereGeometry(rad, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), hillMat);
    hill.position.set(x, -rad * 0.35, z);
    hill.scale.y = 0.42;
    ctx.group.add(hill);
  }
  // low farmhouses with warm windows
  buildTowerRing(ctx, {
    material: dark,
    count: 30,
    angleJitter: 0.08,
    rMin: 168, rMax: 222,
    widthMin: 12, widthMax: 34,
    heightMin: 7, heightMax: 21,
    depthRatio: 0.7,
    baseY: -0.4,
    window: { material: warm, skip: 0.3, widthRatio: 0.32, heightRatio: 0.16, yMin: 0.45, yMax: 0.45 },
    onTower: (m, _i, w, h) => {
      const roof = new THREE.Mesh(new THREE.BoxGeometry(w * 1.1, h * 0.4, w * 0.8), hillMat);
      roof.position.set(m.position.x, h + h * 0.15, m.position.z);
      roof.rotation.y = m.rotation.y;
      ctx.group.add(roof);
    },
  });
}

// ── roof primitives ───────────────────────────────────────────────────────

/** Triangular-prism pitched roof mesh (ridge along local X). */
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

// ── house (hard cover, half-timbered, pitched roof) ────────────────────────

function house(
  ctx: ArenaBuildContext,
  x: number, z: number,
  w: number, d: number, h: number,
  yaw = 0,
  small = false,
) {
  const body = plasterMat(PLASTER_TONES[Math.floor(Math.random() * PLASTER_TONES.length)]);
  const roof = shingleMat(ROOF_TONES[Math.floor(Math.random() * ROOF_TONES.length)]);
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
    g.add(roofMesh);
    // chimney with cap — registers a smoke emitter for hearth-smoke
    const chimX = w * 0.18, chimZ = d * 0.12;
    const chimRx = Math.cos(yaw) * chimX - Math.sin(yaw) * chimZ;
    const chimRz = Math.sin(yaw) * chimX + Math.cos(yaw) * chimZ;
    const chimney = ctx.box(0.7, 2.3, 0.7, stoneMat('#6a6156'));
    chimney.position.set(chimRx, h + 1.6, chimRz);
    chimney.castShadow = true;
    g.add(chimney);
    const cap = ctx.box(1.0, 0.3, 1.0, stoneMat('#5a5248'));
    cap.position.set(chimRx, h + 2.75, chimRz);
    g.add(cap);
    ctx.smokeEmitters.push(new THREE.Vector3(x + chimRx, h + 2.9, z + chimRz));
    // door (frame + canopy) — single yaw on wrapper (no double-rotation)
    const doorMat = woodMat(0x3a2818);
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
    const wxs = small ? [-w * 0.26] : [-w * 0.28, w * 0.28];
    for (const wx of wxs) {
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

// ── market square (relocated well + stalls + trough + wagon + lights) ──────

function buildVillageSquare(ctx: ArenaBuildContext) {
  // ── well at the NW edge of the square (landmark, hard cover, off the cross) ──
  ctx.addColliderBlock(-16, 30, 6.5, 6.5, 3.4, false, () => {
    const g = new THREE.Group();
    const stone = stoneMat('#8f8a7c');
    g.add(ctx.box(6.0, 2.4, 6.0, stone));
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.7, 0.6, 14), stone);
    rim.position.y = 2.7;
    rim.castShadow = true;
    g.add(rim);
    const postMat = plankMat('#6f5228', true);
    for (const sx of [-2.1, 2.1]) {
      const post = ctx.box(0.5, 4.8, 0.5, postMat);
      post.position.set(sx, 2.4, 0);
      g.add(post);
    }
    const beam = ctx.box(4.8, 0.45, 0.45, postMat);
    beam.position.y = 5.0;
    g.add(beam);
    // well-sweep (журавль): vertical arrow + pivot arm with rope and bucket
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
    const bucket = ctx.box(0.5, 0.45, 0.5, plankMat('#6f5228'));
    bucket.position.set(0, -1.75, -2.7);
    arm.add(bucket);
    g.add(arm);
    // little pitched shelter over the well
    const shelter = ridgeRoof(5.4, 3.2, 1.1, thatchMat('#b08f42'));
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

  // ── stone water trough beside the well (low soft cover) ───────────────────
  ctx.addColliderBlock(-16, 22, 4.4, 2.4, 1.0, true, () => {
    const g = new THREE.Group();
    const body = ctx.box(4.4, 1.0, 2.4, stoneMat('#7f7a6c'));
    g.add(body);
    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(3.6, 1.7),
      new THREE.MeshStandardMaterial({ color: 0x4a6a72, roughness: 0.25, metalness: 0.5 }),
    );
    water.rotation.x = -Math.PI / 2;
    water.position.y = 0.94;
    g.add(water);
    return g;
  }, 40);

  // ── market stalls ringing the square (destructible soft cover) ────────────
  const stall = (x: number, z: number, yaw: number, canvasCol: number) => {
    const canvas = new THREE.MeshStandardMaterial({ color: canvasCol, roughness: 0.75, metalness: 0.04 });
    const wood = plankMat('#6f5228');
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
  stall(22, 22, 0.2, 0xc45a3a);
  stall(22, -22, 0.4, 0xc4a03a);
  stall(-22, -22, -0.15, 0x3a7a5a);

  // ── hay wagon parked at the square's west side (soft cover) ───────────────
  ctx.addColliderBlock(-26, -14, 6.6, 3.2, 2.6, true, () => {
    const g = new THREE.Group();
    const bed = ctx.box(6.6, 0.5, 3.0, plankMat('#6f5228'));
    bed.position.y = 1.5;
    g.add(bed);
    const load = ctx.box(5.8, 1.5, 2.6, new THREE.MeshStandardMaterial({
      map: hayBaleTexture(), roughness: 0.95, metalness: 0.0,
    }));
    load.position.y = 2.45;
    g.add(load);
    const wheelMat = woodMat(0x4a3520);
    for (const wx of [-2.2, 2.2]) {
      for (const wz of [-1.5, 1.5]) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.22, 12), wheelMat);
        wheel.rotation.x = Math.PI / 2;
        wheel.position.set(wx, 0.85, wz);
        wheel.castShadow = true;
        g.add(wheel);
      }
    }
    const shaft = ctx.box(2.6, 0.16, 0.16, woodMat(0x4a3520));
    shaft.position.set(4.2, 1.3, 0);
    g.add(shaft);
    return g;
  }, 60);

  // ── signpost at the crossroads (soft, charm) ──────────────────────────────
  ctx.addColliderBlock(13, 13, 1.0, 1.0, 3.0, true, () => {
    const g = new THREE.Group();
    const post = ctx.box(0.24, 3.0, 0.24, plankMat('#6f5228', true));
    g.add(post);
    const armMat = plankMat('#8a6836');
    const arms: [number, number, number][] = [[0, 2.7, 0.5], [0.5, 2.3, -0.7], [-0.6, 1.9, 1.9]];
    for (const [ax, ay, az] of arms) {
      const arm = ctx.box(1.7, 0.34, 0.1, armMat);
      arm.position.set(ax, ay, 0);
      arm.rotation.y = az;
      g.add(arm);
    }
    return g;
  }, 25);

  // ── string lights over the square (warm dusk dressing, non-LOS) ───────────
  buildVillageStringLights(ctx);
}

/** Catenary string lights on four poles across the market square. */
function buildVillageStringLights(ctx: ArenaBuildContext) {
  const corners: [number, number][] = [[17, 17], [-17, 17], [17, -17], [-17, -17]];
  const poleMat = plankMat('#6f5228', true);
  const poleGeo = new THREE.CylinderGeometry(0.14, 0.2, 5.4, 8);
  const poles = new THREE.InstancedMesh(poleGeo, poleMat, corners.length);
  poles.castShadow = true;
  const dummy = new THREE.Object3D();
  corners.forEach(([x, z], i) => {
    dummy.position.set(x, 2.7, z);
    dummy.updateMatrix();
    poles.setMatrixAt(i, dummy.matrix);
  });
  poles.instanceMatrix.needsUpdate = true;
  ctx.group.add(poles);

  // bulbs strung along each of the four spans, sagging in the middle
  const spans: [[number, number], [number, number]][] = [
    [corners[0], corners[1]], [corners[1], corners[3]],
    [corners[3], corners[2]], [corners[2], corners[0]],
  ];
  const PER_SPAN = 11;
  const total = spans.length * PER_SPAN;
  const bulbGeo = new THREE.SphereGeometry(0.16, 6, 6);
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffd08a });
  const bulbs = new THREE.InstancedMesh(bulbGeo, bulbMat, total);
  const wireGeo = new THREE.BoxGeometry(1, 0.03, 0.03);
  const wireMat = new THREE.MeshBasicMaterial({ color: 0x2a2018 });
  const wires = new THREE.InstancedMesh(wireGeo, wireMat, total);
  let n = 0;
  for (const [[ax, az], [bx, bz]] of spans) {
    for (let i = 0; i < PER_SPAN; i++) {
      const t = (i + 0.5) / PER_SPAN;
      const x = ax + (bx - ax) * t;
      const z = az + (bz - az) * t;
      const sag = Math.sin(Math.PI * t) * 0.9;
      const y = 5.2 - sag;
      dummy.position.set(x, y, z);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      bulbs.setMatrixAt(n, dummy.matrix);
      // wire segment between successive bulbs
      const pt = i / PER_SPAN;
      const px = ax + (bx - ax) * pt;
      const pz = az + (bz - az) * pt;
      const py = 5.2 - Math.sin(Math.PI * pt) * 0.9;
      const dx = x - px, dy = y - py, dz = z - pz;
      const len = Math.hypot(dx, dy, dz) || 0.01;
      dummy.position.set((x + px) / 2, (y + py) / 2, (z + pz) / 2);
      dummy.rotation.set(0, Math.atan2(dx, dz), Math.atan2(dy, Math.hypot(dx, dz)));
      dummy.scale.set(len, 1, 1);
      dummy.updateMatrix();
      wires.setMatrixAt(n, dummy.matrix);
      n++;
    }
  }
  bulbs.instanceMatrix.needsUpdate = true;
  wires.instanceMatrix.needsUpdate = true;
  ctx.group.add(bulbs);
  ctx.group.add(wires);
  // gentle flicker so the square feels alive at dusk
  ctx.animNodes.push((_dt, elapsed) => {
    bulbMat.color.setHSL(0.09, 0.62, 0.62 + Math.sin(elapsed * 2.1) * 0.05);
  });
}

// ── chapel with bell tower (SW landmark, hard cover) ──────────────────────

function buildVillageChapel(ctx: ArenaBuildContext) {
  const cx = -104;
  const naveZ = -100;
  const towerZ = -116;
  const wall = plasterMat('#c4b8a0');
  const roofMat = shingleMat('#4e4034');
  const trim = stoneMat('#8a8578');

  // nave
  ctx.addColliderBlock(cx, naveZ, 14, 24, 9, false, () => {
    const g = new THREE.Group();
    g.add(ctx.box(14, 9, 24, wall));
    const plinth = ctx.box(14.4, 0.7, 24.4, trim);
    plinth.position.y = 0.35;
    g.add(plinth);
    // steep gable roof, ridge along Z
    const r = ridgeRoof(24 * 1.1, 14 * 1.12, 4.6, roofMat);
    r.rotation.y = Math.PI / 2;
    r.position.y = 9;
    g.add(r);
    // buttresses along the flanks
    for (const sx of [-7.4, 7.4]) {
      for (const bz of [-8, 0, 8]) {
        const b = ctx.box(1.1, 5.4, 1.4, trim);
        b.position.set(sx, 2.7, bz);
        g.add(b);
      }
    }
    // stained-glass windows (emissive) on both flanks
    const glass = new THREE.MeshBasicMaterial({ color: 0xffb060 });
    for (const sx of [-7.05, 7.05]) {
      for (const wz of [-7, 0, 7]) {
        const win = new THREE.Mesh(new THREE.BoxGeometry(0.16, 3.4, 1.7), glass);
        win.position.set(sx, 5.2, wz);
        g.add(win);
      }
    }
    // arched south door + rose window on the gable
    const doorMat = woodMat(0x3a2818);
    const door = ctx.box(2.6, 4.0, 0.3, doorMat);
    door.position.set(0, 2.0, 12.1);
    g.add(door);
    const arch = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 0.3, 12, 1, false, 0, Math.PI), doorMat);
    arch.rotation.x = Math.PI / 2;
    arch.rotation.z = 0;
    arch.position.set(0, 4.0, 12.1);
    g.add(arch);
    const frame = ctx.box(3.4, 4.6, 0.16, trim);
    frame.position.set(0, 2.3, 12.0);
    g.add(frame);
    const rose = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.2, 16), glass);
    rose.rotation.x = Math.PI / 2;
    rose.position.set(0, 6.6, 12.2);
    g.add(rose);
    // cross on the south gable peak
    const cross = new THREE.Group();
    const cv = ctx.box(0.22, 1.8, 0.22, woodMat(0x2a1c10));
    cross.add(cv);
    const ch = ctx.box(1.2, 0.22, 0.22, woodMat(0x2a1c10));
    ch.position.y = 0.35;
    cross.add(ch);
    cross.position.set(0, 13.9, 0);
    g.add(cross);
    return g;
  }, 0, 'wall');

  // bell tower
  ctx.addColliderBlock(cx, towerZ, 10, 10, 20, false, () => {
    const g = new THREE.Group();
    g.add(ctx.box(10, 20, 10, wall));
    const plinth = ctx.box(10.4, 0.7, 10.4, trim);
    plinth.position.y = 0.35;
    g.add(plinth);
    // belfry louvres (dark openings on all four faces)
    const louvre = woodMat(0x2a1c10);
    for (const [ox, oz, rot] of [
      [0, 5.05, 0], [0, -5.05, 0], [5.05, 0, Math.PI / 2], [-5.05, 0, Math.PI / 2],
    ] as const) {
      const l = ctx.box(4.2, 4.6, 0.3, louvre);
      l.position.set(ox, 16.4, oz);
      l.rotation.y = rot;
      g.add(l);
    }
    // cornice + spire
    const cornice = ctx.box(11, 0.8, 11, trim);
    cornice.position.y = 19.6;
    g.add(cornice);
    const spire = new THREE.Mesh(new THREE.ConeGeometry(6.4, 9, 4), shingleMat('#4e5a44'));
    spire.position.y = 24.5;
    spire.rotation.y = Math.PI / 4;
    spire.castShadow = true;
    g.add(spire);
    // weathervane (animated) + bell (animated swing)
    const vane = new THREE.Group();
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.6, 6), woodMat(0x2a1c10));
    rod.position.y = 0.8;
    vane.add(rod);
    const arrow = ctx.box(1.6, 0.1, 0.1, new THREE.MeshBasicMaterial({ color: GOLD }));
    arrow.position.y = 1.5;
    vane.add(arrow);
    vane.position.y = 29;
    g.add(vane);
    ctx.animNodes.push((_dt, elapsed) => { vane.rotation.y = Math.sin(elapsed * 0.5) * 0.7 + 0.4; });

    const bellPivot = new THREE.Group();
    bellPivot.position.set(0, 19.0, 0);
    const bellMat = new THREE.MeshStandardMaterial({ color: 0x8a6a2a, roughness: 0.4, metalness: 0.8 });
    const bell = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.5, 1.7, 12), bellMat);
    bell.position.y = -1.1;
    bellPivot.add(bell);
    const clapper = ctx.box(0.16, 1.1, 0.16, woodMat(0x2a1c10));
    clapper.position.y = -2.2;
    bellPivot.add(clapper);
    g.add(bellPivot);
    ctx.animNodes.push((_dt, elapsed) => { bellPivot.rotation.z = Math.sin(elapsed * 1.6) * 0.16; });

    // warm light from the belfry
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.4, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffc266, transparent: true, opacity: 0.85 }),
    );
    glow.position.y = 16.4;
    g.add(glow);
    ctx.beaconMats.push(glow.material as THREE.MeshBasicMaterial);
    return g;
  }, 0, 'wall');
}

// ── houses (hard-cover graph on the mid-ring) ──────────────────────────────

function buildVillageHouses(ctx: ArenaBuildContext) {
  // north row (facing south toward centre) — outside the z<−84 spawn apron
  house(ctx, -26, -68, 16, 13, 7.5, 0.05);
  house(ctx, 26, -70, 15, 12, 7.0, -0.1);
  house(ctx, -62, -60, 15, 15, 6.8, -0.05);
  house(ctx, 62, -58, 18, 13, 8.2, 0.08);
  // south row (facing north)
  house(ctx, -26, 70, 16, 13, 8.0, Math.PI + 0.1);
  house(ctx, 26, 68, 14, 12, 6.8, Math.PI - 0.08);
  house(ctx, -62, 62, 15, 15, 7.2, Math.PI - 0.12);
  house(ctx, 62, 60, 15, 13, 7.6, Math.PI + 0.04);
  // east / west rows (facing inward, clear of the flank capture clearings)
  house(ctx, 60, -32, 15, 17, 7.6, -Math.PI / 2);
  house(ctx, 62, 22, 14, 15, 7.0, -Math.PI / 2 + 0.08);
  house(ctx, -54, -32, 15, 17, 7.4, Math.PI / 2);
  house(ctx, -56, 26, 14, 15, 6.8, Math.PI / 2 - 0.1);
  // inner cottages (closer, create peek angles near the square)
  house(ctx, 38, 34, 13, 11, 6.0, -Math.PI * 0.75, true);
  house(ctx, -34, -30, 13, 11, 6.2, Math.PI * 0.25, true);
}

// ── barns (large hard anchors) ─────────────────────────────────────────────

function buildVillageBarns(ctx: ArenaBuildContext) {
  const barn = (x: number, z: number, w: number, d: number, h: number, yaw = 0) => {
    const body = plankMat(PLANK_TONES[Math.floor(Math.random() * PLANK_TONES.length)]);
    const roof = thatchMat('#a8873c');
    ctx.addColliderBlock(x, z, w, d, h + 1.8, false, () => {
      const g = new THREE.Group();
      const base = ctx.box(w, h, d, body);
      base.rotation.y = yaw;
      g.add(base);
      const plinth = ctx.box(w * 1.02, 0.7, d * 1.02, stoneMat('#7f7a6c'));
      plinth.position.y = 0.35;
      plinth.rotation.y = yaw;
      g.add(plinth);
      // whitewashed door surround
      const r = gambrelRoof(w * 1.14, d * 1.12, 3.2, roof);
      r.position.y = h + 0.1;
      r.rotation.y = yaw;
      g.add(r);
      // barn door + frame + X-brace
      const doorMat = woodMat(0x3a2810);
      const dw = new THREE.Group(); dw.rotation.y = yaw;
      const door = new THREE.Mesh(new THREE.BoxGeometry(w * 0.42, h * 0.72, 0.25), doorMat);
      door.position.set(0, h * 0.36, d / 2 + 0.05);
      door.castShadow = true;
      dw.add(door);
      const frame = ctx.box(w * 0.48, h * 0.78, 0.14, plankMat('#6f5228'));
      frame.position.set(0, h * 0.39, d / 2 + 0.02);
      dw.add(frame);
      // X-brace (планки по диагонали) — характерная деталь амбарных ворот
      const braceMat = plankMat('#9a7a44');
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
  // NW cluster (|x| > 78 → clear of the spawn apron)
  barn(-98, 82, 24, 17, 10.5, 0.05);
  barn(-120, 108, 18, 14, 8.5, Math.PI / 2);
  // SE cluster
  barn(98, -82, 22, 18, 10.0, -0.05);
  barn(118, -106, 18, 15, 8.5, Math.PI / 2);
  // mid barns (flank anchors)
  barn(-86, -52, 20, 16, 9.0, 0.1);
  barn(84, 50, 19, 15, 8.8, -0.08);
}

// ── fence paddocks (linear soft peek mazes, open ends — no dead pens) ──────

function buildVillageFences(ctx: ArenaBuildContext) {
  const postMat = plankMat('#6f5228', true);
  const railMat = plankMat('#8a6836');
  const segment = (x: number, z: number, len: number, yaw: number) => {
    const w = Math.abs(Math.cos(yaw)) * len + Math.abs(Math.sin(yaw)) * 0.4;
    const d = Math.abs(Math.sin(yaw)) * len + Math.abs(Math.cos(yaw)) * 0.4;
    ctx.addColliderBlock(x, z, Math.max(w, 0.8), Math.max(d, 0.8), 1.5, true, () => {
      const g = new THREE.Group();
      const posts = Math.max(4, Math.round(len / 3));
      // Identical posts -> one InstancedMesh per segment instead of N meshes
      // (~108 plain box draws -> 14 instanced draws; see draw-call census).
      const postGeo = new THREE.BoxGeometry(0.3, 1.45, 0.3);
      const inst = new THREE.InstancedMesh(postGeo, postMat, posts);
      inst.castShadow = true;
      inst.receiveShadow = true;
      const dummy = new THREE.Object3D();
      for (let i = 0; i < posts; i++) {
        const t = (i / (posts - 1) - 0.5) * len;
        dummy.position.set(Math.cos(yaw) * t, 0.72, Math.sin(yaw) * t);
        dummy.updateMatrix();
        inst.setMatrixAt(i, dummy.matrix);
      }
      inst.instanceMatrix.needsUpdate = true;
      g.add(inst);
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
  segment(-98, 56, 26, 0);
  segment(-116, 42, 26, Math.PI / 2);
  // SE paddock
  segment(98, -56, 26, 0);
  segment(116, -42, 26, Math.PI / 2);
  // lane-mouth wings: flank the fire lanes, never cross them (centre stays open)
  segment(-24, 42, 24, 0);
  segment(24, 42, 24, 0);
  segment(-24, -42, 24, 0);
  segment(24, -42, 24, 0);
  segment(42, -24, 24, Math.PI / 2);
  segment(42, 24, 24, Math.PI / 2);
  segment(-42, -24, 24, Math.PI / 2);
  segment(-42, 24, 24, Math.PI / 2);
}

// ── orchard (instanced fruit trees, SW inner field) ───────────────────────

function buildVillageOrchard(ctx: ArenaBuildContext) {
  const xs = [-60, -50, -40];
  const zs = [-42, -52, -62];
  const n = xs.length * zs.length;
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3420, roughness: 0.9, metalness: 0 });
  const blossomMat = new THREE.MeshStandardMaterial({ color: 0xd98aa0, roughness: 0.9, metalness: 0 });
  const trunkGeo = new THREE.CylinderGeometry(0.34, 0.5, 3.2, 8);
  const canopyGeo = new THREE.SphereGeometry(2.5, 10, 8);
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, n);
  const canopies = new THREE.InstancedMesh(canopyGeo, blossomMat, n);
  trunks.castShadow = true;
  trunks.receiveShadow = true;
  canopies.castShadow = true;
  canopies.receiveShadow = true;
  const dummy = new THREE.Object3D();
  let i = 0;
  for (const x of xs) {
    for (const z of zs) {
      const jx = x + (Math.random() - 0.5) * 1.2;
      const jz = z + (Math.random() - 0.5) * 1.2;
      const s = 0.9 + Math.random() * 0.2;
      dummy.position.set(jx, 1.6 * s, jz);
      dummy.rotation.set(0, Math.random() * Math.PI, 0);
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      trunks.setMatrixAt(i, dummy.matrix);
      dummy.position.set(jx, 3.6 * s, jz);
      dummy.rotation.set(0, Math.random() * Math.PI, 0);
      dummy.scale.set(s, s * 0.85, s);
      dummy.updateMatrix();
      canopies.setMatrixAt(i, dummy.matrix);
      // trunk-only collision, canopy non-LOS
      ctx.colliders.push(colliderFromCenter(jx, jz, 1.5, 1.5, 3.6, 'block', {
        blocksSight: false,
      }));
      i++;
    }
  }
  trunks.instanceMatrix.needsUpdate = true;
  canopies.instanceMatrix.needsUpdate = true;
  ctx.group.add(trunks);
  ctx.group.add(canopies);
  // a few crates of picked fruit between the rows (soft cover)
  const crateMat = new THREE.MeshStandardMaterial({ map: plankTexture('#8a6836'), roughness: 0.85, metalness: 0.05 });
  for (const [cx, cz] of [[-60, -47], [-45, -57]] as const) {
    ctx.addColliderBlock(cx, cz, 2.2, 2.2, 1.1, true, () => {
      const g = new THREE.Group();
      g.add(ctx.box(2.2, 1.1, 2.2, crateMat));
      const lid = ctx.box(2.4, 0.16, 2.4, plankMat('#6f5228'));
      lid.position.y = 1.1;
      g.add(lid);
      return g;
    }, 30);
  }
}

// ── pond with jetty and reeds (NW inner, scenic + soft cover) ─────────────

function buildVillagePond(ctx: ArenaBuildContext) {
  const px = -48, pz = 48;
  // water — flat additive-ish plane, non-LOS, no collider
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(24, 18, 1, 1),
    new THREE.MeshStandardMaterial({
      color: 0x2e4a5c, roughness: 0.15, metalness: 0.6,
      transparent: true, opacity: 0.9,
    }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(px, 0.06, pz);
  water.receiveShadow = true;
  ctx.group.add(water);
  // muddy bank ring (soft, decorative, no collider)
  const bank = new THREE.Mesh(
    new THREE.RingGeometry(11.4, 14.6, 28),
    new THREE.MeshStandardMaterial({ color: 0x4a3c22, roughness: 0.95 }),
  );
  bank.rotation.x = -Math.PI / 2;
  bank.position.set(px, 0.04, pz);
  ctx.group.add(bank);
  // ripples (animated opacity)
  ctx.animNodes.push((_dt, elapsed) => {
    const m = water.material as THREE.MeshStandardMaterial;
    m.opacity = 0.86 + Math.sin(elapsed * 0.9) * 0.05;
  });
  // wooden jetty (soft cover, small)
  ctx.addColliderBlock(px + 12, pz - 4, 8.5, 2.4, 0.7, true, () => {
    const g = new THREE.Group();
    const deck = ctx.box(8.5, 0.3, 2.4, plankMat('#6f5228'));
    deck.position.y = 0.65;
    g.add(deck);
    for (const sx of [-3.6, 0, 3.6]) {
      for (const sz of [-0.9, 0.9]) {
        const pile = ctx.box(0.28, 1.3, 0.28, woodMat(0x3a2818));
        pile.position.set(sx, 0.15, sz);
        g.add(pile);
      }
    }
    return g;
  }, 45);
  // rowboat moored at the jetty (soft)
  ctx.addColliderBlock(px + 15, pz - 8, 2.6, 5.0, 1.0, true, () => {
    const g = new THREE.Group();
    const hull = ctx.box(2.4, 1.0, 4.6, plankMat('#6f5228'));
    hull.position.y = 0.5;
    g.add(hull);
    const rim = ctx.box(2.7, 0.16, 4.9, plankMat('#8a6836'));
    rim.position.y = 1.0;
    g.add(rim);
    return g;
  }, 35);
  // reeds around the bank — instanced, non-LOS
  const N = 96;
  const reedGeo = new THREE.ConeGeometry(0.09, 1.7, 4);
  reedGeo.translate(0, 0.85, 0);
  const reedMat = new THREE.MeshStandardMaterial({ color: 0x6f7a34, roughness: 0.95 });
  const reeds = new THREE.InstancedMesh(reedGeo, reedMat, N);
  reeds.castShadow = true;
  const dummy = new THREE.Object3D();
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2 + Math.random() * 0.2;
    const r = 11.6 + Math.random() * 2.6;
    dummy.position.set(px + Math.cos(a) * r, 0, pz + Math.sin(a) * r);
    dummy.rotation.set((Math.random() - 0.5) * 0.2, Math.random() * Math.PI, (Math.random() - 0.5) * 0.2);
    const s = 0.8 + Math.random() * 0.7;
    dummy.scale.set(s, s, s);
    dummy.updateMatrix();
    reeds.setMatrixAt(i, dummy.matrix);
  }
  reeds.instanceMatrix.needsUpdate = true;
  ctx.group.add(reeds);
  // lily pads
  const padGeo = new THREE.CircleGeometry(0.9, 8);
  const padMat = new THREE.MeshStandardMaterial({ color: 0x3f6a34, roughness: 0.9 });
  const pads = new THREE.InstancedMesh(padGeo, padMat, 12);
  for (let i = 0; i < 12; i++) {
    dummy.position.set(px + (Math.random() - 0.5) * 18, 0.09, pz + (Math.random() - 0.5) * 13);
    dummy.rotation.set(-Math.PI / 2, 0, Math.random() * Math.PI);
    dummy.scale.setScalar(0.7 + Math.random() * 0.6);
    dummy.updateMatrix();
    pads.setMatrixAt(i, dummy.matrix);
  }
  pads.instanceMatrix.needsUpdate = true;
  ctx.group.add(pads);
}

// ── trees (trunk-only collision, canopy non-LOS) ───────────────────────────

function buildVillageTrees(ctx: ArenaBuildContext) {
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3420, roughness: 0.9, metalness: 0 });
  const leafMats = [
    new THREE.MeshStandardMaterial({ color: 0x3a6b2e, roughness: 0.95, metalness: 0 }),
    new THREE.MeshStandardMaterial({ color: 0x4a7a34, roughness: 0.95, metalness: 0 }),
    new THREE.MeshStandardMaterial({ color: 0x2e5a26, roughness: 0.95, metalness: 0 }),
  ];
  // Kept off the fire lanes, the square, the spawn aprons and the capture clearings.
  const spots: [number, number, number?][] = [
    [-74, 70], [-40, 66], [-56, 80], [-96, 50],
    [74, 70], [90, 36], [46, 78], [108, 78],
    [-76, -74], [-44, -70], [-90, -30], [-124, -34],
    [76, -74], [46, -76], [110, -40], [124, -34],
    [14, 60], [-60, -14, 0.9], [-134, 60], [134, -60],
  ];
  // Trunk + 3 canopy layers per tree, gathered into one InstancedMesh per leaf
  // tone (20 trees x 4 meshes -> 4 draws; census: −76 draws).
  const trunkGeo = new THREE.CylinderGeometry(0.42, 0.6, 3.8, 8);
  const canopyGeo = new THREE.SphereGeometry(1, 10, 8);
  const trunkMats: THREE.Matrix4[] = [];
  const leafBuckets: THREE.Matrix4[][] = [[], [], []];
  const dummy = new THREE.Object3D();
  for (const [x, z, s0] of spots) {
    const s = s0 ?? 1;
    dummy.position.set(x, 1.9 * s, z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.setScalar(s);
    dummy.updateMatrix();
    trunkMats.push(dummy.matrix.clone());
    const bucket = leafBuckets[Math.floor(Math.random() * leafBuckets.length)];
    for (const [cy, r] of [[4.6, 2.8], [5.6, 2.2], [6.4, 1.5]] as const) {
      dummy.position.set(x + (Math.random() - 0.5) * 0.8 * s, cy * s, z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(r * s);
      dummy.updateMatrix();
      bucket.push(dummy.matrix.clone());
    }
    // trunk-only collision, canopy non-LOS
    ctx.colliders.push(colliderFromCenter(x, z, 1.6 * s, 1.6 * s, 4.0 * s, 'block', {
      blocksSight: false,
    }));
  }
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, trunkMats.length);
  trunks.castShadow = true;
  trunks.receiveShadow = true;
  trunkMats.forEach((m, i) => trunks.setMatrixAt(i, m));
  trunks.instanceMatrix.needsUpdate = true;
  ctx.group.add(trunks);
  leafBuckets.forEach((bucket, i) => {
    if (bucket.length === 0) return;
    const inst = new THREE.InstancedMesh(canopyGeo, leafMats[i], bucket.length);
    inst.castShadow = true;
    inst.receiveShadow = true;
    bucket.forEach((m, k) => inst.setMatrixAt(k, m));
    inst.instanceMatrix.needsUpdate = true;
    ctx.group.add(inst);
  });
}

// ── scattered soft cover (hay, barrels) + medium solid blocks ──────────────

function buildVillageScattered(ctx: ArenaBuildContext) {
  const hayMat = new THREE.MeshStandardMaterial({
    map: hayBaleTexture(), roughness: 0.95, metalness: 0.0,
  });
  const hay = (x: number, z: number, w: number, d: number, h: number) => {
    ctx.addColliderBlock(x, z, w, d, h, true, () => {
      const g = new THREE.Group();
      g.add(ctx.box(w, h, d, hayMat));
      return g;
    }, 60);
  };
  // hay lines along the inner ring (linear soft cover, off the lanes)
  hay(28, -34, 5.0, 3.6, 2.8);
  hay(-30, 30, 4.6, 4.0, 2.6);
  hay(58, -54, 5.6, 4.2, 3.0);
  hay(-54, 58, 5.0, 4.2, 2.8);
  hay(36, 54, 4.4, 4.4, 2.7);
  hay(-38, -42, 4.6, 3.8, 2.9);
  hay(88, 16, 4.4, 4.4, 2.8);
  hay(-90, 8, 5.0, 4.0, 2.6);
  hay(16, 68, 4.6, 3.8, 2.7);
  hay(-16, -70, 4.6, 3.8, 2.7);
  hay(70, 30, 4.4, 4.0, 2.7);
  hay(-70, -34, 4.4, 4.0, 2.7);

  // oak barrels near the stalls / lanes (4 staves -> one InstancedMesh per cluster)
  const barrelMat = new THREE.MeshStandardMaterial({
    map: oakBarrelTexture(), roughness: 0.7, metalness: 0.15,
  });
  const barrelGeo = new THREE.CylinderGeometry(0.6, 0.6, 1.5, 10);
  const barrels = (x: number, z: number) => {
    ctx.addColliderBlock(x, z, 3.0, 3.0, 1.6, true, () => {
      const inst = new THREE.InstancedMesh(barrelGeo, barrelMat, 4);
      inst.castShadow = true;
      const dummy = new THREE.Object3D();
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        dummy.position.set(Math.cos(a) * 0.85, 0.75, Math.sin(a) * 0.85);
        dummy.updateMatrix();
        inst.setMatrixAt(i, dummy.matrix);
      }
      inst.instanceMatrix.needsUpdate = true;
      return inst;
    }, 50);
  };
  barrels(18, -20);
  barrels(-20, 20);
  barrels(64, -30);
  barrels(-60, 36);
  barrels(12, -62);
  barrels(-14, 64);
  barrels(72, 68);
  barrels(-70, -66);

  // medium solid wood piles (non-destructible cover on the lane approaches)
  const solid = plankMat('#6f5228');
  const pile = (x: number, z: number, w: number, d: number) =>
    ctx.addColliderBlock(x, z, w, d, 4.0, false, () => {
      const g = new THREE.Group();
      g.add(ctx.box(w, 4, d, solid));
      const cap = ctx.box(w * 1.08, 0.3, d * 1.08, plankMat('#8a6836'));
      cap.position.y = 4.05;
      g.add(cap);
      return g;
    }, 0, 'block');
  pile(24, 46, 10, 5);
  pile(-24, -48, 10, 5);
  pile(48, -22, 5, 10);
  pile(-48, 22, 5, 10);
}

// ── haystacks (soft conical cover in the fields) ───────────────────────────

function buildVillageHaystacks(ctx: ArenaBuildContext) {
  const spots: [number, number][] = [
    [86, -98], [-88, 98], [112, 40], [-112, -42], [120, -96], [-120, 96],
  ];
  const bodyMat = new THREE.MeshStandardMaterial({ map: thatchTexture('#c2a04e'), roughness: 0.95 });
  const capMat = new THREE.MeshStandardMaterial({ map: thatchTexture('#a8873c'), roughness: 0.95 });
  for (const [x, z] of spots) {
    ctx.addColliderBlock(x, z, 6.4, 6.4, 3.6, true, () => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.ConeGeometry(3.2, 3.6, 12), bodyMat);
      body.position.y = 1.8;
      body.castShadow = true;
      body.receiveShadow = true;
      g.add(body);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(3.35, 0.7, 12), capMat);
      cap.position.y = 3.5;
      cap.castShadow = true;
      g.add(cap);
      const pole = ctx.box(0.16, 4.6, 0.16, woodMat(0x3a2818));
      pole.position.y = 2.3;
      g.add(pole);
      return g;
    }, 55);
  }
}

// ── raised hay platform (ramp-approached vantage, NE) ─────────────────────

function buildVillageHayPlatform(ctx: ArenaBuildContext) {
  const px = 64, pz = 64;
  const deckH = 2.6;
  const wood = plankMat('#6f5228');
  const hayMat = new THREE.MeshStandardMaterial({
    map: hayBaleTexture(), roughness: 0.95, metalness: 0.0,
  });
  ctx.addColliderBlock(px, pz, 14, 14, deckH, false, () => {
    const g = new THREE.Group();
    g.add(ctx.box(14, deckH, 14, wood));
    for (const [hx, hz] of [[-3.5, -3.5], [3.5, -3.5], [-3.5, 3.5], [3.5, 3.5], [0, 0]] as const) {
      const bale = ctx.box(3.0, 1.6, 2.4, hayMat);
      bale.position.set(hx, deckH + 0.8, hz);
      g.add(bale);
    }
    return g;
  }, 0, 'block');
}

// ── village ramps (decorative wedges — never solid, never blocking) ───────

function buildVillageRamps(ctx: ArenaBuildContext) {
  const rampMat = new THREE.MeshStandardMaterial({
    color: 0x6a5028, roughness: 0.85, metalness: 0.06,
    map: plankTexture('#6a5028'),
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
  addRamp(52, 64, Math.PI / 2);
  addRamp(64, 52, 0);
  // field ramps on the outer flanks (clear of the spawn aprons + the diagonal
  // spawn points at ±70/±90)
  addRamp(110, 60, Math.PI * 0.75);
  addRamp(-110, 60, -Math.PI * 0.75);
  addRamp(110, -60, Math.PI * 0.25);
  addRamp(-110, -60, -Math.PI * 0.25);
}

// ── windmill (animated landmark on the NE outer) ─────────────────────────

function buildVillageWindmill(ctx: ArenaBuildContext) {
  const x = 118, z = 108;
  const baseMat = plasterMat('#cdbfa2');
  const capMat = thatchMat('#a8873c');
  ctx.addColliderBlock(x, z, 8, 8, 15, false, () => {
    const g = new THREE.Group();
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 4.6, 13, 10), baseMat);
    tower.position.y = 6.5;
    tower.castShadow = true;
    tower.receiveShadow = true;
    g.add(tower);
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(4.8, 5.0, 1.0, 10), stoneMat('#7f7a6c'));
    plinth.position.y = 0.5;
    g.add(plinth);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(3.8, 2.6, 10), capMat);
    cap.position.y = 14.2;
    cap.castShadow = true;
    g.add(cap);
    // rotor hub + 4 blades (анимируется)
    const rotor = new THREE.Group();
    rotor.position.set(0, 12.8, -3.9);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.9, 8), woodMat(0x4a3620));
    hub.rotation.x = Math.PI / 2;
    rotor.add(hub);
    const bladeMat = plankMat('#8a6836');
    for (let i = 0; i < 4; i++) {
      const blade = new THREE.Group();
      const spar = ctx.box(0.28, 6.4, 0.12, bladeMat);
      spar.position.y = 3.0;
      blade.add(spar);
      const sail = ctx.box(1.5, 4.6, 0.05, new THREE.MeshStandardMaterial({
        color: 0xe0d6c0, roughness: 0.9, metalness: 0.02, side: THREE.DoubleSide,
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
    const poleMat = plankMat('#6f5228', true);
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

// ── flowers (instanced blooms, inner ring dressing, non-LOS) ──────────────

function buildVillageFlowers(ctx: ArenaBuildContext) {
  const COUNT = 220;
  const headGeo = new THREE.SphereGeometry(0.14, 6, 5);
  const headMat = new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0 });
  const heads = new THREE.InstancedMesh(headGeo, headMat, COUNT);
  const stemGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.4, 4);
  stemGeo.translate(0, 0.2, 0);
  const stems = new THREE.InstancedMesh(stemGeo, new THREE.MeshStandardMaterial({ color: 0x4a6a2a, roughness: 0.95 }), COUNT);
  const dummy = new THREE.Object3D();
  const col = new THREE.Color();
  const palette = [0xe05a5a, 0xf0c24a, 0xf2e6d0, 0xa87ad0, 0xe08ab0];
  let placed = 0;
  let guard = 0;
  while (placed < COUNT && guard < COUNT * 40) {
    guard++;
    const x = (Math.random() - 0.5) * 250;
    const z = (Math.random() - 0.5) * 250;
    if (Math.abs(x) < 16 || Math.abs(z) < 16) continue;   // fire lanes
    if (Math.abs(x) < 32 && Math.abs(z) < 32) continue;   // square
    if (Math.abs(x) < 80 && Math.abs(z) > 82) continue;   // spawn aprons
    const dPond = Math.hypot(x + 48, z - 48);
    if (dPond < 16) continue;                              // pond
    dummy.position.set(x, 0.42, z);
    dummy.rotation.set(0, Math.random() * Math.PI, 0);
    dummy.scale.setScalar(0.8 + Math.random() * 0.7);
    dummy.updateMatrix();
    stems.setMatrixAt(placed, dummy.matrix);
    dummy.position.set(x, 0.62, z);
    dummy.updateMatrix();
    heads.setMatrixAt(placed, dummy.matrix);
    col.setHex(palette[placed % palette.length]);
    col.offsetHSL(0, 0, (Math.random() - 0.5) * 0.08);
    heads.setColorAt(placed, col);
    placed++;
  }
  heads.count = placed;
  stems.count = placed;
  if (heads.instanceMatrix) heads.instanceMatrix.needsUpdate = true;
  if (stems.instanceMatrix) stems.instanceMatrix.needsUpdate = true;
  if (heads.instanceColor) heads.instanceColor.needsUpdate = true;
  ctx.group.add(stems);
  ctx.group.add(heads);
}

// ── fireflies / pollen in dusk light (non-LOS, atmosphere) ────────────────

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

// ── foliage: instanced grass/wheat tufts (non-LOS, производительно) ──────

function buildVillageFoliage(ctx: ArenaBuildContext) {
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
  while (placed < COUNT && guard < COUNT * 30) {
    guard++;
    const x = (Math.random() - 0.5) * 280;
    const z = (Math.random() - 0.5) * 280;
    if (Math.abs(x) < 15 || Math.abs(z) < 15) continue;   // fire lanes
    if (Math.abs(x) < 32 && Math.abs(z) < 32) continue;   // square
    if (Math.abs(x) < 80 && Math.abs(z) > 82) continue;   // spawn aprons
    if (Math.hypot(x + 48, z - 48) < 15) continue;        // pond
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
    map: duskGlowTexture(),
    transparent: true,
    opacity: 0.035,
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
