import * as THREE from 'three';
import { ARENA } from './constants';
import type { Arena } from './Arena';
import { colliderFromCenter } from './engine/physics';
import {
  factoryGroundTexture, signTexture, structureTexture, wallTexture,
} from './textures';
import type { ArenaBuildContext } from './arena/context';
import { buildAtmosphere } from './arena/atmosphere';
import { buildCentralHall } from './arena/centralHall';
import { buildContainerYard } from './arena/containerYard';
import { buildFoundry } from './arena/foundry';
import { buildGantryCrane } from './arena/gantryCrane';
import { buildPipeRack } from './arena/pipeRack';
import { buildRamps } from './arena/ramps';
import { buildScattered } from './arena/scattered';
import { buildSilos } from './arena/silos';
import { buildSkyline } from './arena/skyline';
import { buildSmokestacks } from './arena/smokestacks';
import { buildTransformers } from './arena/transformers';
import type { ArenaEffects } from './ArenaEffects';

export function buildArena(arena: Arena, effects: ArenaEffects) {
  const ctx = makeContext(arena, effects);
  const H = arena.half;

  const structMat = new THREE.MeshStandardMaterial({
    map: structureTexture(), roughness: 0.55, metalness: 0.5, color: 0xb9c6d6,
  });

  const voidMat = new THREE.MeshStandardMaterial({ color: 0x07090d, roughness: 1 });
  const voidPlane = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600), voidMat);
  voidPlane.rotation.x = -Math.PI / 2;
  voidPlane.position.y = -0.08;
  voidPlane.receiveShadow = true;
  arena.group.add(voidPlane);

  const groundMat = new THREE.MeshStandardMaterial({
    map: factoryGroundTexture(ARENA.size), roughness: 0.88, metalness: 0.2,
  });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(ARENA.size, ARENA.size), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  arena.group.add(ground);

  buildSkyline(ctx);

  const wMat = new THREE.MeshStandardMaterial({
    map: wallTexture(), roughness: 0.6, metalness: 0.4, color: 0xbfd2e6,
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
    arena.group.add(m);
    arena.colliders.push(colliderFromCenter(x, z, w, d, ARENA.wallH, 'wall'));
  }

  const pilMat = new THREE.MeshStandardMaterial({ color: 0x222d3d, roughness: 0.6, metalness: 0.5 });
  const lampMatWarm = new THREE.MeshBasicMaterial({ color: 0xffb84d });
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
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.3, 1.6), lampMatWarm);
    lamp.position.set(p, ARENA.wallH - 1.2, -(H - 1.2));
    arena.group.add(lamp);
    const lamp2 = lamp.clone();
    lamp2.position.set(p, ARENA.wallH - 1.2, H - 1.2);
    arena.group.add(lamp2);
  }

  const stripMat = new THREE.MeshBasicMaterial({ color: 0x2ee6c0, transparent: true, opacity: 0.75 });
  for (const [x, z, w, d] of wallDefs) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(w * 0.995, 0.16, Math.max(d * 0.35, 0.45)), stripMat);
    s.position.set(x, ARENA.wallH + 0.14, z);
    arena.group.add(s);
  }

  const signMat = new THREE.MeshStandardMaterial({
    map: signTexture('ЗАВОД-51', 'ЛИТЕЙНЫЙ КОМПЛЕКС «ARMORSTRIKE»'),
    emissive: 0x22333a, emissiveIntensity: 0.5, roughness: 0.6, metalness: 0.2,
  });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(44, 11), signMat);
  sign.position.set(0, ARENA.wallH + 3.5, -(H + ARENA.wallT - 0.2));
  arena.group.add(sign);
  const sign2Mat = new THREE.MeshStandardMaterial({
    map: signTexture('ЦЕХ №7', 'МЕХАНИЧЕСКАЯ СБОРКА'),
    emissive: 0x22333a, emissiveIntensity: 0.5, roughness: 0.6, metalness: 0.2,
  });
  const sign2 = new THREE.Mesh(new THREE.PlaneGeometry(32, 8), sign2Mat);
  sign2.position.set(-(H + ARENA.wallT - 0.2), ARENA.wallH + 3, 0);
  sign2.rotation.y = Math.PI / 2;
  arena.group.add(sign2);

  buildSmokestacks(ctx, structMat);
  buildCentralHall(ctx, structMat);
  buildGantryCrane(ctx);
  buildFoundry(ctx, structMat);
  buildSilos(ctx);
  buildContainerYard(ctx);
  buildPipeRack(ctx);
  buildTransformers(ctx);
  buildRamps(ctx);
  buildScattered(ctx);
  buildAtmosphere(ctx);
}

function makeContext(arena: Arena, effects: ArenaEffects): ArenaBuildContext {
  return {
    group: arena.group,
    half: arena.half,
    colliders: arena.colliders,
    blocks: arena.blocks,
    beaconMats: effects.beaconMats,
    smokeEmitters: effects.smokeEmitters,
    furnaceGlowMats: effects.furnaceGlowMats,
    moltenMats: effects.moltenMats,
    box: (w, h, d, mat, cy) => arena.box(w, h, d, mat, cy),
    addColliderBlock: (x, z, w, d, h, destructible, buildMesh, hp, kind, blocksSight) =>
      arena.addColliderBlock(x, z, w, d, h, destructible, buildMesh, hp, kind, blocksSight),
    setObelisk: (core, ring) => { effects.obeliskCore = core; effects.obeliskRing = ring; },
    setCraneTrolley: (trolley) => { effects.craneTrolley = trolley; },
    setDome: (dome) => { effects.dome = dome; },
    setDust: (dust) => { effects.dust = dust; },
  };
}
