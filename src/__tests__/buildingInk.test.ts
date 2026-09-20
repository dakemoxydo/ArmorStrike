/**
 * Чернильный outline крупных зданий (Visual_Coherence_Pass п.10).
 *
 * Контур получают только несущие wall-корпуса выше порога (цеха, офисы,
 * дома, амбары, часовня, цистерны): 1–2 inverted-hull шелла на корпус.
 * Мелочь (заборы, бочки, машины, киоски, InstancedMesh-декор) — мимо,
 * иначе census улетит за бюджет +15% DC.
 */
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  attachBuildingInkOutline,
  shouldOutlineBuilding,
  BUILDING_INK_MESH,
  BUILDING_INK_MAX_SHELLS,
  BUILDING_INK_WIDTH,
} from '../game/arena/buildingInk';
import { Arena } from '../game/Arena';
import type { MapId } from '../game/maps/mapCatalog';

// ── headless canvas stub (текстурные фабрики требуют 2d-контекст) ──────────
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

function stdBox(w: number, h: number, d: number): THREE.Mesh {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color: 0x8a96a8, roughness: 0.7, metalness: 0.25 }),
  );
  m.position.y = h / 2;
  return m;
}

function shellsIn(root: THREE.Object3D): THREE.Mesh[] {
  const out: THREE.Mesh[] = [];
  root.traverse((o) => {
    if (o instanceof THREE.Mesh && o.name === BUILDING_INK_MESH) out.push(o);
  });
  return out;
}

describe('shouldOutlineBuilding — селектор крупных wall-корпусов', () => {
  it('берёт цех/офис/дом: wall + габариты выше порога', () => {
    expect(shouldOutlineBuilding('wall', 30, 18, 9.5)).toBe(true); // цех завода
    expect(shouldOutlineBuilding('wall', 18, 18, 15)).toBe(true); // офис города
    expect(shouldOutlineBuilding('wall', 16, 13, 7.5)).toBe(true); // дом деревни
  });
  it('берёт высокие тонкие доминанты (труба ТЭЦ, силос, ноги крана)', () => {
    expect(shouldOutlineBuilding('wall', 6.4, 6.4, 20)).toBe(true); // дымовая труба
    expect(shouldOutlineBuilding('wall', 7, 7, 12)).toBe(true); // силос
    expect(shouldOutlineBuilding('wall', 2.6, 2.6, 13)).toBe(true); // нога портала крана
  });
  it('режет мелочь: заборы, киоски, машины, контейнеры', () => {
    expect(shouldOutlineBuilding('wall', 6.5, 6.5, 3.4)).toBe(false); // колодец (низкий)
    expect(shouldOutlineBuilding('block', 11.4, 4.6, 6.4)).toBe(false); // стек контейнеров
    expect(shouldOutlineBuilding('block', 4.0, 1.9, 1.55)).toBe(false); // машина
    expect(shouldOutlineBuilding('ramp', 58, 5.4, 0.2)).toBe(false); // рампа/пути
  });
});

describe('BUILDING_INK_WIDTH — комикс-читаемая толщина', () => {
  it('в sane-диапазоне: толще танкового hairline, без blob-эффекта', () => {
    expect(BUILDING_INK_WIDTH).toBeGreaterThan(0.012); // танковый hairline
    expect(BUILDING_INK_WIDTH).toBeLessThanOrEqual(0.2);
  });
});

describe('attachBuildingInkOutline — шеллы', () => {
  it('вешает 1 шелл на несущую массу, шелл — ребёнок исходника', () => {
    const g = new THREE.Group();
    const body = stdBox(16, 7.5, 13);
    g.add(body);
    const shells = attachBuildingInkOutline(g);
    expect(shells).toHaveLength(1);
    const shell = shells[0];
    expect(shell.parent).toBe(body);
    expect(shell.castShadow).toBe(false);
    expect(shell.receiveShadow).toBe(false);
    const mat = shell.material as THREE.MeshBasicMaterial;
    expect(mat.side).toBe(THREE.BackSide);
    expect(mat.name).toBe('buildingInk');
    expect(shell.renderOrder).toBe((body.renderOrder || 0) - 1);
  });

  it('не трогает мелочь, InstancedMesh, Basic и массивы материалов', () => {
    const g = new THREE.Group();
    const small = stdBox(3, 2, 3);
    g.add(small);
    const inst = new THREE.InstancedMesh(
      new THREE.BoxGeometry(18, 15, 18),
      new THREE.MeshStandardMaterial({ color: 0x7a889c }),
      4,
    );
    g.add(inst);
    const basic = new THREE.Mesh(
      new THREE.BoxGeometry(18, 15, 18),
      new THREE.MeshBasicMaterial({ color: 0x5ec8ff }),
    );
    g.add(basic);
    const multi = new THREE.Mesh(new THREE.BoxGeometry(18, 15, 18), [
      new THREE.MeshStandardMaterial({ color: 0x111111 }),
      new THREE.MeshStandardMaterial({ color: 0x222222 }),
      new THREE.MeshStandardMaterial({ color: 0x333333 }),
      new THREE.MeshStandardMaterial({ color: 0x444444 }),
      new THREE.MeshStandardMaterial({ color: 0x555555 }),
      new THREE.MeshStandardMaterial({ color: 0x666666 }),
    ]);
    g.add(multi);
    expect(attachBuildingInkOutline(g)).toEqual([]);
    expect(shellsIn(g)).toHaveLength(0);
  });

  it(`режет шеллы лимитом ${BUILDING_INK_MAX_SHELLS} на корпус`, () => {
    const g = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const b = stdBox(20, 8, 16);
      b.position.set(i * 30, 4, 0);
      g.add(b);
    }
    const shells = attachBuildingInkOutline(g);
    expect(shells).toHaveLength(BUILDING_INK_MAX_SHELLS);
  });

  it('идемпотентен: повторный проход не дублирует шеллы', () => {
    const g = new THREE.Group();
    g.add(stdBox(16, 7.5, 13));
    expect(attachBuildingInkOutline(g)).toHaveLength(1);
    expect(attachBuildingInkOutline(g)).toHaveLength(0);
    expect(shellsIn(g)).toHaveLength(1);
  });
});

describe.each([['factory'], ['city'], ['village']] as [MapId][])(
  'building ink — карта %s',
  (mapId) => {
    it('крупные здания имеют контур, бюджет в норме', () => {
      const scene = new THREE.Scene();
      const arena = new Arena(scene, mapId);
      try {
        const shells = shellsIn(arena.group);
        // census delta: factory +56 / village +70 / city +48 DC — все < +15%.
        expect(shells.length).toBeGreaterThan(10);
        expect(shells.length).toBeLessThanOrEqual(120);
        // Все шеллы делят один shared-материал (1 шейдерная программа).
        const mats = new Set(shells.map((s) => s.material));
        expect(mats.size).toBe(1);
        for (const s of shells) {
          expect(s.parent).toBeInstanceOf(THREE.Mesh);
          expect(s.castShadow).toBe(false);
        }
      } finally {
        arena.dispose(scene);
      }
    });

    it('rebuild пересоздаёт контур в том же объёме', () => {
      const scene = new THREE.Scene();
      const arena = new Arena(scene, mapId);
      try {
        const before = shellsIn(arena.group).length;
        arena.rebuild(mapId);
        expect(shellsIn(arena.group).length).toBe(before);
      } finally {
        arena.dispose(scene);
      }
    });
  },
);
