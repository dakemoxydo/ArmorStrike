import * as THREE from 'three';
import { structureTexture } from '../textures';
import type { ArenaBuildContext } from './context';

export function buildGantryCrane(ctx: ArenaBuildContext) {
  const paintMat = new THREE.MeshStandardMaterial({ color: 0xc7851f, roughness: 0.5, metalness: 0.55 });
  const beamMat = new THREE.MeshStandardMaterial({ map: structureTexture(), color: 0xd9a533, roughness: 0.45, metalness: 0.6 });
  const legH = 13;

  for (const sx of [-20, 20]) {
    for (const sz of [-6, 6]) {
      ctx.addColliderBlock(sx, sz, 2.2, 2.2, legH, false,
        () => ctx.box(2.2, legH, 2.2, paintMat.clone()), 0, 'wall');
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.24, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0xff3326, transparent: true, opacity: 0.9 }));
      b.position.set(sx, legH + 0.7, sz);
      ctx.group.add(b);
      ctx.beaconMats.push(b.material as THREE.MeshBasicMaterial);
    }
    const cap = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2, 15.8), beamMat);
    cap.position.set(sx, legH - 0.2, 0);
    cap.castShadow = true;
    ctx.group.add(cap);
  }
  for (const sz of [-6, 6]) {
    const girder = new THREE.Mesh(new THREE.BoxGeometry(40, 1.4, 1.3), beamMat);
    girder.position.set(0, 12.6, sz);
    girder.castShadow = true;
    ctx.group.add(girder);
    for (let i = -18; i < 18; i += 4) {
      const brace = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.6, 0.35), paintMat.clone());
      brace.position.set(i + 2, 12.6, sz);
      brace.rotation.z = (i % 8 === 2 ? 0.7 : -0.7);
      ctx.group.add(brace);
    }
  }
  const trolley = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.BoxGeometry(3, 1.5, 14.2), paintMat.clone());
  frame.castShadow = true;
  trolley.add(frame);
  for (const sz of [-6, 6]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.5, 8),
      new THREE.MeshStandardMaterial({ color: 0x11161d, roughness: 0.9 }));
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(0, -0.5, sz);
    trolley.add(wheel);
  }
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.4, 4),
    new THREE.MeshBasicMaterial({ color: 0x0a0d12 }));
  cable.position.y = -2.4;
  trolley.add(cable);
  const hook = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9),
    new THREE.MeshStandardMaterial({ color: 0x8a5a12, roughness: 0.5, metalness: 0.6 }));
  hook.position.y = -4.2;
  hook.castShadow = true;
  trolley.add(hook);
  trolley.position.set(0, 12.6, 0);
  ctx.group.add(trolley);
  ctx.setCraneTrolley(trolley);
}
