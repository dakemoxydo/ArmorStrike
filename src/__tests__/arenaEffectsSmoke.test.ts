import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { ArenaEffects } from '../game/ArenaEffects';
import { smokeTexture } from '../game/textures/effects';

/**
 * ArenaEffects smoke-pool coverage (audit H-4 remainder):
 *  - spawn throttle (0.13 s cadence, one puff per due tick)
 *  - dead-slot reuse BEFORE pool growth (no unbounded sprite creation)
 *  - eviction beyond 44 slots: oldest sprite removed + material disposed,
 *    while the SHARED smoke map stays alive (material.dispose() must not
 *    free the cached texture)
 *  - resetForRebuild detaches everything and clears emitters
 *
 * Tuning note: with the current 0.13 s cadence and 3.2..4.8 s lifetimes,
 * peak concurrency is ~37 puffs, so the >44 eviction guard is defensive
 * only — it cannot fire through update(). We drive spawnStackSmoke
 * directly (private, but compile-time-only) to pin its contract.
 */

/** Minimal 2d context so CanvasTexture + smokeTexture() work in node vitest. */
function stubCanvas() {
  const ctx = {
    createRadialGradient: () => ({ addColorStop: () => {} }),
    fillStyle: '' as string | CanvasGradient,
    fillRect: () => {},
    clearRect: () => {},
    strokeStyle: '',
    lineWidth: 0,
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    arc: () => {},
    fill: () => {},
    stroke: () => {},
    setTransform: () => {},
  };
  const base: Record<string, unknown> =
    typeof document === 'undefined' ? {} : { ...document };
  vi.stubGlobal('document', {
    ...base,
    createElement: (tag: string, options?: ElementCreationOptions) => {
      if (tag === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: () => ctx,
        } as unknown as HTMLCanvasElement;
      }
      return base.createElement
        ? (base.createElement as (t: string, o?: ElementCreationOptions) => HTMLElement)(tag, options)
        : undefined;
    },
  });
}

function spritesIn(group: THREE.Group): THREE.Sprite[] {
  return group.children.filter((c): c is THREE.Sprite => c instanceof THREE.Sprite);
}

describe('ArenaEffects smoke pool', () => {
  let group: THREE.Group;
  let fx: ArenaEffects;
  let matDispose: ReturnType<typeof vi.spyOn>;
  const p = new THREE.Vector3(0, 2, 0);

  beforeEach(() => {
    stubCanvas();
    group = new THREE.Group();
    fx = new ArenaEffects(group);
    matDispose = vi.spyOn(THREE.SpriteMaterial.prototype, 'dispose');
  });

  afterEach(() => {
    matDispose.mockRestore();
    vi.unstubAllGlobals();
  });

  /** Direct access to the private spawner (eviction guard is unreachable via update). */
  function spawn(n: number) {
    const spawner = (fx as unknown as { spawnStackSmoke: (p: THREE.Vector3) => void })
      .spawnStackSmoke;
    for (let i = 0; i < n; i++) spawner.call(fx, p);
  }

  it('update throttles spawns to one puff per 0.13 s tick', () => {
    fx.smokeEmitters.push(new THREE.Vector3(0, 6, 0));

    fx.update(0.01, 0);
    expect(spritesIn(group)).toHaveLength(1);

    // Two sub-threshold ticks: no second puff yet
    fx.update(0.05, 0);
    fx.update(0.05, 0);
    expect(spritesIn(group)).toHaveLength(1);

    // Crossing 0.13 s since last spawn -> exactly one more
    fx.update(0.05, 0);
    expect(spritesIn(group)).toHaveLength(2);
  });

  it('reuses dead slots before creating new sprites (pool does not grow)', () => {
    spawn(8);
    expect(spritesIn(group)).toHaveLength(8);
    const firstBatch = [...spritesIn(group)];

    // Burn all lifetimes down (max life 4.8 s)
    fx.update(10, 0);
    for (const s of spritesIn(group)) {
      expect((s.material as THREE.SpriteMaterial).opacity).toBe(0);
    }

    spawn(8);

    const secondBatch = spritesIn(group);
    expect(secondBatch).toHaveLength(8); // reused, not grown
    for (const s of firstBatch) {
      expect(secondBatch).toContain(s); // same sprite objects recycled
    }
  });

  it('evicts the oldest slot past 44 and frees its material but never the shared map', () => {
    const tex = smokeTexture();
    const texDispose = vi.spyOn(tex, 'dispose');

    spawn(50);

    const live = spritesIn(group);
    expect(live).toHaveLength(44); // capped, not 50

    // Oldest sprite was removed from the scene...
    spawn(1);
    const after = spritesIn(group);
    expect(after).toHaveLength(44);

    // ...its material was disposed (>=1 call: the evicted slot)
    expect(matDispose.mock.calls.length).toBeGreaterThanOrEqual(1);

    // Every live material still points at the ONE shared texture, untouched
    const maps = new Set(after.map((s) => (s.material as THREE.SpriteMaterial).map));
    expect(maps.size).toBe(1);
    expect([...maps][0]).toBe(tex);
    expect(texDispose).not.toHaveBeenCalled();

    texDispose.mockRestore();
  });

  it('resetForRebuild detaches all smoke sprites, clears emitters, allows fresh respawn', () => {
    fx.smokeEmitters.push(new THREE.Vector3(0, 6, 0));
    spawn(5);
    expect(spritesIn(group)).toHaveLength(5);
    const disposeCallsBefore = matDispose.mock.calls.length;

    fx.resetForRebuild();

    expect(spritesIn(group)).toHaveLength(0);
    expect(fx.smokeEmitters).toHaveLength(0);
    expect(matDispose.mock.calls.length - disposeCallsBefore).toBe(5);

    // Emitters cleared -> update must not respawn
    fx.update(1, 0);
    expect(spritesIn(group)).toHaveLength(0);

    // Fresh emitters -> pool rebuilds from zero
    fx.smokeEmitters.push(new THREE.Vector3(1, 6, 1));
    fx.update(1, 0);
    expect(spritesIn(group)).toHaveLength(1);
  });
});
