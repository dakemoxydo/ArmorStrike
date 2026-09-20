/**
 * Cel-shading покрытие зданий на всех картах.
 *
 * Производственный путь (`Arena.box` / `Arena.addColliderBlock` + страховочный
 * проход `applyCelShadingToObject` в `buildArena`) обязан заводить каждый
 * MeshStandardMaterial арены в комикс-конвейер — иначе здания выбиваются
 * из cel-стиля танков. Пин строит все 3 карты через настоящий `Arena`
 * и требует флаг cel на каждом стандартном материале группы.
 */
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { Arena } from '../game/Arena';
import { isCelShaded } from '../game/shaders/celShading';
import type { MapId } from '../game/maps/mapCatalog';

// ── headless canvas stub (текстурные фабрики требуют 2d-контекст) ──────────
// Та же форма, что в factoryMap/cityMap-тестах: любой 2d-вызов — no-op.
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

function collectStandardMaterials(group: THREE.Object3D): Set<THREE.MeshStandardMaterial> {
  const out = new Set<THREE.MeshStandardMaterial>();
  group.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      const list = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of list) {
        if (m instanceof THREE.MeshStandardMaterial) out.add(m);
      }
    }
  });
  return out;
}

describe.each([['factory'], ['city'], ['village']] as [MapId][])(
  'arena cel-shading — карта %s',
  (mapId) => {
    it('все MeshStandardMaterial зданий/декора имеют cel-патч', () => {
      const scene = new THREE.Scene();
      const arena = new Arena(scene, mapId);
      try {
        const mats = collectStandardMaterials(arena.group);
        // Санитарный минимум: на каждой карте десятки литых материалов
        // (корпуса цехов/офисов/домов, крыши, контейнеры, опоры, скайлайн).
        expect(mats.size).toBeGreaterThan(20);
        const withoutCel = [...mats].filter((m) => !isCelShaded(m));
        expect(withoutCel, `карта ${mapId}: ${withoutCel.length} материалов без cel`).toEqual([]);
      } finally {
        arena.dispose(scene);
      }
    });

    it('страховочный проход идемпотентен при rebuild', () => {
      const scene = new THREE.Scene();
      const arena = new Arena(scene, mapId);
      try {
        arena.rebuild(mapId);
        const mats = collectStandardMaterials(arena.group);
        expect(mats.size).toBeGreaterThan(20);
        const withoutCel = [...mats].filter((m) => !isCelShaded(m));
        expect(withoutCel, `карта ${mapId} после rebuild`).toEqual([]);
      } finally {
        arena.dispose(scene);
      }
    });
  },
);
