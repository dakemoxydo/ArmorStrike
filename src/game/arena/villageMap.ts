// ===== Карта Village: деревня с домами, амбарами, заборами =====
import * as THREE from 'three';
import { ARENA } from '../constants';
import { barrelTexture, crateTexture, hexTexture } from '../textures';
import type { ArenaBuildContext } from './context';
import { buildRamps } from './ramps';

/** Village-themed interior: houses, barn, fences, hay, well. */
export function buildVillageContent(ctx: ArenaBuildContext) {
  buildVillageSkyline(ctx);
  buildVillageSquare(ctx);
  buildVillageHouses(ctx);
  buildVillageBarns(ctx);
  buildVillageFences(ctx);
  buildVillageTrees(ctx);
  buildVillageScattered(ctx);
  buildRamps(ctx);
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

function buildVillageSkyline(ctx: ArenaBuildContext) {
  const dark = new THREE.MeshStandardMaterial({
    color: 0x1a1810, roughness: 1, emissive: 0x1a1408, emissiveIntensity: 0.25,
  });
  const warm = new THREE.MeshBasicMaterial({ color: 0xffc266 });
  for (let i = 0; i < 18; i++) {
    const ang = (i / 18) * Math.PI * 2 + (Math.random() - 0.5) * 0.08;
    const r = 108 + Math.random() * 40;
    const w = 8 + Math.random() * 14;
    const h = 5 + Math.random() * 10;
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, w * 0.7), dark);
    m.position.set(Math.cos(ang) * r, h / 2 - 0.4, Math.sin(ang) * r);
    m.rotation.y = Math.random() * Math.PI;
    ctx.group.add(m);
    if (Math.random() > 0.35) {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.35, h * 0.18), warm);
      win.position.set(m.position.x, h * 0.45, m.position.z);
      win.lookAt(0, win.position.y, 0);
      ctx.group.add(win);
    }
  }
}

function house(
  ctx: ArenaBuildContext,
  x: number, z: number,
  w: number, d: number, h: number,
  yaw = 0,
) {
  const plasters = [0xb8aa90, 0xc4b8a0, 0xa89880, 0xc8bca8];
  const roofs = [0x6b3030, 0x4a5a38, 0x5a4030];
  const body = plasterMat(plasters[Math.floor(Math.random() * plasters.length)]);
  const roof = roofMat(roofs[Math.floor(Math.random() * roofs.length)]);
  ctx.addColliderBlock(x, z, w, d, h + 1.2, false, () => {
    const g = new THREE.Group();
    const base = ctx.box(w, h, d, body);
    base.rotation.y = yaw;
    g.add(base);
    // pitched roof (box ridge)
    const roofMesh = new THREE.Mesh(new THREE.BoxGeometry(w * 1.08, 1.4, d * 1.08), roof);
    roofMesh.position.y = h + 0.5;
    roofMesh.rotation.y = yaw;
    roofMesh.castShadow = true;
    g.add(roofMesh);
    // door glow
    const door = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 2.2, 0.15),
      new THREE.MeshBasicMaterial({ color: 0x3a2818 }),
    );
    door.position.set(0, 1.1, d / 2 + 0.05);
    door.rotation.y = yaw;
    g.add(door);
    // window lights
    const winMat = new THREE.MeshBasicMaterial({ color: 0xffd080 });
    for (const wx of [-w * 0.28, w * 0.28]) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.0, 0.12), winMat);
      win.position.set(wx, h * 0.55, d / 2 + 0.04);
      g.add(win);
    }
    return g;
  }, 0, 'wall');
}

