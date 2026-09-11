// ===== Карта Factory: литейный комплекс «ЗАВОД-51» (вся арена 300×300) =====
// Arena half = 150 (ARENA.size 300). Layout graph:
//   N–S main lane  : x ∈ [−13, 13]           primary fire lane (hard cover forbidden)
//   E–W main lane  : z ∈ [−13, 13]           primary fire lane
//   Centre plaza   : |x|,|z| < 30 clear; hard cover forbidden inside |x|,|z| < 34
//   Ring road      : |x|,|z| ∈ [34, 46]      secondary circulation (soft cover only)
//   Outer corridor : |x| or |z| ≈ 96–140     spawn-adjacent ring, pads on the diagonals
//   Spawn aprons   : |x| ≤ 78 with z ∈ [±84, ±130]; corners ±128; edge points  (keep clear)
//   Districts      : NW foundry · NE container terminal · SW assembly/pipe · SE power/tank farm
//   Centre         : gantry crane portal + holo beacon (CP-B lives underneath)
// Cover hierarchy: hard (halls/furnace/tanks/containers/legs) · medium (solid blocks, transformers)
//                  · soft (destructible crates/barrels/containers) · non-LOS (lamps, pipes, ramps)
import * as THREE from 'three';
import { ARENA } from '../constants';
import { colliderFromCenter } from '../engine/physics';
import { barrelTexture, containerTexture, crateTexture, hexTexture, structureTexture } from '../textures';
import type { ArenaBuildContext } from './context';
import { buildSkyline } from './skyline';

const AMBER = 0xffb02e;
const HAZARD_ORANGE = 0xff8a1a;
const HOLO = 0x2ee6c0;

/** Factory-themed interior: foundry, container terminal, assembly halls, tank farm. */
export function buildFactoryContent(ctx: ArenaBuildContext) {
  buildSkyline(ctx);
  buildFoundryDistrict(ctx);
  buildContainerTerminal(ctx);
  buildAssemblyDistrict(ctx);
  buildPowerDistrict(ctx);
  buildCentralCrane(ctx);
  buildOuterRing(ctx);
  buildFactoryRamps(ctx);
  buildFactoryAtmosphere(ctx);
}

// ── materials ──────────────────────────────────────────────────────────────

function steel(color = 0x8e9aab) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.55 });
}

/** Structural plate with the shared industrial panel texture. */
function plate(color = 0xb9c6d6, roughness = 0.55, metalness = 0.5) {
  return new THREE.MeshStandardMaterial({ map: structureTexture(), color, roughness, metalness });
}

function concrete(color = 0x6f7783) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0.2 });
}

function rust(color = 0x6b4a32) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.25 });
}

function paint(color: number) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.45 });
}

function hazard() {
  return new THREE.MeshBasicMaterial({ color: AMBER, transparent: true, opacity: 0.55 });
}

/** Roof vent that spins — registers its rotor on `animNodes`. */
function ventFan(ctx: ArenaBuildContext, rotor: THREE.Group, speed: number) {
  ctx.animNodes.push((dt) => { rotor.rotation.y += dt * speed; });
}

// ── primitives ─────────────────────────────────────────────────────────────

