import * as THREE from 'three';
import type { HullId, TurretId } from '../constants';
import { camoTexture, trackTexture } from '../textures';
import type { TankStyle, TankVisual } from '../Tank';
import type { TankBuildContext } from './context';
import { buildHull } from './hull';
import { buildTurret } from './turret';

export function buildTankMesh(
  style: TankStyle,
  hullId: HullId = 'hunter',
  turretId: TurretId = 'railgun',
): TankVisual {
  const group = new THREE.Group();
  const hull = new THREE.Group();
  group.add(hull);

  const bodyMats: THREE.MeshStandardMaterial[] = [];
  const bodyMat = new THREE.MeshStandardMaterial({
    map: camoTexture(style.body, style.dark, style.light),
    roughness: 0.5, metalness: 0.45, emissive: 0x000000,
  });
  bodyMats.push(bodyMat);
  const turretMat = bodyMat.clone();
  turretMat.map = camoTexture(style.light, style.body, style.dark);
  bodyMats.push(turretMat);
  const metalMat = new THREE.MeshStandardMaterial({
    color: style.accent, roughness: 0.35, metalness: 0.75,
  });
  bodyMats.push(metalMat);

  const lampMat = new THREE.MeshBasicMaterial({ color: style.glow });

  const trackTex = trackTexture();
  const trackMat = new THREE.MeshStandardMaterial({
    map: trackTex, roughness: 0.9, metalness: 0.15,
  });

  const turret = new THREE.Group();
  const turretY = hullId === 'viking' ? 1.5 : hullId === 'mammoth' ? 2.3 : 1.9;
  turret.position.set(0, turretY, -0.1);
  hull.add(turret);

  const barrelGroup = new THREE.Group();
  const muzzle = new THREE.Object3D();

  const ctx: TankBuildContext = {
    style, bodyMats, bodyMat, turretMat, metalMat,
    lampMat, trackTex, trackMat,
    group, hull, turret, barrelGroup, muzzle,
    railGlowMat: undefined,
  };

  buildHull(ctx, hullId);
  buildTurret(ctx, turretId);

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
      color: style.glow, transparent: true, opacity: 0.65,
      side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending,
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

  return { group, hull, turret, barrelGroup, muzzle, ring, bodyMats, trackTex, railGlowMat: ctx.railGlowMat };
}
