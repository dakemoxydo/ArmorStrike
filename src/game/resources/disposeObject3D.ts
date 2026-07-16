// ===== Утилита освобождения ресурсов Three.js =====
// Единая реализация траверса объекта с dispose геометрии и материалов.
// Заменяет дублирующийся код в Tank.dispose, Arena.damageBlock, Game.update3DPreview.
import * as THREE from 'three';

/** Освобождает геометрию и материалы всех мешей в поддереве (без удаления из родителя). */
export function disposeObject3D(root: THREE.Object3D): void {
  root.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.geometry.dispose();
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) m.dispose();
    }
  });
}
