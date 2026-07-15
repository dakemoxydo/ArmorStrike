import * as THREE from 'three';
import { containerTexture } from '../textures';
import type { ArenaBuildContext } from './context';

export function buildContainerYard(ctx: ArenaBuildContext) {
  const defs: { c: string; d: string; label: string }[] = [
    { c: '#7a2d22', d: '#3a1610', label: 'ГРУЗ-51' },
    { c: '#1f4d6e', d: '#0d2231', label: 'СТАЛЬ' },
    { c: '#2e5c33', d: '#142a17', label: 'NEOS' },
    { c: '#8a6420', d: '#3d2c0c', label: 'ТРАНС-7' },
    { c: '#5a2a62', d: '#251030', label: 'ОПАСНО' },
    { c: '#274a58', d: '#101f26', label: 'TEST-6' },
  ];
  let cr = 0;

  // ряд А — прочные (неразрушаемые) контейнеры вдоль стены
  for (const z of [-26, -13, 0, 13, 26]) {
    const def = defs[(cr++) % defs.length];
    const mat = new THREE.MeshStandardMaterial({
      map: containerTexture(def.c, def.label, def.d), roughness: 0.5, metalness: 0.55,
    });
    ctx.addColliderBlock(-62, z, 4.2, 11, 3.2, false,
      () => ctx.box(4.2, 3.2, 11, mat), 0, 'block');
  }
  // ряд Б — разрушаемые контейнеры ближе к центру
  for (const z of [-19, -6, 7, 20]) {
    const def = defs[(cr++) % defs.length];
    const mat = new THREE.MeshStandardMaterial({
      map: containerTexture(def.c, def.label, def.d), roughness: 0.5, metalness: 0.55, emissive: 0x000000,
    });
    const edge = new THREE.MeshBasicMaterial({ color: 0xffb02e, transparent: true, opacity: 0.5 });
    ctx.addColliderBlock(-52, z, 4.2, 11, 3.2, true, () => {
      const g = new THREE.Group();
      g.add(ctx.box(4.2, 3.2, 11, mat));
      const e = new THREE.Mesh(new THREE.BoxGeometry(4.25, 0.1, 11.05), edge);
      e.position.y = 3.16;
      g.add(e);
      return g;
    }, 130, 'block');
  }
  // два штабеля (двухъярусные)
  for (const z of [-32, 32]) {
    const def = defs[(cr++) % defs.length];
    const mat = new THREE.MeshStandardMaterial({
      map: containerTexture(def.c, def.label, def.d), roughness: 0.5, metalness: 0.55,
    });
    ctx.addColliderBlock(-57.5, z, 9, 4.5, 6.4, false, () => {
      const g = new THREE.Group();
      const low = ctx.box(9, 3.2, 4.4, mat); low.position.y = 1.6; g.add(low);
      const up = ctx.box(9, 3.2, 4.4, mat); up.position.y = 4.8; up.rotation.y = 0.08; g.add(up);
      return g;
    }, 0, 'block');
  }
}