function buildVillageSquare(ctx: ArenaBuildContext) {
  // well at center
  ctx.addColliderBlock(0, 0, 4.5, 4.5, 2.2, false, () => {
    const g = new THREE.Group();
    const stone = new THREE.MeshStandardMaterial({ color: 0x6a6a62, roughness: 0.9, metalness: 0.05 });
    g.add(ctx.box(4.2, 1.6, 4.2, stone));
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 0.4, 12), stone);
    rim.position.y = 1.8;
    g.add(rim);
    const postMat = woodMat(0x5a4020);
    for (const sx of [-1.4, 1.4]) {
      const post = ctx.box(0.35, 3.2, 0.35, postMat);
      post.position.set(sx, 1.6, 0);
      g.add(post);
    }
    const beam = ctx.box(3.2, 0.3, 0.3, postMat);
    beam.position.y = 3.3;
    g.add(beam);
    return g;
  }, 0, 'wall');

  // market stalls (destructible)
  const stall = (x: number, z: number, yaw: number) => {
    const canvas = new THREE.MeshStandardMaterial({ color: 0xc45a3a, roughness: 0.7, metalness: 0.05 });
    const wood = woodMat();
    ctx.addColliderBlock(x, z, 5, 3.2, 2.8, true, () => {
      const g = new THREE.Group();
      const table = ctx.box(4.6, 0.9, 2.6, wood);
      table.rotation.y = yaw;
      g.add(table);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(5, 0.15, 3.4), canvas);
      roof.position.y = 2.6;
      roof.rotation.y = yaw;
      roof.rotation.x = -0.15;
      g.add(roof);
      for (const sx of [-2, 2]) {
        const leg = ctx.box(0.25, 2.5, 0.25, wood);
        leg.position.set(sx, 1.25, 0);
        g.add(leg);
      }
      return g;
    }, 70);
  };
  stall(10, 8, 0.2);
  stall(-11, 7, -0.15);
  stall(9, -10, 0.4);
  stall(-10, -9, -0.3);
}

function buildVillageHouses(ctx: ArenaBuildContext) {
  // north row
  house(ctx, -28, -42, 10, 8, 4.5, 0.05);
  house(ctx, -10, -48, 9, 7, 4.2, -0.1);
  house(ctx, 12, -45, 11, 8, 5.0, 0.08);
  house(ctx, 36, -40, 9, 9, 4.0, -0.05);
  // south
  house(ctx, -32, 42, 10, 8, 4.8, 0.1);
  house(ctx, -8, 48, 8, 7, 4.0, -0.08);
  house(ctx, 18, 44, 12, 9, 5.2, 0.04);
  house(ctx, 42, 38, 9, 8, 4.3, -0.12);
  // east / west
  house(ctx, 48, -12, 9, 10, 4.6, Math.PI / 2);
  house(ctx, 50, 14, 8, 9, 4.2, Math.PI / 2 + 0.08);
  house(ctx, -50, -8, 9, 10, 4.5, Math.PI / 2);
  house(ctx, -48, 18, 8, 9, 4.0, Math.PI / 2 - 0.1);
}

function buildVillageBarns(ctx: ArenaBuildContext) {
  const barn = (x: number, z: number, w: number, d: number, h: number) => {
    const body = woodMat(0x7a5a28);
    const roof = roofMat(0x4a3830);
    ctx.addColliderBlock(x, z, w, d, h, false, () => {
      const g = new THREE.Group();
      g.add(ctx.box(w, h, d, body));
      const r = new THREE.Mesh(new THREE.BoxGeometry(w * 1.1, 1.6, d * 1.1), roof);
      r.position.y = h + 0.6;
      r.castShadow = true;
      g.add(r);
      const door = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.45, h * 0.7, 0.2),
        new THREE.MeshStandardMaterial({ color: 0x3a2810, roughness: 0.9 }),
      );
      door.position.set(0, h * 0.35, d / 2 + 0.05);
      g.add(door);
      return g;
    }, 0, 'wall');
  };
  barn(-42, -22, 14, 10, 6.5);
  barn(40, 22, 12, 11, 6.0);
  barn(-38, 28, 11, 9, 5.5);
}

function buildVillageFences(ctx: ArenaBuildContext) {
  const postMat = woodMat(0x5c4020);
  const railMat = woodMat(0x6a4a28);
  const segment = (x: number, z: number, len: number, yaw: number) => {
    const w = Math.abs(Math.cos(yaw)) * len + Math.abs(Math.sin(yaw)) * 0.4;
    const d = Math.abs(Math.sin(yaw)) * len + Math.abs(Math.cos(yaw)) * 0.4;
    ctx.addColliderBlock(x, z, Math.max(w, 0.8), Math.max(d, 0.8), 1.4, true, () => {
      const g = new THREE.Group();
      const posts = 4;
      for (let i = 0; i < posts; i++) {
        const t = (i / (posts - 1) - 0.5) * len;
        const post = ctx.box(0.28, 1.35, 0.28, postMat);
        post.position.set(Math.cos(yaw) * t, 0.67, Math.sin(yaw) * t);
        g.add(post);
      }
      for (const hy of [0.45, 1.0]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.12, 0.12), railMat);
        rail.position.y = hy;
        rail.rotation.y = yaw;
        g.add(rail);
      }
      return g;
    }, 45);
  };
  // paddock near barns
  segment(-42, -12, 14, 0);
  segment(-35, -22, 12, Math.PI / 2);
  segment(40, 12, 14, 0);
  segment(34, 22, 12, Math.PI / 2);
  segment(0, 22, 16, 0);
  segment(0, -24, 16, 0);
  segment(22, 0, 14, Math.PI / 2);
  segment(-24, 0, 14, Math.PI / 2);
}