/** Triangular-prism gable roof (ridge along X). */
function prismRoof(w: number, d: number, peak: number, mat: THREE.Material): THREE.Mesh {
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

interface HallOpts {
  yaw?: number;
  roof?: 'gable' | 'flat';
  door?: number;
  /** Roof vent fans (spin via animNodes). */
  fans?: number;
  /** Chimneys that feed the smoke pool. */
  stacks?: number;
  /** Warm window strip count on the long facades. */
  windows?: number;
}

/**
 * Workshop / production hall — the factory's hard-cover building block.
 * Collider is an AABB padded for yaw, so rotated halls still block correctly.
 */
function hall(
  ctx: ArenaBuildContext,
  x: number, z: number,
  w: number, d: number, h: number,
  opts: HallOpts = {},
) {
  const { yaw = 0, roof = 'gable', door = 1, fans = 0, stacks = 0, windows = 0 } = opts;
  const body = plate(0x9aa8b8, 0.6, 0.45);
  const trim = paint(0x2f3a48);
  const c = Math.abs(Math.cos(yaw));
  const s = Math.abs(Math.sin(yaw));
  const cw = w * c + d * s;
  const cd = w * s + d * c;

  ctx.addColliderBlock(x, z, cw, cd, h + (roof === 'gable' ? 2.4 : 0), false, () => {
    const g = new THREE.Group();
    const base = ctx.box(w, h, d, body);
    base.rotation.y = yaw;
    g.add(base);

    // plinth — grounds the building
    const plinth = ctx.box(w * 1.02, 0.5, d * 1.02, concrete(0x4d545e));
    plinth.position.y = 0.25;
    plinth.rotation.y = yaw;
    g.add(plinth);

    // wrap for facade details so a single yaw rotates them all
    const facade = new THREE.Group();
    facade.rotation.y = yaw;

    // horizontal cornice bands
    for (const by of [h * 0.42, h * 0.88]) {
      const band = ctx.box(w * 1.01, 0.28, d * 1.01, trim);
      band.position.y = by;
      facade.add(band);
    }
    // lit clerestory windows (factory look: a long high strip)
    for (let i = 0; i < windows; i++) {
      const wx = (i / Math.max(1, windows - 1) - 0.5) * w * 0.78;
      const lit = new THREE.Mesh(
        new THREE.BoxGeometry(Math.max(1.6, (w * 0.78) / windows - 0.8), 1.5, 0.22),
        new THREE.MeshBasicMaterial({ color: 0xffc37a }),
      );
      lit.position.set(windows === 1 ? 0 : wx, h * 0.68, d / 2 + 0.06);
      facade.add(lit);
      const litB = lit.clone();
      litB.position.z = -d / 2 - 0.06;
      facade.add(litB);
    }
    // roll-up doors with hazard frames
    for (let i = 0; i < door; i++) {
      const dx = door === 1 ? 0 : (i - (door - 1) / 2) * (w * 0.44);
      const frame = ctx.box(6.0, 4.8, 0.2, trim);
      frame.position.set(dx, 2.4, d / 2 + 0.04);
      facade.add(frame);
      const shutter = new THREE.Mesh(
        new THREE.BoxGeometry(5.2, 4.2, 0.14),
        new THREE.MeshStandardMaterial({ color: 0x6d7683, roughness: 0.5, metalness: 0.6 }),
      );
      shutter.position.set(dx, 2.2, d / 2 + 0.12);
      facade.add(shutter);
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.22, 0.16), hazard());
      stripe.position.set(dx, 4.5, d / 2 + 0.16);
      facade.add(stripe);
    }
    g.add(facade);

    if (roof === 'gable') {
      const r = prismRoof(w * 1.12, d * 1.12, 2.4, plate(0x76828f, 0.6, 0.4));
      r.position.y = h;
      r.rotation.y = yaw;
      g.add(r);
      // ridge vent
      const ridge = ctx.box(w * 0.86, 0.6, 0.9, trim);
      ridge.position.y = h + 2.5;
      ridge.rotation.y = yaw;
      g.add(ridge);
    } else {
      const cap = ctx.box(w * 1.03, 0.35, d * 1.03, concrete(0x5a626d));
      cap.position.y = h + 0.15;
      cap.rotation.y = yaw;
      g.add(cap);
    }

    // roof vent fans
    for (let i = 0; i < fans; i++) {
      const fx = (i - (fans - 1) / 2) * (w * 0.32);
      const shroud = new THREE.Mesh(
        new THREE.CylinderGeometry(1.25, 1.4, 1.1, 12),
        steel(0x39424e),
      );
      shroud.position.set(fx, h + (roof === 'gable' ? 2.1 : 0.7), 0);
      shroud.castShadow = true;
      g.add(shroud);
      const rotor = new THREE.Group();
      rotor.position.copy(shroud.position);
      rotor.position.y += 0.35;
      for (let b = 0; b < 3; b++) {
        const blade = ctx.box(2.0, 0.1, 0.42, paint(0x8f9aa6));
        blade.position.x = 0.5;
        const arm = new THREE.Group();
        arm.rotation.y = (b / 3) * Math.PI * 2;
        arm.add(blade);
        rotor.add(arm);
      }
      g.add(rotor);
      ventFan(ctx, rotor, 2.6 + i * 0.4);
    }

    // chimneys
    for (let i = 0; i < stacks; i++) {
      const sx = (i - (stacks - 1) / 2) * (w * 0.34);
      const sz = -d * 0.22;
      const ch = new THREE.Mesh(
        new THREE.CylinderGeometry(0.85, 1.05, h * 0.55 + 3.4, 10),
        steel(0x5b636e),
      );
      ch.position.set(sx, h + (h * 0.55 + 3.4) / 2 - 0.6, sz);
      ch.castShadow = true;
      g.add(ch);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 0.85, 0.5, 10), paint(0x39424e));
      cap.position.set(sx, h + h * 0.55 + 3.0, sz);
      g.add(cap);
      ctx.smokeEmitters.push(new THREE.Vector3(x + sx, h + h * 0.55 + 3.6, z + sz));
    }
    return g;
  }, 0, 'wall');
}

// ── NW: foundry (литейный цех) ─────────────────────────────────────────────

function glowMaterial(ctx: ArenaBuildContext) {
  const m = new THREE.MeshStandardMaterial({
    color: 0x2a1410, roughness: 0.6, metalness: 0.3,
    emissive: 0xff5a10, emissiveIntensity: 0.9,
  });
  ctx.furnaceGlowMats.push(m);
  return m;
}

/** Molten channel on the floor — additive plane, opacity animated by ArenaEffects. */
function moltenPlane(ctx: ArenaBuildContext, w: number, d: number, x: number, z: number) {
  const m = new THREE.MeshBasicMaterial({
    color: 0xff6a10, transparent: true, opacity: 0.55,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  ctx.moltenMats.push(m);
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d), m);
  p.rotation.x = -Math.PI / 2;
  p.position.set(x, 0.05, z);
  ctx.group.add(p);
}

