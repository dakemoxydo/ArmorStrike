import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class AssetManager {
  private loader = new GLTFLoader();
  private cache = new Map<string, THREE.Object3D>();

  /**
   * Load a GLTF/GLB model. Returns a cloned copy from cache or a new clone.
   */
  async load(url: string): Promise<THREE.Group> {
    if (this.cache.has(url)) {
      // Deep clone so each tank can get unique materials/transforms
      return this.cache.get(url)!.clone(true) as THREE.Group;
    }

    return new Promise((resolve, reject) => {
      this.loader.load(
        url,
        (gltf) => {
          const scene = gltf.scene;
          // Cache a clean master; always return a clone to callers
          this.cache.set(url, scene);
          resolve(scene.clone(true) as THREE.Group);
        },
        undefined,
        (error) => {
          console.error(`Failed to load model ${url}:`, error);
          reject(error);
        },
      );
    });
  }

  /**
   * Clear cache (e.g. on scene dispose or hot reload)
   */
  clearCache() {
    this.cache.clear();
  }
}

/** Singleton for easy import */
export const assetManager = new AssetManager();
