import { describe, it, expect, beforeAll, vi } from 'vitest';
import * as THREE from 'three';
import { smokeTexture } from '../game/textures/effects';
import { SmokeSystem } from '../game/effects/SmokeSystem';

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
    stroke: () => {},
  };
  const realCreate = document.createElement.bind(document);
  vi.stubGlobal('document', {
    ...document,
    createElement: (tag: string, options?: ElementCreationOptions) => {
      if (tag === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: () => ctx,
        } as unknown as HTMLCanvasElement;
      }
      return realCreate(tag, options);
    },
  });
}

describe('smokeTexture cache + SmokeSystem pool', () => {
  beforeAll(() => {
    // jsdom may be absent; ensure document exists for texture factory.
    if (typeof document === 'undefined') {
      vi.stubGlobal('document', {
        createElement: () => {
          throw new Error('unexpected createElement');
        },
      });
    }
    stubCanvas();
  });

  it('smokeTexture returns the same CanvasTexture instance (no per-call canvas)', () => {
    const a = smokeTexture();
    const b = smokeTexture();
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(THREE.CanvasTexture);
  });

  it('SmokeSystem preallocates a fixed pool and never adds more sprites on spawn', () => {
    const scene = new THREE.Scene();
    const smoke = new SmokeSystem(scene);
    const spritesBefore = scene.children.filter((c) => c instanceof THREE.Sprite).length;
    expect(spritesBefore).toBe(42);

    const p = new THREE.Vector3(1, 2, 3);
    smoke.spawn(p, 20, 1.2, true);
    smoke.spawn(p, 30, 1.0, false);
    // Cap is 42 — must not grow scene with new sprites
    const spritesAfter = scene.children.filter((c) => c instanceof THREE.Sprite).length;
    expect(spritesAfter).toBe(42);

    const active = scene.children.filter(
      (c) => c instanceof THREE.Sprite && c.visible,
    ).length;
    expect(active).toBe(42); // full pool in use after 50 requests

    // Life out → hidden, still pooled (not removed)
    for (let i = 0; i < 200; i++) smoke.update(0.1);
    const stillInScene = scene.children.filter((c) => c instanceof THREE.Sprite).length;
    expect(stillInScene).toBe(42);
    const stillVisible = scene.children.filter(
      (c) => c instanceof THREE.Sprite && c.visible,
    ).length;
    expect(stillVisible).toBe(0);

    smoke.dispose();
    expect(scene.children.filter((c) => c instanceof THREE.Sprite)).toHaveLength(0);
  });

  it('spawn reuses shared smoke map on materials (no unique map per puff)', () => {
    const scene = new THREE.Scene();
    const smoke = new SmokeSystem(scene);
    smoke.spawn(new THREE.Vector3(), 5, 1.2, false);
    const maps = new Set(
      scene.children
        .filter((c): c is THREE.Sprite => c instanceof THREE.Sprite && c.visible)
        .map((s) => (s.material as THREE.SpriteMaterial).map),
    );
    expect(maps.size).toBe(1);
    expect([...maps][0]).toBe(smokeTexture());
    smoke.dispose();
  });
});