function blastFurnace(ctx: ArenaBuildContext, x: number, z: number) {
  ctx.addColliderBlock(x, z, 16, 16, 16, false, () => {
    const g = new THREE.Group();
    // hearth
    const hearth = new THREE.Mesh(new THREE.CylinderGeometry(5.6, 6.2, 3.2, 18), concrete(0x4a5058));
    hearth.position.y = 1.6;
    hearth.castShadow = true;
    hearth.receiveShadow = true;
    g.add(hearth);
    // shaft (bosh)
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 5.6, 8.6, 18), steel(0x6d5240));
    shaft.position.y = 7.4;
    shaft.castShadow = true;
    shaft.receiveShadow = true;
    g.add(shaft);
    for (const ry of [4.2, 6.4, 8.8] as const) {
      const band = new THREE.Mesh(new THREE.TorusGeometry(4.9, 0.24, 6, 22), paint(0x39424e));
      band.rotation.x = Math.PI / 2;
      band.position.y = ry;
      g.add(band);
    }
    // top cone + charging bell
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 4.2, 3.4, 18), steel(0x555f6a));
    cone.position.y = 13.6;
    cone.castShadow = true;
    g.add(cone);
    const bell = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 2.3, 1.5, 14), paint(0x3f4854));
    bell.position.y = 16.0;
    g.add(bell);
    // tapping holes — glow
    for (const a of [-0.55, 0.35] as const) {
      const grille = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.4, 0.3), glowMaterial(ctx));
      grille.position.set(Math.sin(a) * 5.9, 1.9, Math.cos(a) * 5.9);
      grille.rotation.y = a;
      g.add(grille);
    }
    // cowper stoves (4) around the shaft
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.4;
      const stove = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.5, 10, 12), steel(0x5f6a76));
      stove.position.set(Math.sin(a) * 6.2, 5, Math.cos(a) * 6.2);
      stove.castShadow = true;
      g.add(stove);
      const stoveCap = new THREE.Mesh(new THREE.SphereGeometry(1.3, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), steel(0x6f7a86));
      stoveCap.position.set(Math.sin(a) * 6.2, 10, Math.cos(a) * 6.2);
      g.add(stoveCap);
    }
    // beacon on the bell
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.34, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xff3326, transparent: true, opacity: 0.9 }));
    beacon.position.y = 17.1;
    g.add(beacon);
    ctx.beaconMats.push(beacon.material as THREE.MeshBasicMaterial);
    ctx.smokeEmitters.push(new THREE.Vector3(x, 17.4, z));
    return g;
  }, 0, 'wall');

  // molten runners away from the furnace
  moltenPlane(ctx, 1.5, 9, x, z - 11);
  moltenPlane(ctx, 8.5, 1.3, x - 3.6, z - 15);
  // warm light
  const l1 = new THREE.PointLight(0xff6a15, 340, 40, 1.9);
  l1.position.set(x, 6, z + 3);
  ctx.group.add(l1);
  const l2 = new THREE.PointLight(0xff8a30, 170, 26, 1.9);
  l2.position.set(x - 4, 3.5, z - 13);
  ctx.group.add(l2);

  // sparks rising from the tap hole
  const N = 44;
  const pos = new Float32Array(N * 3);
  const seed = new Float32Array(N * 2);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = x + (Math.random() - 0.5) * 7;
    pos[i * 3 + 1] = 1 + Math.random() * 8;
    pos[i * 3 + 2] = z + (Math.random() - 0.5) * 7;
    seed[i * 2] = 0.6 + Math.random() * 1.4;
    seed[i * 2 + 1] = Math.random() * 8;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xffb060, size: 0.3, transparent: true, opacity: 0.8,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const pts = new THREE.Points(geo, mat);
  ctx.group.add(pts);
  const attr = geo.attributes.position as THREE.BufferAttribute;
  ctx.animNodes.push((dt, elapsed) => {
    for (let i = 0; i < N; i++) {
      const rise = seed[i * 2];
      const off = seed[i * 2 + 1];
      let y = attr.getY(i) + dt * rise;
      if (y > 9.5) y = 1;
      attr.setY(i, y);
      attr.setX(i, x + Math.sin(elapsed * 0.9 + off) * 1.6);
      attr.setZ(i, z + Math.cos(elapsed * 0.7 + off) * 1.6);
    }
    attr.needsUpdate = true;
    mat.opacity = 0.55 + Math.sin(elapsed * 4.2) * 0.25;
  });
}

function ladleHouse(ctx: ArenaBuildContext, x: number, z: number) {
  // pouring ladle — medium hard cover with a molten lip
  ctx.addColliderBlock(x, z, 5.5, 5.5, 5, false, () => {
    const g = new THREE.Group();
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 1.7, 4.2, 14), steel(0x5a6068));
    pot.position.y = 2.1;
    pot.castShadow = true;
    pot.receiveShadow = true;
    g.add(pot);
    const melt = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.0, 0.3, 14), glowMaterial(ctx));
    melt.position.y = 4.3;
    g.add(melt);
    const arm = ctx.box(5.4, 0.45, 0.45, paint(0x8a5a12));
    arm.position.y = 5.0;
    g.add(arm);
    return g;
  }, 0, 'wall');
  moltenPlane(ctx, 4.2, 1.1, x + 2.8, z);
}

/** Elevated ore conveyor with moving charge — animated via animNodes. */
function conveyor(ctx: ArenaBuildContext, x0: number, x1: number, z: number, y: number) {
  const len = Math.abs(x1 - x0);
  const belt = ctx.box(len, 0.45, 2.8, paint(0x2f3a48), y);
  belt.receiveShadow = true;
  ctx.group.add(belt);
  // side skirts
  for (const s of [-1.5, 1.5]) {
    const skirt = ctx.box(len, 0.5, 0.16, paint(0x39424e), y + 0.35);
    skirt.position.z = z + s;
    ctx.group.add(skirt);
  }
  // gantry supports (instanced posts)
  const postCount = Math.max(3, Math.round(len / 11));
  const postGeo = new THREE.BoxGeometry(1.5, y, 1.5);
  const inst = new THREE.InstancedMesh(postGeo, steel(0x6b7480), postCount);
  inst.castShadow = true;
  const dummy = new THREE.Object3D();
  for (let i = 0; i < postCount; i++) {
    const t = postCount === 1 ? 0.5 : i / (postCount - 1);
    dummy.position.set(x0 + (x1 - x0) * t, y / 2, z);
    dummy.updateMatrix();
    inst.setMatrixAt(i, dummy.matrix);
  }
  inst.instanceMatrix.needsUpdate = true;
  ctx.group.add(inst);
  ctx.colliders.push(colliderFromCenter(x0, z, 2.2, 2.2, y, 'block', { blocksSight: false }));
  ctx.colliders.push(colliderFromCenter(x1, z, 2.2, 2.2, y, 'block', { blocksSight: false }));

  // moving ore charge
  const CHUNKS = 14;
  const chunkGeo = new THREE.BoxGeometry(1.5, 0.7, 1.8);
  const chunks = new THREE.InstancedMesh(chunkGeo, rust(0x5a4030), CHUNKS);
  chunks.castShadow = true;
  ctx.group.add(chunks);
  const dir = Math.sign(x1 - x0) || 1;
  ctx.animNodes.push((_dt, elapsed) => {
    for (let i = 0; i < CHUNKS; i++) {
      const t = ((i / CHUNKS) + elapsed * 0.06) % 1;
      const px = x0 + dir * len * t;
      dummy.position.set(px, y + 0.6, z + Math.sin(t * 12 + i) * 0.35);
      dummy.rotation.set(0, t * 3 + i, 0);
      dummy.updateMatrix();
      chunks.setMatrixAt(i, dummy.matrix);
    }
    chunks.instanceMatrix.needsUpdate = true;
  });
}

