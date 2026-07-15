import * as THREE from 'three';
import { barrelTexture, crateTexture } from '../textures';
import type { ArenaBuildContext } from './context';

export function buildScattered(ctx: ArenaBuildContext) {
  const amber = crateTexture('#ffb02e');
  const steel = crateTexture('#5ec8ff');
  const solidMat = new THREE.MeshStandardMaterial({ map: steel, roughness: 0.45, metalness: 0.55, color: 0x9fb4cc });

  const crate = (x: number, z: number, w: number, d: number, h: number, yaw = 0) => {
    const mat = new THREE.MeshStandardMaterial({ map: amber, roughness: 0.55, metalness: 0.35, emissive: 0x000000 });
    const edge = new THREE.MeshBasicMaterial({ color: 0xffb02e, transparent: true, opacity: 0.5 });
    ctx.addColliderBlock(x, z, w, d, h, true, () => {
      const g = new THREE.Group();
      const b = ctx.box(w, h, d, mat); b.rotation.y = yaw;
      g.add(b);
      const e = new THREE.Mesh(new THREE.BoxGeometry(w * 1.01, 0.09, d * 1.01), edge);
      e.position.y = h - 0.05; e.rotation.y = yaw;
      g.add(e);
      return g;
    }, h > 3 ? 150 : 90);
  };
  const solidCrate = (x: number, z: number, w: number, d: number, h: number) => {
    ctx.addColliderBlock(x, z, w, d, h, false, () => ctx.box(w, h, d, solidMat.clone()), 0, 'block');
  };

  crate(13, -11, 5, 4, 2.4);
  crate(-13, 11, 5, 4, 2.4);
  crate(18, -30, 5, 5, 2.4, 0.3);
  crate(-18, 30, 5, 5, 2.4, -0.3);
  crate(9, -52, 5, 5, 2.4);
  crate(-26, -56, 4, 4, 2.4, 0.4);
  crate(33, 40, 4, 4, 2.4);
  crate(8, 55, 5, 5, 2.4, 0.2);
  crate(40, -10, 4, 4, 2.4);
  crate(40, 12, 4, 4, 2.4, -0.25);
  solidCrate(0, 26, 6, 3, 3.4);
  solidCrate(0, -28, 6, 3, 3.4);
  solidCrate(30, 15, 3, 6, 3.4);
  solidCrate(-32, -14, 3, 6, 3.4);

  // ======== кластеры бочек (разрушаемые) ========
  const bcolors = ['#a03a26', '#2b6ea0', '#7d8c25', '#8a6a1a'];
  let bi = 0;
  const barrels = (x: number, z: number, n: number) => {
    const col = bcolors[(bi++) % bcolors.length];
    const mat = new THREE.MeshStandardMaterial({
      map: barrelTexture(col), roughness: 0.5, metalness: 0.4, emissive: 0x000000,
    });
    const r = 0.55, h = 1.25;
    ctx.addColliderBlock(x, z, 2.6, 2.6, h, true, () => {
      const g = new THREE.Group();
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + (i % 2) * 0.6;
        const rad = (i === 0) ? 0 : 0.85;
        const b = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 10), mat);
        b.position.set(Math.cos(a) * rad, h / 2, Math.sin(a) * rad);
        b.rotation.z = (Math.random() - 0.5) * 0.1;
        b.castShadow = true; b.receiveShadow = true;
        g.add(b);
      }
      return g;
    }, 55);
  };
  barrels(12.5, 12.5, 4);
  barrels(-12.5, -12.5, 4);
  barrels(36, -24, 5);
  barrels(-34, 17, 4);
  barrels(20, 33, 5);
  barrels(-4, -35, 4);
  barrels(53, -6, 4);
  barrels(-52, 26, 5);
}
