import * as THREE from 'three';
import { structureTexture } from '../textures';
import type { ArenaBuildContext } from './context';

export function buildSilos(ctx: ArenaBuildContext) {
  const siloMat = new THREE.MeshStandardMaterial({ color: 0x49606e, map: structureTexture(), roughness: 0.45, metalness: 0.6 });
  const silos: [number, number][] = [[12, 47], [20, 50], [27, 46]];
  for (const [x, z] of silos) {
    ctx.addColliderBlock(x, z, 6, 6, 11, false, () => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(2.9, 3.1, 11, 14), siloMat.clone());
      body.position.y = 5.5; body.castShadow = true; body.receiveShadow = true;
      g.add(body);
      const dome = new THREE.Mesh(new THREE.SphereGeometry(2.9, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), siloMat.clone());
      dome.position.y = 11;
      dome.castShadow = true;
      g.add(dome);
      const stripe = new THREE.Mesh(new THREE.CylinderGeometry(3.02, 3.02, 0.6, 14),
        new THREE.MeshBasicMaterial({ color: 0xffb02e }));
      stripe.position.y = 7.4;
      g.add(stripe);
      const lampC = new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0x35d5ff, transparent: true, opacity: 0.85 }));
      lampC.position.y = 13.4;
      g.add(lampC);
      ctx.beaconMats.push(lampC.material as THREE.MeshBasicMaterial);
      return g;
    }, 0, 'wall');
  }
  // низкие грунтовые трубопроводы между баками (снаряды пролетают над)
  ctx.addColliderBlock(19.5, 42.5, 16, 1.8, 1.4, false, () => {
    const g = new THREE.Group();
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 16, 8), siloMat.clone());
    pipe.rotation.z = Math.PI / 2;
    pipe.position.y = 0.7; pipe.castShadow = true; pipe.receiveShadow = true;
    g.add(pipe);
    return g;
  }, 0, 'block', false);
  ctx.addColliderBlock(34.5, 26, 1.8, 20, 1.4, false, () => {
    const g = new THREE.Group();
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 20, 8), siloMat.clone());
    pipe.rotation.x = Math.PI / 2;
    pipe.position.y = 0.7; pipe.castShadow = true; pipe.receiveShadow = true;
    g.add(pipe);
    return g;
  }, 0, 'block', false);

  // прохладный акцент свет
  const lc = new THREE.PointLight(0x2fb8ff, 90, 26, 2);
  lc.position.set(20, 6, 47);
  ctx.group.add(lc);
}
