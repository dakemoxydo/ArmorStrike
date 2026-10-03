/**
 * Утечка per-instance GPU-буферов при teardown арены.
 *
 * `InstancedMesh.dispose()` диспатчит `dispose` → `WebGLObjects.onInstancedMeshDispose`
 * → `attributes.remove(instanceMatrix/instanceColor)` + `bindingStates.releaseStatesOfObject()`
 * (VAO). `geometry.dispose()` эти буферы НЕ трогает: GL_ARRAY_BUFFER на пару
 * (инстанс, программа) переживает dispose геометрии и живёт до конца процесса.
 * Карты создают InstancedMesh ~30 раз (деревья, кусты, тростник, столбы, окна, стёкла),
 * а `GameModeController.executeStartRound` зовёт `Arena.rebuild` на каждом старте
 * раунда — то есть без `InstancedMesh.dispose()` каждый раунд навсегда терял
 * 15–30 буферов. `Game.dispose()` утекал по финальной арене так же.
 *
 * Пин двумя слоями:
 *  1. синтетическое поддерево — паритет с канонической `disposeObject3D`
 *     (на которую Arena теперь делегирует) + контрольный кейс «только
 *     geometry.dispose()»;
 *  2. сквозной прогон настоящего `Arena.rebuild` / `Arena.dispose` на всех трёх
 *     картах: каждый InstancedMesh группы обязан получить `dispose`.
 */
import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { Arena } from '../game/Arena';
import { disposeObject3D } from '../game/resources/disposeObject3D';
import { markShared, isShared } from '../game/resources/sharedResources';
import { cachedTexture, cachedTextureHas, makeCanvas, toTexture } from '../game/textures/shared';
import { MAP_IDS, type MapId } from '../game/maps/mapCatalog';

// ── headless canvas stub (текстурные фабрики требуют 2d-контекст) ──────────
// Та же форма, что в arenaCelShading/factoryMap-тестах: любой 2d-вызов — no-op.
const gradient = { addColorStop: () => {} };
const ctx2d = new Proxy(
  {},
  {
    get(_t, prop) {
      if (prop === 'createRadialGradient' || prop === 'createLinearGradient') {
        return () => gradient;
      }
      if (prop === 'canvas') return { width: 0, height: 0 };
      return () => {};
    },
    set() {
      return true;
    },
  },
);
(globalThis as Record<string, unknown>).document = {
  createElement: (tag: string) =>
    tag === 'canvas' ? { width: 0, height: 0, getContext: () => ctx2d } : undefined,
};

/** Счётчик 'dispose'-событий на ресурсе three (geometry/material/texture). */
function watchDispose(o: THREE.BufferGeometry | THREE.Material | THREE.Texture): () => number {
  let n = 0;
  o.addEventListener('dispose', () => { n += 1; });
  return () => n;
}

/**
 * Счётчик прямых вызовов InstancedMesh.dispose(): в типах three у InstancedMesh
 * нет события 'dispose' (оно есть только у ресурсов), поэтому пин на сам метод —
 * spy вызывает оригинал, так что runtime-путь (dispatch → WebGLObjects) сохраняется.
 */
function spyInstancedDispose(im: THREE.InstancedMesh): () => number {
  const spy = vi.spyOn(im, 'dispose');
  return () => spy.mock.calls.length;
}

/**
 * Поддерево в духе арены: инстанс на per-arena ресурсах + обычный меш на
 * process-shared геометрии/материале + спрайт на закэшированной текстуре.
 */
function makeSubtree() {
  const root = new THREE.Group();
  const wrap = new THREE.Group();

  const instGeo = new THREE.BoxGeometry(1, 1, 1);
  const instMat = new THREE.MeshStandardMaterial({ color: 0x445566 });
  const inst = new THREE.InstancedMesh(instGeo, instMat, 64);
  inst.setColorAt(0, new THREE.Color(0x88ff88)); // аллоцирует instanceColor
  const instDisposals = spyInstancedDispose(inst);

  const sharedGeo = markShared(new THREE.BoxGeometry(1, 1, 1));
  const sharedMat = markShared(new THREE.MeshStandardMaterial({ color: 0x223344 }));
  const plain = new THREE.Mesh(sharedGeo, sharedMat);

  // Спрайты арены (дым ArenaEffects) носят текстуры из кэша textures/shared.ts.
  const { c } = makeCanvas(4);
  const sharedTex = cachedTexture('arena-dispose-test', () => toTexture(c));
  const spriteMat = new THREE.SpriteMaterial({ map: sharedTex });

  wrap.add(inst, plain, new THREE.Sprite(spriteMat));
  root.add(wrap);

  return {
    root,
    inst,
    instGeo,
    instMat,
    sharedGeo,
    sharedMat,
    spriteMat,
    sharedTex,
    instDisposals,
    geoDisposals: watchDispose(instGeo),
    matDisposals: watchDispose(instMat),
    sharedGeoDisposals: watchDispose(sharedGeo),
    sharedMatDisposals: watchDispose(sharedMat),
    spriteMatDisposals: watchDispose(spriteMat),
    texDisposals: watchDispose(sharedTex),
  };
}