function buildFoundryDistrict(ctx: ArenaBuildContext) {
  blastFurnace(ctx, -62, 62);
  // smaller second furnace
  ctx.addColliderBlock(-44, 66, 10, 10, 9, false, () => {
    const g = new THREE.Group();
    g.add(ctx.box(9, 7, 9, plate(0x8a7a68, 0.65, 0.4)));
    const stack = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.6, 6, 12), steel(0x5b636e));
    stack.position.y = 9.6;
    stack.castShadow = true;
    g.add(stack);
    const grille = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.0, 0.3), glowMaterial(ctx));
    grille.position.set(0, 2.2, 4.7);
    g.add(grille);
    ctx.smokeEmitters.push(new THREE.Vector3(-44, 12.6, 66));
    return g;
  }, 0, 'wall');

  ladleHouse(ctx, -62, 44);
  // casting hall + ore conveyor feeding the furnace
  hall(ctx, -96, 40, 30, 18, 9.5, { roof: 'gable', door: 2, windows: 4, fans: 2, stacks: 2 });
  conveyor(ctx, -94, -68, 52, 6.4);
  // slag heap (low soft cover)
  crateStack(ctx, -78, 54, 6, 5, 2.0, 70);
}

// ── NE: container terminal ─────────────────────────────────────────────────

function containerRow(
  ctx: ArenaBuildContext,
  x: number, z0: number, count: number, step: number,
  destructible: boolean,
  defs: { c: string; d: string; label: string }[],
) {
  for (let i = 0; i < count; i++) {
    const z = z0 + i * step;
    const def = defs[i % defs.length];
    const mat = new THREE.MeshStandardMaterial({
      map: containerTexture(def.c, def.label, def.d), roughness: 0.5, metalness: 0.55,
    });
    if (destructible) {
      const edge = hazard();
      ctx.addColliderBlock(x, z, 4.4, 11.4, 3.2, true, () => {
        const g = new THREE.Group();
        g.add(ctx.box(4.4, 3.2, 11.4, mat));
        const e = new THREE.Mesh(new THREE.BoxGeometry(4.45, 0.1, 11.45), edge);
        e.position.y = 3.16;
        g.add(e);
        return g;
      }, 130, 'block');
    } else {
      ctx.addColliderBlock(x, z, 4.4, 11.4, 3.2, false,
        () => ctx.box(4.4, 3.2, 11.4, mat), 0, 'block');
    }
  }
}

function containerStack(ctx: ArenaBuildContext, x: number, z: number, def: { c: string; d: string; label: string }) {
  const mat = new THREE.MeshStandardMaterial({
    map: containerTexture(def.c, def.label, def.d), roughness: 0.5, metalness: 0.55,
  });
  ctx.addColliderBlock(x, z, 11.4, 4.6, 6.4, false, () => {
    const g = new THREE.Group();
    const low = ctx.box(11.4, 3.2, 4.5, mat);
    low.position.y = 1.6;
    g.add(low);
    const up = ctx.box(11.4, 3.2, 4.5, mat);
    up.position.y = 4.8;
    up.rotation.y = 0.07;
    g.add(up);
    return g;
  }, 0, 'block');
}

function siloCluster(ctx: ArenaBuildContext, x: number, z: number) {
  const siloMat = steel(0x49606e, );
  const silos: [number, number][] = [[x, z], [x + 9, z + 9], [x - 2, z + 12]];
  for (const [sx, sz] of silos) {
    ctx.addColliderBlock(sx, sz, 7, 7, 12, false, () => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(3.0, 3.2, 11.5, 16), siloMat);
      body.position.y = 5.75;
      body.castShadow = true;
      body.receiveShadow = true;
      g.add(body);
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(3.0, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), siloMat);
      dome.position.y = 11.5;
      dome.castShadow = true;
      g.add(dome);
      const stripe = new THREE.Mesh(new THREE.CylinderGeometry(3.12, 3.12, 0.6, 16),
        new THREE.MeshBasicMaterial({ color: AMBER }));
      stripe.position.y = 7.6;
      g.add(stripe);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0x35d5ff, transparent: true, opacity: 0.85 }));
      lamp.position.y = 14.1;
      g.add(lamp);
      ctx.beaconMats.push(lamp.material as THREE.MeshBasicMaterial);
      return g;
    }, 0, 'wall');
  }
  // connecting pipes at ground level (shots fly over)
  ctx.addColliderBlock(x + 3.5, z + 6, 12, 1.8, 1.4, false,
    () => ctx.box(12, 1.4, 1.8, steel(0x49606e)), 0, 'block', false);
}

function buildContainerTerminal(ctx: ArenaBuildContext) {
  const defs = [
    { c: '#7a2d22', d: '#3a1610', label: 'ГРУЗ-51' },
    { c: '#1f4d6e', d: '#0d2231', label: 'СТАЛЬ' },
    { c: '#2e5c33', d: '#142a17', label: 'NEOS' },
    { c: '#8a6420', d: '#3d2c0c', label: 'ТРАНС-7' },
    { c: '#5a2a62', d: '#251030', label: 'ОПАСНО' },
    { c: '#274a58', d: '#101f26', label: 'TEST-6' },
  ];
  // row A — solid (hard cover), row B — destructible, staggered for peek angles
  containerRow(ctx, 52, 36, 3, 14, false, defs);
  containerRow(ctx, 68, 43, 3, 14, true, defs);
  containerStack(ctx, 86, 40, defs[2]);
  containerStack(ctx, 86, 68, defs[4]);
  siloCluster(ctx, 106, 44);
  // yard clutter
  crateStack(ctx, 60, 76, 6, 5, 2.4, 90);
  crateStack(ctx, 78, 78, 5, 5, 2.2, 90);
  barrelCluster(ctx, 46, 74);
  barrelCluster(ctx, 96, 32);
}

// ── SW: assembly halls + pipe rack ────────────────────────────────────────

