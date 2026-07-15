import * as THREE from 'three';
import type { ArenaBuildContext } from './context';

export function buildFoundry(ctx: ArenaBuildContext, structMat: THREE.Material) {
  const glow = () => {
    const m = new THREE.MeshStandardMaterial({
      color: 0x2a1410, roughness: 0.6, metalness: 0.3,
      emissive: 0xff5a10, emissiveIntensity: 0.9,
    });
    ctx.furnaceGlowMats.push(m);
    return m;
  };

  // главная печь
  ctx.addColliderBlock(-8, -50, 9, 7, 7, false, () => {
    const g = new THREE.Group();
    g.add(ctx.box(9, 7, 7, structMat.clone()));
    for (const wx of [-2.5, 0, 2.5]) {
      const grille = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.6, 0.25), glow());
      grille.position.set(wx, 2.2, 3.6);
      g.add(grille);
    }
    const stack = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.5, 5, 10),
      structMat.clone());
    stack.position.set(0, 9, 0);
    stack.castShadow = true;
    g.add(stack);
    ctx.smokeEmitters.push(new THREE.Vector3(-8, 12, -50));
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.26, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xff3326, transparent: true, opacity: 0.9 }));
    b.position.set(-8 + 4.2, 7.5, -50 + 3.2);
    ctx.beaconMats.push(b.material as THREE.MeshBasicMaterial);
    ctx.group.add(b);
    return g;
  }, 0, 'wall');

  // вторая печь поменьше
  ctx.addColliderBlock(-19, -46, 6, 6, 5.5, false, () => {
    const g = new THREE.Group();
    g.add(ctx.box(6, 5.5, 6, structMat.clone()));
    const grille = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.8, 0.25), glow());
    grille.position.set(0, 2, 3.1);
    g.add(grille);
    return g;
  }, 0, 'wall');

  // разливочный ковш
  ctx.addColliderBlock(1, -46, 4.5, 4.5, 4, false, () => {
    const g = new THREE.Group();
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 1.7, 4, 12), structMat.clone());
    pot.position.y = 2; pot.castShadow = true; pot.receiveShadow = true;
    g.add(pot);
    const melt = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 0.3, 12), glow());
    melt.position.y = 4.1;
    g.add(melt);
    return g;
  }, 0, 'wall');

  // каналы расплава по полу (визуально)
  const moltenMat = () => {
    const m = new THREE.MeshBasicMaterial({
      color: 0xff6a10, transparent: true, opacity: 0.55,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    ctx.moltenMats.push(m);
    return m;
  };
  const ch1 = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 8), moltenMat());
  ch1.rotation.x = -Math.PI / 2;
  ch1.position.set(-8, 0.05, -41.5);
  ctx.group.add(ch1);
  const ch2 = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 1.1), moltenMat());
  ch2.rotation.x = -Math.PI / 2;
  ch2.position.set(-4.5, 0.06, -45.8);
  ctx.group.add(ch2);
  const ch3 = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 5.5), moltenMat());
  ch3.rotation.x = -Math.PI / 2;
  ch3.position.set(-18.8, 0.05, -40.4);
  ctx.group.add(ch3);

  // тёплые источники света в литейке
  const l1 = new THREE.PointLight(0xff6a15, 320, 34, 1.9);
  l1.position.set(-8, 5, -47);
  ctx.group.add(l1);
  const l2 = new THREE.PointLight(0xff8a30, 160, 24, 1.9);
  l2.position.set(1, 3.5, -45);
  ctx.group.add(l2);
}
