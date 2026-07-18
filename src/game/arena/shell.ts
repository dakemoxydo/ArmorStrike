// ===== Общая оболочка арены: void, пол, стены, пилоны, лампы, вывески =====
import * as THREE from 'three';
import { ARENA } from '../constants';
import { colliderFromCenter } from '../engine/physics';
import { signTexture, wallTexture } from '../textures';
import type { ArenaBuildContext } from './context';

export interface ArenaShellTheme {
  groundMap: THREE.Texture;
  groundRoughness?: number;
  groundMetalness?: number;
  wallColor?: number;
  pillarColor?: number;
  lampColor?: number;
  stripColor?: number;
  signA: [string, string];
  signB: [string, string];
}

/** Perimeter, ground and wall trim shared by every map. */
export function buildArenaShell(ctx: ArenaBuildContext, theme: ArenaShellTheme) {
  const H = ctx.half;

  const voidMat = new THREE.MeshStandardMaterial({ color: 0x07090d, roughness: 1 });
  const voidPlane = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600), voidMat);
  voidPlane.rotation.x = -Math.PI / 2;
  voidPlane.position.y = -0.08;
  voidPlane.receiveShadow = true;
  ctx.group.add(voidPlane);

  const groundMat = new THREE.MeshStandardMaterial({
    map: theme.groundMap,
    roughness: theme.groundRoughness ?? 0.88,
    metalness: theme.groundMetalness ?? 0.2,
  });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(ARENA.size, ARENA.size), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  ctx.group.add(ground);

  const wMat = new THREE.MeshStandardMaterial({
    map: wallTexture(),
    roughness: 0.6,
    metalness: 0.4,
    color: theme.wallColor ?? 0xbfd2e6,
  });
  const L = ARENA.size + ARENA.wallT * 2;
  const wallDefs: [number, number, number, number][] = [
    [0, -(H + ARENA.wallT / 2), L, ARENA.wallT],
    [0, H + ARENA.wallT / 2, L, ARENA.wallT],
    [-(H + ARENA.wallT / 2), 0, ARENA.wallT, L],
    [H + ARENA.wallT / 2, 0, ARENA.wallT, L],
  ];
  for (const [x, z, w, d] of wallDefs) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, ARENA.wallH, d), wMat);
    m.position.set(x, ARENA.wallH / 2, z);
    m.castShadow = true;
    m.receiveShadow = true;
    ctx.group.add(m);
    ctx.colliders.push(colliderFromCenter(x, z, w, d, ARENA.wallH, 'wall'));
  }

  const pilMat = new THREE.MeshStandardMaterial({
    color: theme.pillarColor ?? 0x222d3d,
    roughness: 0.6,
    metalness: 0.5,
  });
  const lampMat = new THREE.MeshBasicMaterial({ color: theme.lampColor ?? 0xffb84d });
  for (let i = -2; i <= 2; i++) {
    const p = i * 26;
    for (const side of [-1, 1]) {
      ctx.addColliderBlock(p, side * (H - 0.6), 1.6, 1.6, ARENA.wallH + 1, false,
        () => ctx.box(1.6, ARENA.wallH + 1, 1.6, pilMat.clone()), 0, 'wall');
      ctx.addColliderBlock(side * (H - 0.6), p, 1.6, 1.6, ARENA.wallH + 1, false,
        () => ctx.box(1.6, ARENA.wallH + 1, 1.6, pilMat.clone()), 0, 'wall');
    }
  }
  for (let i = -3; i <= 3; i++) {
    const p = i * 18;
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.3, 1.6), lampMat);
    lamp.position.set(p, ARENA.wallH - 1.2, -(H - 1.2));
    ctx.group.add(lamp);
    const lamp2 = lamp.clone();
    lamp2.position.set(p, ARENA.wallH - 1.2, H - 1.2);
    ctx.group.add(lamp2);
  }

  const stripMat = new THREE.MeshBasicMaterial({
    color: theme.stripColor ?? 0x2ee6c0,
    transparent: true,
    opacity: 0.75,
  });
  for (const [x, z, w, d] of wallDefs) {
    const s = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.995, 0.16, Math.max(d * 0.35, 0.45)),
      stripMat,
    );
    s.position.set(x, ARENA.wallH + 0.14, z);
    ctx.group.add(s);
  }

  const [tA, sA] = theme.signA;
  const [tB, sB] = theme.signB;
  const signMat = new THREE.MeshStandardMaterial({
    map: signTexture(tA, sA),
    emissive: 0x22333a,
    emissiveIntensity: 0.5,
    roughness: 0.6,
    metalness: 0.2,
  });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(44, 11), signMat);
  sign.position.set(0, ARENA.wallH + 3.5, -(H + ARENA.wallT - 0.2));
  ctx.group.add(sign);

  const sign2Mat = new THREE.MeshStandardMaterial({
    map: signTexture(tB, sB),
    emissive: 0x22333a,
    emissiveIntensity: 0.5,
    roughness: 0.6,
    metalness: 0.2,
  });
  const sign2 = new THREE.Mesh(new THREE.PlaneGeometry(32, 8), sign2Mat);
  sign2.position.set(-(H + ARENA.wallT - 0.2), ARENA.wallH + 3, 0);
  sign2.rotation.y = Math.PI / 2;
  ctx.group.add(sign2);
}