function pipeRack(ctx: ArenaBuildContext, x0: number, x1: number, z: number) {
  const pylMat = plate(0xb9c6d6, 0.55, 0.5);
  const pipeCols = [0x4a5d6e, 0x5d4a3e, 0x3e5d4a] as const;
  const len = Math.abs(x1 - x0);
  const cx = (x0 + x1) / 2;

  // pylons (hard, small)
  const count = Math.max(2, Math.round(len / 13) + 1);
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const px = x0 + (x1 - x0) * t;
    ctx.addColliderBlock(px, z, 2.0, 2.0, 8, false, () => {
      const g = new THREE.Group();
      g.add(ctx.box(2.0, 8, 2.0, pylMat.clone()));
      const frame = ctx.box(7.4, 0.7, 1.4, pylMat.clone());
      frame.position.y = 7.6;
      g.add(frame);
      return g;
    }, 0, 'wall');
  }
  // three long pipes overhead — non-LOS, tanks and shots pass under
  pipeCols.forEach((col, i) => {
    const pipe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.6, 0.6, len, 10),
      new THREE.MeshStandardMaterial({ color: col, map: structureTexture(), roughness: 0.4, metalness: 0.7 }),
    );
    pipe.rotation.z = Math.PI / 2;
    pipe.position.set(cx, 6.2 + i * 0.9, z + (i - 1) * 1.3);
    pipe.castShadow = true;
    ctx.group.add(pipe);
  });
  // valve wheels
  const valveMat = paint(0xa8221c);
  for (const vx of [x0 + len * 0.3, x0 + len * 0.7]) {
    const valve = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.13, 6, 14), valveMat);
    valve.position.set(vx, 4.6, z + 1.6);
    valve.rotation.y = Math.PI / 2;
    ctx.group.add(valve);
  }
}

function buildAssemblyDistrict(ctx: ArenaBuildContext) {
  hall(ctx, -96, -52, 34, 18, 9, { roof: 'gable', door: 2, windows: 5, fans: 2, stacks: 1 });
  hall(ctx, -52, -70, 26, 16, 8.5, { roof: 'flat', door: 1, windows: 3, fans: 1 });
  pipeRack(ctx, -120, -40, -38);
  transformer(ctx, -40, -40);
  transformer(ctx, -124, -40);
  crateStack(ctx, -84, -30, 5, 5, 2.4, 90);
  barrelCluster(ctx, -64, -34);
  scrapPile(ctx, -116, -76);
}

// ── SE: power yard + tank farm ────────────────────────────────────────────

function storageTank(ctx: ArenaBuildContext, x: number, z: number) {
  ctx.addColliderBlock(x, z, 10, 10, 8.6, false, () => {
    const g = new THREE.Group();
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(5.6, 5.6, 0.5, 18), concrete(0x5c6470));
    pad.position.y = 0.25;
    pad.receiveShadow = true;
    g.add(pad);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 4.6, 7.6, 18), steel(0x8794a3));
    body.position.y = 4.3;
    body.castShadow = true;
    body.receiveShadow = true;
    g.add(body);
    const roof = new THREE.Mesh(new THREE.SphereGeometry(4.6, 18, 6, 0, Math.PI * 2, 0, Math.PI / 2), steel(0x76828f));
    roof.position.y = 8.1;
    roof.scale.y = 0.34;
    roof.castShadow = true;
    g.add(roof);
    // hazard band + spiral stair hint
    const band = new THREE.Mesh(new THREE.CylinderGeometry(4.66, 4.66, 0.7, 18),
      new THREE.MeshBasicMaterial({ color: HAZARD_ORANGE }));
    band.position.y = 1.5;
    g.add(band);
    const rail = new THREE.Mesh(new THREE.TorusGeometry(4.7, 0.09, 6, 20), paint(0x39424e));
    rail.rotation.x = Math.PI / 2;
    rail.position.y = 8.2;
    g.add(rail);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xff3326, transparent: true, opacity: 0.9 }));
    lamp.position.y = 9.6;
    g.add(lamp);
    ctx.beaconMats.push(lamp.material as THREE.MeshBasicMaterial);
    return g;
  }, 0, 'wall');
}

function coolingTower(ctx: ArenaBuildContext, x: number, z: number, scale = 1) {
  const h = 15 * scale;
  const r = 5 * scale;
  ctx.addColliderBlock(x, z, r * 2.4, r * 2.4, h, false, () => {
    const g = new THREE.Group();
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.15, r * 0.8, h, 20), concrete(0x6a7280));
    shell.position.y = h / 2;
    shell.castShadow = true;
    shell.receiveShadow = true;
    g.add(shell);
    const waist = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.78, r * 0.78, 0.8, 20), concrete(0x5c6470));
    waist.position.y = h * 0.62;
    g.add(waist);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(r * 1.15, 0.16, 6, 22), paint(0x39424e));
    rim.rotation.x = Math.PI / 2;
    rim.position.y = h;
    g.add(rim);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xff3326, transparent: true, opacity: 0.9 }));
    lamp.position.y = h + 0.9;
    g.add(lamp);
    ctx.beaconMats.push(lamp.material as THREE.MeshBasicMaterial);
    return g;
  }, 0, 'wall');
  ctx.smokeEmitters.push(new THREE.Vector3(x, h + 0.5, z));
}

function transformer(ctx: ArenaBuildContext, x: number, z: number) {
  const coilMat = new THREE.MeshStandardMaterial({ color: 0x8a6a3a, roughness: 0.35, metalness: 0.8 });
  ctx.addColliderBlock(x, z, 6.5, 6.5, 4.6, false, () => {
    const g = new THREE.Group();
    g.add(ctx.box(6.4, 3.0, 6.4, concrete(0x707a86)));
    for (const cx of [-1.7, 0, 1.7]) {
      const coil = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 1.7, 10), coilMat);
      coil.position.set(cx, 3.85, 0);
      coil.castShadow = true;
      g.add(coil);
    }
    const warn = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.3, 0.14), hazard());
    warn.position.set(0, 1.7, 3.3);
    g.add(warn);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xff3326, transparent: true, opacity: 0.85 }));
    lamp.position.set(0, 5.2, 0);
    g.add(lamp);
    ctx.beaconMats.push(lamp.material as THREE.MeshBasicMaterial);
    return g;
  }, 0, 'wall');
}

