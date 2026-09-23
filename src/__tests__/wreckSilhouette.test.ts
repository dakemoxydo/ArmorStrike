/**
 * Wreck silhouette contract (Visual_Coherence_Pass п.13 — «остов = тот же
 * корпус»): merged-силуэт hullId/turretId живёт в process-кэше, помечен
 * markShared (поштучный teardown обязан его пропустить), spawn переставляет
 * преаллоцированный слот на геометрию погибшего, а не аллоцирует бокс.
 */
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { hullSilhouette, turretSilhouette, WreckSystem } from '../game/effects/WreckSystem';
import { isShared } from '../game/resources/sharedResources';
import { HULL_IDS, TURRET_IDS } from '../core/catalog';

// ── headless canvas stub (smokeTexture needs a 2d context) ─────────────────
const ctx2d = new Proxy(
  {},
  {
    get(_t, prop) {
      if (prop === 'createRadialGradient' || prop === 'createLinearGradient') {
        return () => ({ addColorStop: () => {} });
      }
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

describe('wreck silhouettes (п.13 — силуэт того же корпуса)', () => {
  it('builds a merged silhouette for every hull and turret id', () => {
    for (const id of HULL_IDS) {
      const g = hullSilhouette(id);
      // Слитый силуэт — сотни вершин; прежний остов-бокс 2.2×0.8×3.4 = 24.
      expect(g.getAttribute('position').count, `hull ${id}`).toBeGreaterThan(50);
      expect(g.boundingSphere, `hull ${id} boundingSphere`).toBeTruthy();
    }
    for (const id of TURRET_IDS) {
      const g = turretSilhouette(id);
      expect(g.getAttribute('position').count, `turret ${id}`).toBeGreaterThan(30);
    }
  });

  it('memoizes silhouettes per id and marks them shared', () => {
    const a = hullSilhouette('hunter');
    expect(hullSilhouette('hunter')).toBe(a);
    expect(isShared(a)).toBe(true);

    const t = turretSilhouette('railgun');
    expect(turretSilhouette('railgun')).toBe(t);
    expect(isShared(t)).toBe(true);

    // Разные id — разные инстансы (кэш по ключу, не глобальный синглтон).
    expect(hullSilhouette('mammoth')).not.toBe(a);
  });

  it('spawn swaps the preallocated slot onto the fallen hull geometry', () => {
    const scene = new THREE.Scene();
    const wrecks = new WreckSystem(scene);
    wrecks.spawn(new THREE.Vector3(1, 0, 2), 0.5, 0xf59e0b, 'mammoth', 'gauss');

    // Слот 0 — первая добавленная группа; hull mesh — её первый ребёнок.
    const slot = scene.children.find(
      (o): o is THREE.Group => o instanceof THREE.Group && o.visible,
    );
    expect(slot).toBeTruthy();
    const hull = slot!.children[0] as THREE.Mesh;
    expect(hull.geometry).toBe(hullSilhouette('mammoth'));
    const turret = slot!.children[1] as THREE.Mesh;
    expect(turret.geometry).toBe(turretSilhouette('gauss'));

    wrecks.dispose();
  });
});
