import * as THREE from 'three';
import type { TurretId } from '../../core/catalog';
import type { TankBuildContext } from './context';

export function buildTurret(ctx: TankBuildContext, turretId: TurretId) {
  const { turret, turretMat, metalMat, barrelGroup, muzzle } = ctx;

  if (turretId === 'flamethrower') {
    // === ОГНЕМЁТ ===
    const tBase = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.35, 0.55, 12), turretMat);
    tBase.position.y = 0.15;
    turret.add(tBase);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1.05, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), turretMat);
    dome.position.set(0, 0.35, -0.1);
    turret.add(dome);
    const can1 = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 1.0, 10), metalMat);
    can1.rotation.z = Math.PI / 2;
    can1.position.set(-0.55, 0.7, -0.95);
    turret.add(can1);
    const can2 = can1.clone();
    can2.position.set(0.55, 0.7, -0.95);
    turret.add(can2);

    barrelGroup.position.set(0, 0.4, 0.45);
    turret.add(barrelGroup);
    for (const side of [-0.22, 0.22]) {
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 1.6, 10), metalMat);
      pipe.rotation.x = Math.PI / 2;
      pipe.position.set(side, 0, 0.8);
      barrelGroup.add(pipe);
      const ringGlow = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.14, 0.15, 10),
        new THREE.MeshBasicMaterial({ color: 0xff6600 }),
      );
      ringGlow.rotation.x = Math.PI / 2;
      ringGlow.position.set(side, 0, 1.55);
      barrelGroup.add(ringGlow);
    }
    muzzle.position.z = 1.75;
    barrelGroup.add(muzzle);

  } else if (turretId === 'cannon') {
    // === ПУШКА «СМОКИ» ===
    const tBase = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.35, 0.5, 10), turretMat);
    tBase.position.y = 0.12;
    turret.add(tBase);
    const tTop = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.65, 2.1), turretMat);
    tTop.position.set(0, 0.6, -0.15);
    turret.add(tTop);
    const hatch = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.4, 0.16, 10), metalMat);
    hatch.position.set(-0.35, 0.98, -0.5);
    turret.add(hatch);

    barrelGroup.position.set(0, 0.55, 0.5);
    turret.add(barrelGroup);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 2.1, 12), metalMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.z = 1.05;
    barrelGroup.add(barrel);
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.3, 0.7, 10), metalMat);
    sleeve.rotation.x = Math.PI / 2;
    sleeve.position.z = 0.35;
    barrelGroup.add(sleeve);
    muzzle.position.z = 2.15;
    barrelGroup.add(muzzle);

  } else {
    // === РЕЛЬСОТРОН ===
    const tBase = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.25, 0.5, 10), turretMat);
    tBase.position.y = 0.12;
    turret.add(tBase);
    const tTop = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.55, 2.0), turretMat);
    tTop.position.set(0, 0.55, -0.15);
    turret.add(tTop);
    const hatch = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.38, 0.16, 10), metalMat);
    hatch.position.set(-0.3, 0.9, -0.5);
    turret.add(hatch);

    barrelGroup.position.set(0, 0.5, 0.55);
    turret.add(barrelGroup);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 2.9, 10), metalMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.z = 1.45;
    barrelGroup.add(barrel);
    const brake = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.55), metalMat);
    brake.position.z = 2.85;
    barrelGroup.add(brake);

    // Материал энергорельсов ствола с контролируемым emissiveIntensity
    ctx.railGlowMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      emissive: new THREE.Color(ctx.style.glow),
      emissiveIntensity: 0.15,
      roughness: 0.2,
      metalness: 0.8,
    });
    const railGlow = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 2.5), ctx.railGlowMat);
    railGlow.position.set(0, 0.14, 1.3);
    barrelGroup.add(railGlow);
    muzzle.position.z = 3.2;
    barrelGroup.add(muzzle);
  }
}
