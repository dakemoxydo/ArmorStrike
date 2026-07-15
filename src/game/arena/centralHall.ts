import * as THREE from 'three';
import type { ArenaBuildContext } from './context';

export function buildCentralHall(ctx: ArenaBuildContext, structMat: THREE.Material) {
  // главный корпус
  ctx.addColliderBlock(0, 0, 16, 10, 9.4, false, () => {
    const g = new THREE.Group();
    const bodyMat = structMat.clone();
    g.add(ctx.box(16, 9.4, 10, bodyMat));
    for (const vx of [-4.5, 0.5, 5]) {
      const vent = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 1.6, 10),
        new THREE.MeshStandardMaterial({ color: 0x2f3a48, roughness: 0.4, metalness: 0.7 }));
      vent.position.set(vx, 10.1, -1.5);
      vent.castShadow = true;
      g.add(vent);
      const fan = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.15, 6),
        new THREE.MeshStandardMaterial({ color: 0x141a22, roughness: 0.8 }));
      fan.position.set(vx, 10.95, -1.5);
      g.add(fan);
    }
    const doorGlow = new THREE.Mesh(new THREE.BoxGeometry(5, 4.4, 0.3),
      new THREE.MeshBasicMaterial({ color: 0x175d52 }));
    doorGlow.position.set(0, 2.4, 5.1);
    g.add(doorGlow);
    return g;
  }, 0, 'wall');

  // пристройка-аннекс
  ctx.addColliderBlock(0, -9.5, 8, 5, 5, false, () => {
    const g = new THREE.Group();
    g.add(ctx.box(8, 5, 5, structMat.clone()));
    const win = new THREE.Mesh(new THREE.BoxGeometry(6.4, 1.4, 0.2),
      new THREE.MeshBasicMaterial({ color: 0x1a6f62 }));
    win.position.set(0, 3.4, -2.55);
    g.add(win);
    return g;
  }, 0, 'wall');

  // пара дымоходов цеха
  for (const sx of [7.5, 10.5]) {
    ctx.addColliderBlock(sx, 8.5, 3.4, 3.4, 11, false, () => {
      const g = new THREE.Group();
      const cyl = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.8, 11, 10), structMat.clone());
      cyl.position.y = 5.5; cyl.castShadow = true; cyl.receiveShadow = true;
      g.add(cyl);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.4, 0.6, 10),
        new THREE.MeshStandardMaterial({ color: 0x3a4655, roughness: 0.4, metalness: 0.7 }));
      cap.position.y = 11.2;
      g.add(cap);
      ctx.smokeEmitters.push(new THREE.Vector3(sx, 11.6, 8.5));
      return g;
    }, 0, 'wall');
  }

  // голографическая вышка на крыше (обелиск)
  const holoMat = new THREE.MeshBasicMaterial({
    color: 0x2ee6c0, transparent: true, opacity: 0.75,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const obeliskCore = new THREE.Mesh(new THREE.IcosahedronGeometry(1.15), holoMat);
  obeliskCore.position.set(0, 12.6, 0);
  ctx.group.add(obeliskCore);
  const obeliskRing = new THREE.Mesh(new THREE.TorusGeometry(2.0, 0.06, 8, 48), holoMat.clone());
  obeliskRing.position.set(0, 12.6, 0);
  obeliskRing.rotation.x = Math.PI / 2;
  ctx.group.add(obeliskRing);
  ctx.setObelisk(obeliskCore, obeliskRing);
}