/** Все InstancedMesh поддерева + счётчик вызовов dispose() на каждом. */
function watchInstancedMeshes(root: THREE.Object3D) {
  const meshes: THREE.InstancedMesh[] = [];
  root.traverse((o) => {
    if (o instanceof THREE.InstancedMesh) meshes.push(o);
  });
  const counters = meshes.map((m) => spyInstancedDispose(m));
  return { meshes, disposedCount: () => counters.filter((c) => c() > 0).length };
}

describe('teardown арены: InstancedMesh.dispose()', () => {
  it('dispose геометрии НЕ освобождает per-instance буферы', () => {
    // Контрольный кейс, фиксирующий причину утечки: без InstancedMesh.dispose()
    // ни VAO, ни instanceMatrix в WebGLObjects/WebGLBindingStates не трогаются.
    const { root, inst, instGeo, instDisposals, geoDisposals } = makeSubtree();
    instGeo.dispose();

    expect(geoDisposals()).toBe(1);
    expect(instDisposals(), 'geometry.dispose() не заменяет InstancedMesh.dispose()').toBe(0);

    // Субдерево остаётся в сцене — утилита снимает ресурсы, но не вынимает объекты.
    expect(root.children).toHaveLength(1);
    expect(inst.parent).not.toBeNull();
  });

  it('disposeObject3D зовёт InstancedMesh.dispose() (паритет с путём арены)', () => {
    const f = makeSubtree();

    disposeObject3D(f.root);

    expect(f.instDisposals(), 'per-instance буферы/VAO должны освободиться').toBe(1);
    expect(f.geoDisposals()).toBe(1);
    expect(f.matDisposals()).toBe(1);
    expect(f.spriteMatDisposals(), 'материал спрайта — per-arena, освобождаем').toBe(1);
  });

  it('shared-ресурсы и текстурный кэш переживают teardown', () => {
    const f = makeSubtree();
    expect(isShared(f.sharedGeo)).toBe(true);
    expect(isShared(f.sharedMat)).toBe(true);
    expect(isShared(f.sharedTex)).toBe(true);

    disposeObject3D(f.root);

    expect(f.sharedGeoDisposals()).toBe(0);
    expect(f.sharedMatDisposals()).toBe(0);
    expect(f.texDisposals(), 'кэш textures/shared.ts живёт до конца процесса').toBe(0);
    expect(cachedTextureHas('arena-dispose-test')).toBe(true);
    expect(f.spriteMat.map).toBe(f.sharedTex);
  });
});

describe.each(MAP_IDS.map((id) => [id] as [MapId]))(
  'Arena teardown — карта %s',
  (mapId) => {
    it('rebuild освобождает InstancedMesh прошлой карты', () => {
      const scene = new THREE.Scene();
      const arena = new Arena(scene, mapId);
      try {
        const before = watchInstancedMeshes(arena.group);
        expect(before.meshes.length, `карта ${mapId}: инстансы должны быть`).toBeGreaterThan(0);

        arena.rebuild(mapId);

        expect(before.disposedCount()).toBe(before.meshes.length);
        // Новая карта тоже инстансная (rebuild безусловный на каждый раунд).
        const after = watchInstancedMeshes(arena.group);
        expect(after.meshes.length).toBeGreaterThan(0);
      } finally {
        arena.dispose(scene);
      }
    });

    it('dispose(scene) освобождает InstancedMesh финальной арены', () => {
      const scene = new THREE.Scene();
      const arena = new Arena(scene, mapId);
      const before = watchInstancedMeshes(arena.group);
      expect(before.meshes.length).toBeGreaterThan(0);

      arena.dispose(scene);

      expect(before.disposedCount()).toBe(before.meshes.length);
      expect(arena.group.children).toHaveLength(0);
    });
  },
);