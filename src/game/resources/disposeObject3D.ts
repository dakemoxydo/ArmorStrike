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
  root.traverse((o) => {
    const disposeMats = (mat: THREE.Material | THREE.Material[]) => {
      const list = Array.isArray(mat) ? mat : [mat];
      for (const m of list) {
        if (!m || isShared(m)) continue;
        const anyMat = m as unknown as { map?: THREE.Texture | null };
        if (anyMat.map && !isShared(anyMat.map)) anyMat.map.dispose();
        m.dispose();
      }
    };

    if (o instanceof THREE.Mesh || o instanceof THREE.InstancedMesh || o instanceof THREE.Points) {
      if (o.geometry && !isShared(o.geometry)) o.geometry.dispose();
      disposeMats(o.material);
    } else if (o instanceof THREE.Sprite) {
      disposeMats(o.material);
    }
  });
}
