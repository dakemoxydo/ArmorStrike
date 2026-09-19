// ===== Общая оболочка арены: void, пол, стены, пилоны, лампы, вывески =====
import * as THREE from 'three';
import { ARENA } from '../constants';
import { colliderFromCenter } from '../engine/physics';
import { signTexture, wallTexture, type SignStyle } from '../textures';
import { markShared } from '../resources/sharedResources';
import type { ArenaBuildContext } from './context';

export interface ArenaShellTheme {
  groundMap: THREE.Texture;
  /** Perimeter wall map; defaults to the shared industrial `wallTexture()`. */
  wallMap?: THREE.Texture;
  groundRoughness?: number;
  groundMetalness?: number;
  wallColor?: number;
  pillarColor?: number;
  lampColor?: number;
  stripColor?: number;
  signA: [string, string];
  signB: [string, string];
  /** Billboard styling; defaults to the neon `tech` look. */
  signStyle?: SignStyle;
}

/** Process-shared геометрия ламп периметра: одна на 14 фонарей и на все rebuild'ы. */
let _lampGeo: THREE.BoxGeometry | null = null;
function sharedLampGeo(): THREE.BoxGeometry {
  if (!_lampGeo) _lampGeo = markShared(new THREE.BoxGeometry(0.8, 0.3, 1.6));
  return _lampGeo;
}

/**
 * Локальные shared unit-геометрии shell'а (стены/стрипы/вывески через scale).
 * markShared → дедуп-dispose (disposeArenaSubtree/disposeObject3D) пропускает.
 * Живут здесь, а не в skyline.ts, чтобы shell не зависел от чужих хелперов.
 */
let _shellBox: THREE.BoxGeometry | null = null;
let _shellPlane: THREE.PlaneGeometry | null = null;
function sharedShellBox(): THREE.BoxGeometry {
  if (!_shellBox) _shellBox = markShared(new THREE.BoxGeometry(1, 1, 1));
  return _shellBox;
}
function sharedShellPlane(): THREE.PlaneGeometry {
  if (!_shellPlane) _shellPlane = markShared(new THREE.PlaneGeometry(1, 1));
  return _shellPlane;
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
    map: theme.wallMap ?? wallTexture(),
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
  // Стены/стрипы — shared unit-Box + scale (вместо 8 своих BoxGeometry):
  // размеры те же, коллайдеры не тронуты, dispose скипает shared.
  const unitBox = sharedShellBox();
  for (const [x, z, w, d] of wallDefs) {
    const m = new THREE.Mesh(unitBox, wMat);
    m.scale.set(w, ARENA.wallH, d);
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
  // B8 (часть): пилоны статичны (ни per-instance flash, ни fade) — общий материал
  // вместо clone() на каждый из 20: меньше аллокаций, батчинг draw-вызовов не ломается.
  const lampMat = new THREE.MeshBasicMaterial({ color: theme.lampColor ?? 0xffb84d });
  for (let i = -2; i <= 2; i++) {
    const p = i * 26;
    for (const side of [-1, 1]) {
      ctx.addColliderBlock(p, side * (H - 0.6), 1.6, 1.6, ARENA.wallH + 1, false,
        () => ctx.box(1.6, ARENA.wallH + 1, 1.6, pilMat), 0, 'wall');
      ctx.addColliderBlock(side * (H - 0.6), p, 1.6, 1.6, ARENA.wallH + 1, false,
        () => ctx.box(1.6, ARENA.wallH + 1, 1.6, pilMat), 0, 'wall');
    }
  }
  const lampGeo = sharedLampGeo(); // process-shared, markShared: дедуп-dispose пропускает
  for (let i = -3; i <= 3; i++) {
    const p = i * 18;
    const lamp = new THREE.Mesh(lampGeo, lampMat);
    lamp.position.set(p, ARENA.wallH - 1.2, -(H - 1.2));
    ctx.group.add(lamp);
    const lamp2 = lamp.clone();
    lamp2.position.set(p, ARENA.wallH - 1.2, H - 1.2);
    ctx.group.add(lamp2);
  }

  const stripMat = new THREE.MeshBasicMaterial({
    color: theme.stripColor ?? 0xf59e0b,
    transparent: true,
    opacity: 0.75,
  });
  for (const [x, z, w, d] of wallDefs) {
    const s = new THREE.Mesh(unitBox, stripMat);
    s.scale.set(w * 0.995, 0.16, Math.max(d * 0.35, 0.45));
    s.position.set(x, ARENA.wallH + 0.14, z);
    ctx.group.add(s);
  }

  const [tA, sA] = theme.signA;
  const [tB, sB] = theme.signB;
  const signStyle = theme.signStyle ?? 'tech';
  const signMat = new THREE.MeshStandardMaterial({
    map: signTexture(tA, sA, signStyle),
    emissive: 0x22333a,
    emissiveIntensity: 0.5,
    roughness: 0.6,
    metalness: 0.2,
  });
  // Вывески — shared unit-Plane + scale (вместо 2 своих PlaneGeometry).
  const unitPlane = sharedShellPlane();
  const sign = new THREE.Mesh(unitPlane, signMat);
  sign.scale.set(44, 11, 1);
  sign.position.set(0, ARENA.wallH + 3.5, -(H + ARENA.wallT - 0.2));
  ctx.group.add(sign);

  const sign2Mat = new THREE.MeshStandardMaterial({
    map: signTexture(tB, sB, signStyle),
    emissive: 0x22333a,
    emissiveIntensity: 0.5,
    roughness: 0.6,
    metalness: 0.2,
  });
  const sign2 = new THREE.Mesh(unitPlane, sign2Mat);
  sign2.scale.set(32, 8, 1);
  sign2.position.set(-(H + ARENA.wallT - 0.2), ARENA.wallH + 3, 0);
  sign2.rotation.y = Math.PI / 2;
  ctx.group.add(sign2);
}