function buildPowerDistrict(ctx: ArenaBuildContext) {
  for (const [tx, tz] of [[92, -52], [108, -52], [92, -68], [108, -68]] as const) {
    storageTank(ctx, tx, tz);
  }
  coolingTower(ctx, 56, -58, 1);
  coolingTower(ctx, 74, -70, 0.88);
  transformer(ctx, 44, -40);
  transformer(ctx, 124, -40);
  scrapPile(ctx, 126, -76);
  barrelCluster(ctx, 84, -34);
  crateStack(ctx, 60, -44, 5, 5, 2.4, 90);
}

// ── centre: gantry crane portal + holo beacon ─────────────────────────────

function buildCentralCrane(ctx: ArenaBuildContext) {
  const legH = 13;
  const legX = 36;
  const legZ = 16;
  const beamMat = plate(0xd9a533, 0.45, 0.6);
  const paintMat = paint(0xc7851f);

  // four legs — hard cover outside both main lanes
  for (const sx of [-legX, legX]) {
    for (const sz of [-legZ, legZ]) {
      ctx.addColliderBlock(sx, sz, 2.6, 2.6, legH, false, () => {
        const g = new THREE.Group();
        g.add(ctx.box(2.4, legH, 2.4, paintMat));
        const foot = ctx.box(3.4, 0.8, 3.4, concrete(0x4d545e));
        foot.position.y = 0.4;
        g.add(foot);
        const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.26, 6, 6),
          new THREE.MeshBasicMaterial({ color: 0xff3326, transparent: true, opacity: 0.9 }));
        beacon.position.y = legH + 0.8;
        g.add(beacon);
        ctx.beaconMats.push(beacon.material as THREE.MeshBasicMaterial);
        return g;
      }, 0, 'wall');
    }
    // cap beam over each leg pair
    const cap = ctx.box(3.0, 1.3, legZ * 2 + 3.4, beamMat);
    cap.position.set(sx, legH - 0.3, 0);
    cap.castShadow = true;
    ctx.group.add(cap);
  }

  // two girders spanning X, overhead — no collider (shots pass under)
  for (const sz of [-legZ, legZ]) {
    const girder = ctx.box(legX * 2 + 4, 1.5, 1.4, beamMat, 11.6);
    girder.position.z = sz;
    girder.castShadow = true;
    ctx.group.add(girder);
  }
  // Girder braces: 28 identical boxes → one InstancedMesh (census: −27 draws).
  const braceSlots: { x: number; z: number; rot: number }[] = [];
  for (const sz of [-legZ, legZ]) {
    for (let i = -legX + 4; i < legX; i += 5) {
      braceSlots.push({ x: i, z: sz, rot: i % 10 === 4 ? 0.7 : -0.7 });
    }
  }
  const braces = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.4, 1.7, 0.4), paintMat, braceSlots.length);
  braces.castShadow = true;
  const braceDummy = new THREE.Object3D();
  braceSlots.forEach((b, i) => {
    braceDummy.position.set(b.x, 11.6, b.z);
    braceDummy.rotation.set(0, 0, b.rot);
    braceDummy.updateMatrix();
    braces.setMatrixAt(i, braceDummy.matrix);
  });
  braces.instanceMatrix.needsUpdate = true;
  ctx.group.add(braces);

  // trolley — ArenaEffects animates `position.x` across the span
  const trolley = new THREE.Group();
  const frame = ctx.box(3.4, 1.7, legZ * 2 + 2, paintMat);
  frame.castShadow = true;
  trolley.add(frame);
  for (const sz of [-legZ, legZ]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.55, 8), paint(0x11161d));
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(0, -0.55, sz);
    trolley.add(wheel);
  }
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 4.2, 4),
    new THREE.MeshBasicMaterial({ color: 0x0a0d12 }));
  cable.position.y = -2.9;
  trolley.add(cable);
  const hook = ctx.box(1.0, 1.0, 1.0, paint(0x8a5a12));
  hook.position.y = -5.2;
  trolley.add(hook);
  trolley.position.set(0, 11.0, 0);
  ctx.group.add(trolley);
  ctx.setCraneTrolley(trolley);

  // holo beacon floating above the portal (roof of the complex)
  const holoMat = new THREE.MeshBasicMaterial({
    color: HOLO, transparent: true, opacity: 0.75,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const obeliskCore = new THREE.Mesh(new THREE.IcosahedronGeometry(1.35), holoMat);
  obeliskCore.position.set(0, 15.8, 0);
  ctx.group.add(obeliskCore);
  const obeliskRing = new THREE.Mesh(new THREE.TorusGeometry(2.3, 0.07, 8, 48), holoMat.clone());
  obeliskRing.position.set(0, 15.8, 0);
  obeliskRing.rotation.x = Math.PI / 2;
  ctx.group.add(obeliskRing);
  ctx.setObelisk(obeliskCore, obeliskRing);

  // crane rail beds (visual)
  for (const sz of [-legZ, legZ]) {
    const rail = ctx.box(legX * 2 + 12, 0.22, 0.4, paint(0x39424e), 0.11);
    rail.position.z = sz;
    ctx.group.add(rail);
  }
  // low molten basin beside the crossing — soft cover, shots fly over
  ctx.addColliderBlock(22, -26, 8, 6, 1.4, false,
    () => ctx.box(8, 1.4, 6, concrete(0x3a3230)), 0, 'block', false);
  moltenPlane(ctx, 6.4, 4.4, 22, -26);
}

// ── outer ring: storage pads, corner stacks, masts, rail siding ───────────

function smokestack(ctx: ArenaBuildContext, x: number, z: number) {
  const h = 20;
  ctx.addColliderBlock(x, z, 6.4, 6.4, h, false, () => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3.6, h, 14), plate(0x8a94a0, 0.6, 0.4));
    body.position.y = h / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    g.add(body);
    for (const ry of [7, 13]) {
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(3.05, 3.05, 0.7, 14), paint(0x303b49));
      ring.position.y = ry;
      g.add(ring);
    }
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(2.9, 2.5, 1.3, 14), paint(0x3a4655));
    cap.position.y = h + 0.5;
    g.add(cap);
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.36, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xff3326, transparent: true, opacity: 0.9 }));
    beacon.position.y = h + 1.8;
    g.add(beacon);
    ctx.beaconMats.push(beacon.material as THREE.MeshBasicMaterial);
    ctx.smokeEmitters.push(new THREE.Vector3(x, h + 1.4, z));
    return g;
  }, 0, 'wall');
}

