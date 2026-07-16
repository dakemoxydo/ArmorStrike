import * as THREE from 'three';
import type { HullId } from '../../core/catalog';
import type { TankBuildContext } from './context';

export function buildHull(ctx: TankBuildContext, hullId: HullId) {
  const { hull, bodyMat, metalMat, trackMat, lampMat } = ctx;

  if (hullId === 'viking') {
    // === ВИКИНГ: Низкий, широкий и стремительный ===
    const trW = 0.95, trH = 0.82, trL = 4.6;
    for (const side of [-1, 1]) {
      const tr = new THREE.Mesh(new THREE.BoxGeometry(trW, trH, trL), trackMat);
      tr.position.set(side * 1.55, 0.42, 0);
      hull.add(tr);
      const fender = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.08, 4.7), metalMat);
      fender.position.set(side * 1.55, 0.88, 0);
      hull.add(fender);
    }
    const base = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.55, 4.2), bodyMat);
    base.position.y = 0.75;
    hull.add(base);
    const upper = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.42, 3.2), bodyMat);
    upper.position.set(0, 1.22, -0.1);
    hull.add(upper);
    const glacis = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.48, 1.4), bodyMat);
    glacis.position.set(0, 0.98, 2.0);
    glacis.rotation.x = -0.62;
    hull.add(glacis);
    const exhaust = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.28, 0.6), metalMat);
    exhaust.position.set(0, 1.35, -1.95);
    hull.add(exhaust);
    for (const side of [-1, 1]) {
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.1, 0.08), lampMat);
      lamp.position.set(side * 1.0, 0.92, 2.55);
      lamp.rotation.x = -0.6;
      hull.add(lamp);
    }
  } else if (hullId === 'mammoth') {
    // === МАМОНТ: Огромный, бронированный монолит ===
    const trW = 1.15, trH = 1.1, trL = 4.9;
    for (const side of [-1, 1]) {
      const tr = new THREE.Mesh(new THREE.BoxGeometry(trW, trH, trL), trackMat);
      tr.position.set(side * 1.7, 0.55, 0);
      hull.add(tr);
      const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.75, 4.8), metalMat);
      skirt.position.set(side * 2.3, 0.7, 0);
      hull.add(skirt);
      const fender = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.14, 5.0), bodyMat);
      fender.position.set(side * 1.7, 1.15, 0);
      hull.add(fender);
    }
    const base = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.92, 4.4), bodyMat);
    base.position.y = 1.15;
    hull.add(base);
    const upper = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.65, 3.4), bodyMat);
    upper.position.set(0, 1.88, -0.1);
    hull.add(upper);
    const plow = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.85, 0.6), metalMat);
    plow.position.set(0, 0.95, 2.35);
    plow.rotation.x = -0.2;
    hull.add(plow);
    for (const side of [-1, 1]) {
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.1), lampMat);
      lamp.position.set(side * 1.1, 1.45, 2.35);
      hull.add(lamp);
    }
  } else {
    // === ХАНТЕР: Классический универсальный ===
    const trW = 0.85, trH = 0.95, trL = 4.6;
    for (const side of [-1, 1]) {
      const tr = new THREE.Mesh(new THREE.BoxGeometry(trW, trH, trL), trackMat);
      tr.position.set(side * 1.4, 0.48, 0);
      hull.add(tr);
      const fender = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.1, 4.7), metalMat);
      fender.position.set(side * 1.4, 1.0, 0);
      hull.add(fender);
    }
    const base = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.75, 4.0), bodyMat);
    base.position.y = 0.95;
    hull.add(base);
    const upper = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.55, 3.0), bodyMat);
    upper.position.set(0, 1.55, -0.15);
    hull.add(upper);
    const glacis = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.6, 1.1), bodyMat);
    glacis.position.set(0, 1.25, 1.95);
    glacis.rotation.x = -0.5;
    hull.add(glacis);
    const rear = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.4, 0.7), metalMat);
    rear.position.set(0, 1.75, -1.85);
    hull.add(rear);
    for (const side of [-1, 1]) {
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.14, 0.08), lampMat);
      lamp.position.set(side * 0.8, 1.15, 2.48);
      lamp.rotation.x = -0.5;
      hull.add(lamp);
    }
  }
}
