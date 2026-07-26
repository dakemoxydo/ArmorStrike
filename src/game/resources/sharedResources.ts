// ===== Реестр общих (process-lifetime) GPU-ресурсов =====
// Клоны Three.js (`Object3D.clone`) переиспользуют ссылки на geometry/texture
// мастера. Такой ресурс нельзя освобождать при dispose одного экземпляра —
// он ещё нужен кэшу и другим живым клонам.
//
// Владелец (AssetManager, texture-кэш) помечает ресурс `markShared`; поштучный
// teardown (`disposeObject3D`, Tank.dispose) пропускает помеченное.
import type * as THREE from 'three';

type Shared = THREE.BufferGeometry | THREE.Material | THREE.Texture;

const shared = new WeakSet<object>();

/** Пометить ресурс как общий; возвращает его же для inline-использования. */
export function markShared<T extends Shared>(res: T): T {
  shared.add(res);
  return res;
}

/** true → ресурсом владеет кэш, поштучный dispose обязан его пропустить. */
export function isShared(res: object | null | undefined): boolean {
  return !!res && shared.has(res);
}

/** Снять пометку — только для владельца, который сам освобождает ресурс. */
export function unmarkShared(res: Shared): void {
  shared.delete(res);
}
