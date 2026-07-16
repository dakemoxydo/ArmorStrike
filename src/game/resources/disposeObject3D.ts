// ===== Утилита освобождения ресурсов Three.js =====
// Единая реализация траверса объекта с dispose геометрии и материалов.
// Заменяет дублирующийся код в Tank.dispose, Arena.damageBlock, Game.update3DPreview.
import * as THREE from 'three';

/** Освобождает геометрию и материалы всех мешей в поддереве (без удаления из родителя). */
export function disposeObject3D(root: THREE.Object3D): void {
  root.traverse((o) => {
    const disposeMats = (mat: THREE.Material | THREE.Material[]) => {
      const list = Array.isArray(mat) ? mat : [mat];
      for (const m of list) {
        const anyMat = m as unknown as { map?: THREE.Texture | null };
        if (anyMat.map) anyMat.map.dispose();
        m.dispose();
      }
    };

    if (o instanceof THREE.Mesh || o instanceof THREE.InstancedMesh || o instanceof THREE.Points) {
      o.geometry.dispose();
      disposeMats(o.material);
    } else if (o instanceof THREE.Sprite) {
      disposeMats(o.material);
    }
  });
}
