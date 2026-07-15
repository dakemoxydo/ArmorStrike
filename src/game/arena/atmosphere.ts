import * as THREE from 'three';
import { ARENA } from '../constants';
import { hexTexture } from '../textures';
import type { ArenaBuildContext } from './context';

export function buildAtmosphere(ctx: ArenaBuildContext) {
  // энергетический купол поверх завода
  const domeGeo = new THREE.CylinderGeometry(ctx.half + 6, ctx.half + 6, 48, 48, 1, true);
  const domeMat = new THREE.MeshBasicMaterial({
    map: hexTexture(), transparent: true, opacity: 0.05,
    side: THREE.BackSide, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const dome = new THREE.Mesh(domeGeo, domeMat);
  dome.position.y = 20;
  ctx.group.add(dome);
  ctx.setDome(dome);

  // парящая пыль
  const N = 320;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - 0.5) * ARENA.size;
    pos[i * 3 + 1] = 0.5 + Math.random() * 13;
    pos[i * 3 + 2] = (Math.random() - 0.5) * ARENA.size;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color: 0x7adfff, size: 0.16, transparent: true, opacity: 0.45,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const dust = new THREE.Points(geo, mat);
  ctx.group.add(dust);
  ctx.setDust(dust);
}
