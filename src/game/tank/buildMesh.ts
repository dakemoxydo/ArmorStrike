import * as THREE from 'three';
import type { HullId, TurretId } from '../../core/catalog';
import type { TankStyle } from '../../core/types';
import type { TankVisual } from './types';
import { TankFactory } from './TankFactory';
import { markShared } from '../resources/sharedResources';

/**
 * Купол респавн-неуязвимости (п.15). Геометрия не зависит от корпуса/башни →
 * одна на процесс (`markShared`), материал — на танк (пульс opacity живой,
 * как у `ring`).
 */
let shieldGeometry: THREE.SphereGeometry | null = null;
function sharedShieldGeometry(): THREE.SphereGeometry {
  if (!shieldGeometry) {
    shieldGeometry = markShared(new THREE.SphereGeometry(2.75, 18, 12));
  }
  return shieldGeometry;
}

export async function buildTankMesh(
  style: TankStyle,
  hullId: HullId = 'hunter',
  turretId: TurretId = 'railgun',
): Promise<TankVisual> {
  const result = await TankFactory.build(hullId, turretId, style);
  const {
    hull, turret, group, barrelGroup, muzzle, bodyMats, trackLeftTex, trackRightTex, trackTex,
  } = result;

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

  // Щит после респавна: рисуем только дальнюю скорлупу (BackSide) аддитивно —
  // танк читается «внутри» пузыря, а не под молочно-белым шаром. Виден только
  // при invulnT > 0 ( TankAnimationSystem ), в покое mesh скрыт → 0 draw call.
  const shield = new THREE.Mesh(
    sharedShieldGeometry(),
    new THREE.MeshBasicMaterial({
      color: style.glow,
      transparent: true,
      opacity: 0,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  shield.position.y = 1.25;
  shield.visible = false;
  group.add(shield);

  group.traverse((o) => {
    if (o instanceof THREE.Mesh && o !== ring && o !== shield) {
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
    shield,
    bodyMats,
    // Снимок до первого кадра FX — материалы уже финальные.
    bodyBaseColors: bodyMats.map((m) => m.color.getHex()),
    trackLeftTex,
    trackRightTex,
    trackTex,
    railGlowMat: result.railGlowMat,
  };
}
