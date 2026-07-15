import * as THREE from 'three';
import { colliderFromCenter } from '../physics';
import type { ArenaBuildContext } from './context';

export function buildSmokestacks(ctx: ArenaBuildContext, structMat: THREE.Material) {
  const H = ctx.half;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const x = sx * (H - 4), z = sz * (H - 4);
      const stack = new THREE.Group();
      stack.position.set(x, 0, z);
      const body = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 3.4, 16, 12), structMat.clone());
      body.position.y = 8;
      body.castShadow = true; body.receiveShadow = true;
      stack.add(body);
      const ring1 = new THREE.Mesh(new THREE.CylinderGeometry(2.9, 2.9, 0.7, 12), new THREE.MeshStandardMaterial({ color: 0x303b49, roughness: 0.5, metalness: 0.6 }));
      ring1.position.y = 6; stack.add(ring1);
      const ring2 = ring1.clone(); ring2.position.y = 11; stack.add(ring2);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(2.7, 2.3, 1.2, 12), new THREE.MeshStandardMaterial({ color: 0x3a4655, roughness: 0.4, metalness: 0.7 }));
      cap.position.y = 16.4; stack.add(cap);
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.34, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xff3326, transparent: true, opacity: 0.9 }));
      beacon.position.y = 17.6;
      stack.add(beacon);
      ctx.beaconMats.push(beacon.material as THREE.MeshBasicMaterial);
      ctx.group.add(stack);
      ctx.colliders.push(colliderFromCenter(x, z, 5.6, 5.6, 16, 'wall'));
      ctx.smokeEmitters.push(new THREE.Vector3(x, 17.2, z));
    }
  }
}
