import * as THREE from 'three';
import { MODEL_HULL_TARGET_LENGTH } from './TankConfig';

/**
 * Scale imported hull so longest horizontal axis ≈ game tank length,
 * center XZ on origin, plant bottom on Y=0. Returns deck height (bbox max Y).
 */
export function normalizeHullModel(
  model: THREE.Object3D,
  targetLength = MODEL_HULL_TARGET_LENGTH,
): number {
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const longest = Math.max(size.x, size.z, 1e-4);
  const s = targetLength / longest;
  model.scale.multiplyScalar(s);

  model.updateMatrixWorld(true);
  box.setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  model.position.x += -center.x;
  model.position.z += -center.z;
  model.position.y += -box.min.y;

  model.updateMatrixWorld(true);
  box.setFromObject(model);
  return box.max.y;
}

/**
 * Keep author textures/materials from GLB. Enable shadows, sRGB maps,
 * and collect standard materials for hit-flash / invuln FX.
 */
export function prepareTexturedModel(root: THREE.Object3D): THREE.MeshStandardMaterial[] {
  const collected: THREE.MeshStandardMaterial[] = [];
  const seen = new Set<THREE.Material>();

  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    o.castShadow = true;
    o.receiveShadow = true;

    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const mat of mats) {
      if (!mat || seen.has(mat)) continue;
      seen.add(mat);

      if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhysicalMaterial) {
        if (mat.map) mat.map.colorSpace = THREE.SRGBColorSpace;
        if (mat.emissiveMap) mat.emissiveMap.colorSpace = THREE.SRGBColorSpace;
        mat.needsUpdate = true;
        collected.push(mat);
      } else if (mat instanceof THREE.MeshBasicMaterial || mat instanceof THREE.MeshLambertMaterial || mat instanceof THREE.MeshPhongMaterial) {
        if ('map' in mat && mat.map) {
          mat.map.colorSpace = THREE.SRGBColorSpace;
        }
        mat.needsUpdate = true;
      }
    }
  });

  return collected;
}

/** Replace all mesh materials (procedural fallback / untextured placeholder). */
export function applyMaterialToModel(
  root: THREE.Object3D,
  material: THREE.Material,
): void {
  root.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.material = material;
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
}
