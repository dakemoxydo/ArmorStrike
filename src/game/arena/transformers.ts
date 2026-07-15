import * as THREE from 'three';
import { structureTexture } from '../textures';
import type { ArenaBuildContext } from './context';

export function buildTransformers(ctx: ArenaBuildContext) {
  const coilMat = new THREE.MeshStandardMaterial({ color: 0x8a6a3a, roughness: 0.35, metalness: 0.8 });
  const baseMat = new THREE.MeshStandardMaterial({ map: structureTexture(), color: 0xb9c6d6, roughness: 0.55, metalness: 0.5 });
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const x = sx * 40, z = sz * 40;
      ctx.addColliderBlock(x, z, 6, 6, 4.5, false, () => {
        const g = new THREE.Group();
        g.add(ctx.box(6, 3, 6, baseMat.clone()));
        for (const cx of [-1.6, 0, 1.6]) {
          const coil = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 1.6, 8), coilMat.clone());
          coil.position.set(cx, 3.8, 0);
          coil.castShadow = true;
          g.add(coil);
        }
        const warn = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2, 0.12),
          new THREE.MeshBasicMaterial({ color: 0xffb02e }));
        warn.position.set(0, 1.6, 3.1);
        g.add(warn);
        const lampB = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 6),
          new THREE.MeshBasicMaterial({ color: 0xff3326, transparent: true, opacity: 0.85 }));
        lampB.position.set(0, 5.1, 0);
        g.add(lampB);
        ctx.beaconMats.push(lampB.material as THREE.MeshBasicMaterial);
        return g;
      }, 0, 'wall');
    }
  }
}
