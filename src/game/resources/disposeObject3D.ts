// ===== Утилита освобождения ресурсов Three.js =====
// Единая реализация траверса объекта с dispose геометрии и материалов.
// Заменяет дублирующийся код в Tank.dispose, Arena.damageBlock, Game.update3DPreview.
//
// Общие ресурсы (мастера GLB из AssetManager) помечены `markShared` и
// пропускаются: их переиспользуют другие клоны, освобождает их владелец кэша.
import * as THREE from 'three';
import { isShared } from './sharedResources';

/** Освобождает геометрию и материалы всех мешей в поддереве (без удаления из родителя). */
export function disposeObject3D(root: THREE.Object3D): void {
  // Дедуп через Set (конвенция disposeArenaSubtree в Arena.ts): shared-но-не-markShared
  // геометрия/материал (один wMat на 4 стены, один lampMat на 14 фонарей) иначе
  // диспозились бы N раз — лишние dispose-ивенты на общем инстансе.
  const geos = new Set<THREE.BufferGeometry>();
  const mats = new Set<THREE.Material>();
  const instanced: THREE.InstancedMesh[] = [];

  root.traverse((o) => {
    if (o instanceof THREE.Mesh || o instanceof THREE.InstancedMesh || o instanceof THREE.Points) {
      if (o.geometry) geos.add(o.geometry);
      // InstancedMesh.dispose() освобождает instanceMatrix/instanceColor —
      // geometry.dispose() их не трогает, без этого GPU-буферы утекали
      // при каждом rebuild арены. Сам меш не shared (shared — только
      // geometry/material/texture), диспоз всегда безопасен.
      if (o instanceof THREE.InstancedMesh) instanced.push(o);
      const list = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of list) {
        if (m) mats.add(m);
      }
    } else if (o instanceof THREE.Sprite) {
      if (o.material) mats.add(o.material);
    }
  });

  for (const im of instanced) im.dispose();
  for (const g of geos) {
    if (!isShared(g)) g.dispose();
  }
  const maps = new Set<THREE.Texture>();
  for (const m of mats) {
    if (isShared(m)) continue;
    const anyMat = m as unknown as { map?: THREE.Texture | null };
    if (anyMat.map) maps.add(anyMat.map);
    m.dispose();
  }
  for (const t of maps) {
    if (!isShared(t)) t.dispose();
  }
}
