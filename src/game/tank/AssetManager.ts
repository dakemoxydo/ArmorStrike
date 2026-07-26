import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { markShared, unmarkShared } from '../resources/sharedResources';

/**
 * Process-lifetime кэш GLTF-моделей.
 *
 * Владение ресурсами:
 * - **geometry / texture** мастера — общие, помечены `markShared`, живут в кэше;
 *   поштучный `disposeObject3D` их не трогает, освобождает только `clearCache`.
 * - **material** — клонируется на каждый экземпляр, потому что per-tank FX
 *   (hit-flash, death fade, damage darkening) пишут в `color` / `emissive`.
 *   Без этого все танки на одной модели мигали бы синхронно.
 */
export class AssetManager {
  private loader = new GLTFLoader();
  private cache = new Map<string, THREE.Object3D>();
  /** In-flight загрузки: параллельные запросы одного url делят один fetch. */
  private pending = new Map<string, Promise<THREE.Object3D>>();

  /**
   * Load a GLTF/GLB model. Returns an instance with its own materials;
   * geometry and textures stay shared with the cached master.
   */
  async load(url: string): Promise<THREE.Group> {
    const cached = this.cache.get(url);
    if (cached) return this.instantiate(cached);

    const inFlight = this.pending.get(url) ?? this.startLoad(url);
    return this.instantiate(await inFlight);
  }

  private startLoad(url: string): Promise<THREE.Object3D> {
    const job = new Promise<THREE.Object3D>((resolve, reject) => {
      this.loader.load(
        url,
        (gltf) => {
          const master = gltf.scene;
          this.markMasterShared(master);
          this.cache.set(url, master);
          resolve(master);
        },
        undefined,
        (error) => {
          console.error(`Failed to load model ${url}:`, error);
          reject(error);
        },
      );
    });
    // Снимаем из pending в любом исходе, чтобы ошибка не залипала в кэше.
    const cleanup = () => { this.pending.delete(url); };
    job.then(cleanup, cleanup);
    this.pending.set(url, job);
    return job;
  }

  /** Geometry / textures мастера переживают отдельные танки — метим как общие. */
  private markMasterShared(master: THREE.Object3D) {
    master.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      if (o.geometry) markShared(o.geometry);
      for (const m of matsOf(o)) {
        for (const t of texturesOf(m)) markShared(t);
      }
    });
  }

  private instantiate(master: THREE.Object3D): THREE.Group {
    return cloneWithOwnMaterials(master);
  }

  /**
   * Освободить кэш и общие GPU-ресурсы мастеров.
   *
   * Вызывать только когда ни один клон больше не рендерится (полный teardown
   * приложения / HMR) — иначе живые танки останутся с освобождённой геометрией.
   * `Game.dispose()` этого не делает: кэш переживает пересоздание Game.
   */
  clearCache() {
    for (const root of this.cache.values()) {
      root.traverse((o) => {
        if (!(o instanceof THREE.Mesh)) return;
        if (o.geometry) {
          unmarkShared(o.geometry);
          o.geometry.dispose();
        }
        for (const m of matsOf(o)) {
          for (const t of texturesOf(m)) {
            unmarkShared(t);
            t.dispose();
          }
          m.dispose();
        }
      });
    }
    this.cache.clear();
    this.pending.clear();
  }
}

/**
 * Клон поддерева с **собственными материалами**; геометрия и текстуры остаются
 * общими с мастером.
 *
 * `Object3D.clone()` копирует ссылки на материалы, поэтому без этого шага
 * per-tank FX (hit-flash, затемнение по HP, посмертное затухание) применялись бы
 * ко всем танкам на одной модели одновременно.
 */
export function cloneWithOwnMaterials(master: THREE.Object3D): THREE.Group {
  const instance = master.clone(true) as THREE.Group;
  // Один и тот же материал может стоять на нескольких мешах — клонируем раз.
  const remap = new Map<THREE.Material, THREE.Material>();
  const cloneOf = (m: THREE.Material) => {
    let c = remap.get(m);
    if (!c) {
      c = m.clone();
      remap.set(m, c);
    }
    return c;
  };

  instance.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    o.material = Array.isArray(o.material)
      ? o.material.map(cloneOf)
      : cloneOf(o.material);
  });

  return instance;
}

function matsOf(mesh: THREE.Mesh): THREE.Material[] {
  const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  return list.filter((m): m is THREE.Material => !!m);
}

/** Текстурные слоты, встречающиеся в GLTF-материалах. */
function texturesOf(mat: THREE.Material): THREE.Texture[] {
  const std = mat as Partial<THREE.MeshStandardMaterial>;
  const slots = [
    std.map, std.normalMap, std.roughnessMap, std.metalnessMap,
    std.emissiveMap, std.aoMap, std.alphaMap,
  ];
  return slots.filter((t): t is THREE.Texture => !!t);
}

/** Singleton for easy import */
export const assetManager = new AssetManager();
