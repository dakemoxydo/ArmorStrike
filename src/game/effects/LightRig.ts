// ===== LightRig: constant PointLight budget for the whole scene =====
//
// Why this exists: the number of lights in a scene is part of three's shader
// program cache key (`WebGLPrograms.getProgramCacheKey` -> `numPointLights`).
// Any `scene.add(light)` / `scene.remove(light)` bumps `lights.state.version`
// (WebGLLights), and on the next frame EVERY material with `needsLights`
// rebuilds its program key in `WebGLRenderer.setProgram`. When the light count
// actually changes, the material switches to another shader program — and the
// first time a combination appears the GLSL is compiled synchronously inside
// the frame (tens to hundreds of ms).
//
// So dynamic combat lights must never enter or leave the scene. The rig creates
// a fixed set of PointLights once, keeps them attached forever (intensity 0 =
// off) and hands them out through static channels. The light count is then a
// constant, every material keeps a single program, and all compilation happens
// once in `RenderWorld.warmUp()`.
import * as THREE from 'three';

export type LightChannel = 'flash' | 'beam' | 'flame';

/**
 * Channel capacities. Trade-off: a permanently attached light costs a little
 * per-fragment work, while changing the light count costs a program rebuild for
 * every lit material plus a possible mid-frame compile — orders of magnitude
 * worse. Capacities match the previous per-effect maxima.
 */
export const LIGHT_CHANNEL_CAPACITY: Readonly<Record<LightChannel, number>> = {
  /** Concurrent muzzle / impact / explosion flashes. */
  flash: 4,
  /** Railgun beam: muzzle + impact. Shared by all railgun instances. */
  beam: 2,
  /** Flamethrower muzzle light. Shared by all flamethrower instances. */
  flame: 1,
};

const CHANNELS = Object.keys(LIGHT_CHANNEL_CAPACITY) as LightChannel[];

/** Default falloff distance; clients may override per write. */
const DEFAULT_DISTANCE = 14;

export class LightRig {
  private readonly lights = new Map<LightChannel, THREE.PointLight[]>();

  constructor(private readonly scene: THREE.Scene) {
    for (const channel of CHANNELS) {
      const list: THREE.PointLight[] = [];
      for (let i = 0; i < LIGHT_CHANNEL_CAPACITY[channel]; i++) {
        const light = new THREE.PointLight(0xffffff, 0, DEFAULT_DISTANCE, 2);
        // Never shadow-casting: a shadow-casting light would add its own
        // shadow map pass per frame and a shadow-count change in the key.
        light.castShadow = false;
        scene.add(light);
        list.push(light);
      }
      this.lights.set(channel, list);
    }
  }

  /**
   * Light of a channel. `index` is clamped to the channel capacity, so callers
   * can use a local pool index without knowing the rig layout.
   */
  light(channel: LightChannel, index = 0): THREE.PointLight {
    const list = this.lights.get(channel);
    if (!list || list.length === 0) {
      throw new Error(`LightRig: unknown channel "${channel}"`);
    }
    return list[Math.min(Math.max(index, 0), list.length - 1)];
  }

  /** Turn a light on: position, color, intensity, falloff distance. */
  set(
    channel: LightChannel,
    index: number,
    pos: THREE.Vector3,
    color: number,
    intensity: number,
    distance: number = DEFAULT_DISTANCE,
  ): void {
    const light = this.light(channel, index);
    light.position.copy(pos);
    light.color.setHex(color);
    light.distance = distance;
    light.intensity = intensity;
  }

  /** Turn a light off without detaching it (the light count must not change). */
  off(channel: LightChannel, index: number): void {
    this.light(channel, index).intensity = 0;
  }

  /** Extinguish every channel (round start / mode change). Scene stays as is. */
  clear(): void {
    for (const list of this.lights.values()) {
      for (const light of list) light.intensity = 0;
    }
  }

  /** Detach and release every light — only for full teardown. */
  dispose(): void {
    for (const list of this.lights.values()) {
      for (const light of list) {
        this.scene.remove(light);
        light.dispose();
      }
      list.length = 0;
    }
    this.lights.clear();
  }
}
