import * as THREE from 'three';
import { structureTexture } from '../textures';
import type { ArenaBuildContext } from './context';

export function buildPipeRack(ctx: ArenaBuildContext) {
  const pipeMat = new THREE.MeshStandardMaterial({ color: 0x4a5d6e, map: structureTexture(), roughness: 0.4, metalness: 0.7 });
  const pylMat = new THREE.MeshStandardMaterial({ map: structureTexture(), color: 0xb9c6d6, roughness: 0.55, metalness: 0.5 });

  // опорные пилоны коридора
  for (const z of [-30, -18, -6, 6, 18, 30]) {
    ctx.addColliderBlock(46, z, 1.8, 1.8, 8, false, () => {
      const g = new THREE.Group();
      g.add(ctx.box(1.8, 8, 1.8, pylMat.clone()));
      const frame = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.7, 1.2), pylMat.clone());
      frame.position.y = 7.6;
      g.add(frame);
      return g;
    }, 0, 'wall');
  }
  // три высокие трубы вдоль эстакады (снаряды и танки проходят под ними)
  for (const [y, col] of [[6.1, 0x4a5d6e], [7.0, 0x5d4a3e], [7.9, 0x3e5d4a]] as const) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 72, 10),
      new THREE.MeshStandardMaterial({ color: col, map: structureTexture(), roughness: 0.4, metalness: 0.7 }));
    pipe.rotation.x = Math.PI / 2;
    pipe.position.set(46 + (y - 7) * 1.4, y, 0);
    pipe.castShadow = true;
    ctx.group.add(pipe);
  }
  // низкие напольные лотки
  for (const z of [-20, 0, 20]) {
    ctx.addColliderBlock(50.5, z, 3, 7, 1.5, false, () => {
      const g = new THREE.Group();
      g.add(ctx.box(3, 1.5, 7, pipeMat.clone()));
      return g;
    }, 0, 'block', false);
  }
  // клапанные колёса у пилонов
  const valveMat = new THREE.MeshStandardMaterial({ color: 0xa8221c, roughness: 0.5, metalness: 0.4 });
  for (const z of [-24, 12]) {
    const valve = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.12, 6, 12), valveMat);
    valve.position.set(44.8, 4.2, z);
    valve.rotation.y = Math.PI / 2;
    ctx.group.add(valve);
  }
}