function buildVillageTrees(ctx: ArenaBuildContext) {
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3420, roughness: 0.9, metalness: 0 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x3a6b2e, roughness: 0.95, metalness: 0 });
  const tree = (x: number, z: number, scale = 1) => {
    // trunk only collides (small footprint)
    ctx.addColliderBlock(x, z, 1.4 * scale, 1.4 * scale, 3.5 * scale, false, () => {
      const g = new THREE.Group();
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35 * scale, 0.5 * scale, 3.2 * scale, 8),
        trunkMat,
      );
      trunk.position.y = 1.6 * scale;
      trunk.castShadow = true;
      g.add(trunk);
      const canopy = new THREE.Mesh(
        new THREE.SphereGeometry(2.2 * scale, 10, 8),
        leafMat,
      );
      canopy.position.y = 4.2 * scale;
      canopy.castShadow = true;
      g.add(canopy);
      return g;
    }, 0, 'block', false);
  };
  const spots: [number, number, number?][] = [
    [-20, -30], [22, -32], [-18, 32], [24, 30],
    [-55, 0], [55, -5], [-15, -60], [15, 58],
    [50, 50], [-48, -50], [0, 55], [0, -58],
    [32, -18, 1.15], [-34, 12, 0.9], [8, 20, 0.85],
  ];
  for (const [x, z, s] of spots) tree(x, z, s ?? 1);
}

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
  hay(14, -18, 3.5, 2.5, 2.0);
  hay(-16, 16, 3.2, 2.8, 1.8);
  hay(30, -28, 4, 3, 2.2);
  hay(-28, 30, 3.5, 3, 2.0);
  hay(18, 28, 3, 3, 1.9);
  hay(-20, -22, 3.2, 2.6, 2.1);
  hay(45, 0, 3, 3, 2.0);
  hay(-46, 5, 3.4, 2.8, 1.8);

  // barrels near stalls
  const bcolors = ['#8a4a28', '#5a6a2a', '#6a4020'];
  let bi = 0;
  const barrels = (x: number, z: number) => {
    const col = bcolors[(bi++) % bcolors.length];
    const mat = new THREE.MeshStandardMaterial({
      map: barrelTexture(col), roughness: 0.6, metalness: 0.25,
    });
    ctx.addColliderBlock(x, z, 2.4, 2.4, 1.25, true, () => {
      const g = new THREE.Group();
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        const b = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.2, 10), mat);
        b.position.set(Math.cos(a) * 0.7, 0.6, Math.sin(a) * 0.7);
        b.castShadow = true;
        g.add(b);
      }
      return g;
    }, 50);
  };
  barrels(12, 12);
  barrels(-14, -12);
  barrels(36, -20);
  barrels(-34, 22);
  barrels(6, -36);
  barrels(-8, 38);

  // solid cover blocks
  const solid = woodMat(0x6a5030);
  ctx.addColliderBlock(0, 26, 6, 3, 3.0, false, () => ctx.box(6, 3, 3, solid.clone()), 0, 'block');
  ctx.addColliderBlock(0, -28, 6, 3, 3.0, false, () => ctx.box(6, 3, 3, solid.clone()), 0, 'block');
  ctx.addColliderBlock(30, 12, 3, 6, 3.0, false, () => ctx.box(3, 3, 6, solid.clone()), 0, 'block');
  ctx.addColliderBlock(-32, -12, 3, 6, 3.0, false, () => ctx.box(3, 3, 6, solid.clone()), 0, 'block');
}

function buildVillageAtmosphere(ctx: ArenaBuildContext) {
  const domeGeo = new THREE.CylinderGeometry(ctx.half + 6, ctx.half + 6, 48, 48, 1, true);
  const domeMat = new THREE.MeshBasicMaterial({
    map: hexTexture(),
    transparent: true,
    opacity: 0.03,
    side: THREE.BackSide,
    depthWrite: false,
    color: 0xc8a24a,
    blending: THREE.AdditiveBlending,
  });
  const dome = new THREE.Mesh(domeGeo, domeMat);
  dome.position.y = 20;
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
    color: 0xd4c090,
    size: 0.18,
    transparent: true,
    opacity: 0.4,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const dust = new THREE.Points(geo, mat);
  ctx.group.add(dust);
  ctx.setDust(dust);
}