function lampMast(ctx: ArenaBuildContext, x: number, z: number) {
  ctx.addColliderBlock(x, z, 0.9, 0.9, 9, false, () => {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.26, 9, 8), paint(0x333a44));
    pole.position.y = 4.5;
    g.add(pole);
    const head = ctx.box(1.5, 0.4, 0.7, new THREE.MeshBasicMaterial({ color: 0xffd9a0 }), 9.2);
    g.add(head);
    return g;
  }, 0, 'block', false);
}

function outerPad(ctx: ArenaBuildContext, x: number, z: number, kind: 'containers' | 'pipes' | 'scrap' | 'tanks') {
  const defs = [
    { c: '#5a4a2a', d: '#2a2010', label: 'ЗАВОД' },
    { c: '#2a4a5a', d: '#101f26', label: 'A-1' },
    { c: '#4a2a3a', d: '#1f1018', label: 'М-12' },
  ];
  if (kind === 'containers') {
    containerStack(ctx, x - 8, z - 6, defs[0]);
    containerStack(ctx, x + 8, z + 4, defs[1]);
    containerStack(ctx, x - 4, z + 10, defs[2]);
  } else if (kind === 'pipes') {
    const mat = steel(0x5d6a76);
    for (let i = 0; i < 5; i++) {
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 16, 10), mat);
      pipe.rotation.z = Math.PI / 2;
      pipe.position.set(x, 0.75 + (i % 2) * 1.5, z - 8 + i * 4);
      pipe.castShadow = true;
      ctx.group.add(pipe);
    }
    ctx.addColliderBlock(x, z, 17, 18, 2.3, false,
      () => ctx.box(17, 2.3, 18, rust(0x4a4038)), 0, 'block');
  } else if (kind === 'scrap') {
    scrapPile(ctx, x - 7, z + 4);
    scrapPile(ctx, x + 7, z - 5);
    crateStack(ctx, x, z + 11, 5, 5, 2.2, 90);
  } else {
    ctx.addColliderBlock(x - 8, z, 12, 12, 6.4, false, () => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 5.6, 16), steel(0x7d8894));
      body.position.y = 2.8;
      body.castShadow = true;
      g.add(body);
      const top = new THREE.Mesh(new THREE.SphereGeometry(5, 16, 6, 0, Math.PI * 2, 0, Math.PI / 2), steel(0x6d7883));
      top.position.y = 5.6;
      top.scale.y = 0.32;
      g.add(top);
      return g;
    }, 0, 'wall');
    ctx.addColliderBlock(x + 8, z + 6, 12, 12, 6.4, false, () => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 5.6, 16), steel(0x7d8894));
      body.position.y = 2.8;
      body.castShadow = true;
      g.add(body);
      return g;
    }, 0, 'wall');
  }
}

function railSiding(ctx: ArenaBuildContext, x0: number, x1: number, z: number) {
  const len = Math.abs(x1 - x0);
  const cx = (x0 + x1) / 2;
  // rails + sleepers — decorative (non-LOS), so tanks can cross freely
  for (const rz of [-1.9, 1.9]) {
    const rail = ctx.box(len, 0.22, 0.28, steel(0x9aa4b0), 0.11);
    rail.position.set(cx, 0.11, z + rz);
    ctx.group.add(rail);
  }
  const sleeperCount = Math.max(4, Math.round(len / 2.4));
  const sleeperGeo = new THREE.BoxGeometry(0.7, 0.16, 5.2);
  const sleepers = new THREE.InstancedMesh(sleeperGeo, rust(0x4a4038), sleeperCount);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < sleeperCount; i++) {
    dummy.position.set(x0 + (len / (sleeperCount - 1)) * i, 0.08, z);
    dummy.updateMatrix();
    sleepers.setMatrixAt(i, dummy.matrix);
  }
  sleepers.instanceMatrix.needsUpdate = true;
  ctx.group.add(sleepers);
  ctx.colliders.push(colliderFromCenter(cx, z, len, 5.4, 0.2, 'block', {
    blocksShots: false, blocksSight: false,
  }));
  // two flatcars — low destructible cover
  for (const fx of [x0 + len * 0.3, x0 + len * 0.72]) {
    ctx.addColliderBlock(fx, z, 14, 3.4, 2.6, true, () => {
      const g = new THREE.Group();
      g.add(ctx.box(14, 1.1, 3.2, rust(0x5a4a3a)));
      const load = ctx.box(9, 1.2, 2.6, steel(0x6a7480));
      load.position.y = 1.15;
      g.add(load);
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(14.2, 0.16, 3.3), hazard());
      stripe.position.y = 0.62;
      g.add(stripe);
      return g;
    }, 85, 'block');
  }
}

