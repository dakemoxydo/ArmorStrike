/**
 * Menu stage contract (Visual_Coherence_Pass п.16): в меню/гараже танк
 * стоит на графичном подиуме с Ben-Day, за ним бумажный цикл — не живая
 * арена 300×300 в тумане. Пины: состав сцены (пол/подиум/рим/стена),
 * геометрия под относом PREVIEW_POS, орбиты камеры внутри цикла,
 * memoization stage-текстур.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { MenuStage } from '../game/menuStage';
import { PREVIEW_POS } from '../game/CameraRig';
import { cachedTextureHas } from '../game/textures/shared';
import { stagePaperTexture, podiumTexture } from '../game/textures/stage';

// ── headless canvas stub (texture factories need a 2d context) ─────────────
const gradient = { addColorStop: () => {} };
const ctx2d = new Proxy(
  {},
  {
    get(_t, prop) {
      if (prop === 'createRadialGradient' || prop === 'createLinearGradient') {
        return () => gradient;
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

/** Максимальная орбита garage/menu камеры (CameraRig: garageZoom ≤ 18, menu r = 16). */
const MAX_CAM_ORBIT = 18;
/** Высота подиума (Podium:H = 0.32) — нижняя граница стены ниже пола сцены. */
const PODIUM_DROP = 0.32;

describe('MenuStage (п.16 — подиум, не пустота)', () => {
  let scene: THREE.Scene;
  let stage: MenuStage;

  beforeEach(() => {
    scene = new THREE.Scene();
    stage = new MenuStage(scene);
  });

  it('is hidden by default and mounted on the scene', () => {
    expect(stage.group.visible).toBe(false);
    expect(scene.children).toContain(stage.group);
  });

  it('has exactly the paper stage: floor + podium + ink rim + backdrop', () => {
    expect(stage.group.children).toHaveLength(4);
    const meshes = stage.group.children.filter((o) => o instanceof THREE.Mesh) as THREE.Mesh[];
    // Podium — единственный меш с material-массивом [side, top, bottom].
    const podium = meshes.find((m) => Array.isArray(m.material));
    expect(podium).toBeDefined();
    expect((podium!.material as THREE.Material[])).toHaveLength(3);
  });

  it('podium top sits exactly at PREVIEW_POS (tank stands on the disc)', () => {
    const meshes = stage.group.children.filter((o) => o instanceof THREE.Mesh) as THREE.Mesh[];
    const podium = meshes.find((m) => Array.isArray(m.material))!;
    const params = (podium.geometry as THREE.CylinderGeometry).parameters;
    expect(podium.position.y + params.height / 2).toBeCloseTo(PREVIEW_POS.y, 5);
    // Радиус перекрывает footprint любого корпуса (max ≈ 6 м с башней).
    expect(params.radiusTop).toBeGreaterThanOrEqual(6);
  });

  it('backdrop cyclorama encloses every camera orbit (r ≤ 18) with margin', () => {
    const meshes = stage.group.children.filter((o) => o instanceof THREE.Mesh) as THREE.Mesh[];
    // Стена — открытый цилиндр (BackSide), пол — CircleGeometry.
    const wall = meshes.find((m) => m.material instanceof THREE.MeshBasicMaterial
      && !Array.isArray(m.material)
      && (m.material as THREE.MeshBasicMaterial).side === THREE.BackSide)!;
    const params = (wall.geometry as THREE.CylinderGeometry).parameters;
    expect(params.radiusTop).toBeGreaterThan(MAX_CAM_ORBIT);
    // Вертикальный охват: от пола сцены до предельного ракурса garage (cam y ≈ 41).
    const bottom = wall.position.y - params.height / 2;
    const top = wall.position.y + params.height / 2;
    expect(bottom).toBeLessThan(PREVIEW_POS.y - PODIUM_DROP);
    expect(top).toBeGreaterThan(41);
    expect((wall.material as THREE.MeshBasicMaterial).fog).toBe(false);
  });

  it('toggles visibility with setVisible and unmounts on dispose', () => {
    stage.setVisible(true);
    expect(stage.group.visible).toBe(true);
    stage.dispose();
    expect(scene.children).not.toContain(stage.group);
  });

  it('memoizes stage textures under keyed cache entries', () => {
    // beforeEach уже построил сцену — обе ключевые записи обязаны быть в кэше.
    expect(cachedTextureHas('stage:podium')).toBe(true);
    expect(cachedTextureHas('stage:paper:8x8')).toBe(true);
    expect(cachedTextureHas('stage:paper:10x4')).toBe(true);
    // Мемоизация: повторный запрос — тот же инстанс (markShared для teardown).
    expect(stagePaperTexture(8, 8)).toBe(stagePaperTexture(8, 8));
    expect(podiumTexture()).toBe(podiumTexture());
  });
});
