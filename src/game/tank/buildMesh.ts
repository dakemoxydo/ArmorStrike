import * as THREE from 'three';
import type { HullId, TurretId } from '../../core/catalog';
import type { TankStyle } from '../../core/types';
import type { TankVisual } from './types';
import { TankFactory } from './TankFactory';

export async function buildTankMesh(
  style: TankStyle,
  hullId: HullId = 'hunter',
  turretId: TurretId = 'railgun',
): Promise<TankVisual> {
  const result = await TankFactory.build(hullId, turretId, style);
  const { hull, turret, group, barrelGroup, muzzle, bodyMats, trackTex } = result;

  // Явно из фабрики: индекс в bodyMats плавает (у model-корпуса впереди мат. модели).
  const metalMat = result.metalMat;
  const lampMat = new THREE.MeshBasicMaterial({ color: style.glow });

  if (style.antenna) {
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 1.5, 6), metalMat);
    ant.position.set(0.72, 1.4, -0.7);
    turret.add(ant);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), lampMat);
    tip.position.set(0.72, 2.15, -0.7);
    turret.add(tip);
  }

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(2.1, 2.5, 36),
    new THREE.MeshBasicMaterial({
      color: style.glow,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.03;
  group.add(ring);

  group.traverse((o) => {
    if (o instanceof THREE.Mesh && o !== ring) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });

  return {
    group,
    hull,
    turret,
    barrelGroup,
    muzzle,
    ring,
    bodyMats,
    // Снимок до первого кадра FX — материалы уже финальные.
    bodyBaseColors: bodyMats.map((m) => m.color.getHex()),
    trackTex,
    railGlowMat: result.railGlowMat,
  };
}