function buildOuterRing(ctx: ArenaBuildContext) {
  // storage pads on the diagonals (corners stay free for ±128 spawns)
  outerPad(ctx, -108, 108, 'containers');
  outerPad(ctx, 108, 108, 'pipes');
  outerPad(ctx, -108, -108, 'scrap');
  outerPad(ctx, 108, -108, 'tanks');
  // corner smokestacks — skyline anchors
  for (const [sx, sz] of [[-144, 144], [144, 144], [-144, -144], [144, -144]] as const) {
    smokestack(ctx, sx, sz);
  }
  // edge lamp masts (non-LOS)
  for (const [mx, mz] of [
    [138, 96], [138, -96], [-138, 96], [-138, -96],
    [96, 138], [-96, 138], [96, -138], [-96, -138],
  ] as const) {
    lampMast(ctx, mx, mz);
  }
  railSiding(ctx, 84, 142, -112);
  // outer corridor soft cover
  crateStack(ctx, 120, 20, 5, 5, 2.4, 90);
  crateStack(ctx, 120, -20, 5, 5, 2.4, 90);
  crateStack(ctx, -120, 20, 5, 5, 2.4, 90);
  crateStack(ctx, -120, -20, 5, 5, 2.4, 90);
  crateStack(ctx, 100, 44, 5, 5, 2.2, 90);
  crateStack(ctx, 100, -44, 5, 5, 2.2, 90);
  crateStack(ctx, -100, 44, 5, 5, 2.2, 90);
  crateStack(ctx, -100, -44, 5, 5, 2.2, 90);
  barrelCluster(ctx, 112, 56);
  barrelCluster(ctx, -112, -56);
  barrelCluster(ctx, 112, -56);
  barrelCluster(ctx, -112, 56);
  // mid-ring peek cover at the plaza corners (outside ring road + main lanes)
  for (const [bx, bz] of [[52, 52], [-52, 52], [52, -52], [-52, -52]] as const) {
    ctx.addColliderBlock(bx, bz, 8, 8, 3.6, false,
      () => ctx.box(8, 3.6, 8, plate(0x7d8894, 0.6, 0.45)), 0, 'block');
  }
  for (const [sx, sz] of [[50, 24], [-50, 24], [50, -24], [-50, -24],
    [24, 50], [-24, 50], [24, -50], [-24, -50]] as const) {
    crateStack(ctx, sx, sz, 5, 4, 2.2, 85);
  }
}

// ── soft cover primitives ─────────────────────────────────────────────────

function crateStack(ctx: ArenaBuildContext, x: number, z: number, w: number, d: number, h: number, hp: number) {
  const amber = crateTexture('#ffb02e');
  const mat = new THREE.MeshStandardMaterial({
    map: amber, roughness: 0.55, metalness: 0.35, emissive: 0x000000,
  });
  const edge = hazard();
  ctx.addColliderBlock(x, z, w, d, h, true, () => {
    const g = new THREE.Group();
    g.add(ctx.box(w, h, d, mat));
    const e = new THREE.Mesh(new THREE.BoxGeometry(w * 1.01, 0.09, d * 1.01), edge);
    e.position.y = h - 0.05;
    g.add(e);
    return g;
  }, hp);
}

function barrelCluster(ctx: ArenaBuildContext, x: number, z: number) {
  const colors = ['#a03a26', '#2b6ea0', '#7d8c25', '#8a6a1a'];
  const col = colors[Math.floor(Math.random() * colors.length)];
  const mat = new THREE.MeshStandardMaterial({
    map: barrelTexture(col), roughness: 0.5, metalness: 0.4, emissive: 0x000000,
  });
  const r = 0.58;
  const h = 1.3;
  ctx.addColliderBlock(x, z, 2.8, 2.8, h, true, () => {
    const g = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + (i % 2) * 0.6;
      const rad = i === 0 ? 0 : 0.9;
      const b = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 10), mat);
      b.position.set(Math.cos(a) * rad, h / 2, Math.sin(a) * rad);
      b.rotation.z = (Math.random() - 0.5) * 0.1;
      b.castShadow = true;
      b.receiveShadow = true;
      g.add(b);
    }
    return g;
  }, 55);
}

function scrapPile(ctx: ArenaBuildContext, x: number, z: number) {
  const mat = rust(0x5a4a3c);
  ctx.addColliderBlock(x, z, 6, 6, 2.6, true, () => {
    const g = new THREE.Group();
    for (let i = 0; i < 7; i++) {
      const b = ctx.box(
        1.2 + Math.random() * 2.4, 0.7 + Math.random() * 1.6, 1.2 + Math.random() * 2.2, mat);
      b.position.set((Math.random() - 0.5) * 3.6, 0.5 + Math.random() * 1.2, (Math.random() - 0.5) * 3.6);
      b.rotation.y = Math.random() * Math.PI;
      b.rotation.z = (Math.random() - 0.5) * 0.4;
      g.add(b);
    }
    return g;
  }, 70);
}

// ── factory ramps (local scale — not the legacy shared positions) ─────────

function buildFactoryRamps(ctx: ArenaBuildContext) {
  const rampMat = new THREE.MeshStandardMaterial({
    color: 0x2a3648, roughness: 0.55, metalness: 0.5,
    emissive: 0x0c2033, emissiveIntensity: 0.5,
  });
  const addRamp = (x: number, z: number, yaw: number) => {
    const wdt = 5.4, len = 6.2, hgt = 2.2;
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
  };
  // district approach ramps (decorative wedges — kept off the main cross,
  // the ring road and the spawn aprons)
  addRamp(72, 72, Math.PI * 0.75);
  addRamp(-72, 72, -Math.PI * 0.75);
  addRamp(72, -72, Math.PI * 0.25);
  addRamp(-72, -72, -Math.PI * 0.25);
  addRamp(100, 26, Math.PI / 2);
  addRamp(-100, 26, -Math.PI / 2);
  addRamp(100, -26, Math.PI / 2);
  addRamp(-100, -26, -Math.PI / 2);
}

// ── atmosphere (smog dome + drifting dust) ────────────────────────────────

function buildFactoryAtmosphere(ctx: ArenaBuildContext) {
  const domeGeo = new THREE.CylinderGeometry(ctx.half + 6, ctx.half + 6, 78, 48, 1, true);
  const domeMat = new THREE.MeshBasicMaterial({
    map: hexTexture(),
    transparent: true,
    opacity: 0.04,
    side: THREE.BackSide,
    depthWrite: false,
    color: 0xd08a3a,
    blending: THREE.AdditiveBlending,
  });
  const dome = new THREE.Mesh(domeGeo, domeMat);
  dome.position.y = 32;
  ctx.group.add(dome);
  ctx.setDome(dome);

  const N = 540;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - 0.5) * ARENA.size;
    pos[i * 3 + 1] = 0.4 + Math.random() * 13;
    pos[i * 3 + 2] = (Math.random() - 0.5) * ARENA.size;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xd8b070,
    size: 0.16,
    transparent: true,
    opacity: 0.4,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const dust = new THREE.Points(geo, mat);
  ctx.group.add(dust);
  ctx.setDust(dust);
}
