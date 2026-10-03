/**
 * Пресет `low` больше не платит дополнительным проходом сцены за тени, которые
 * физически не разрешают силуэт танка, и теневой камере реально соответствует
 * заявленный объём (±SHADOW_EXTENT).
 *
 * Регрессия 1: 512² на ±170 м = ~0.66 м/тексель — вдвое грубее medium и при
 * pixelRatioMax 1 кадр всё равно не прорисует силуэт (танк ~3.6 м ≈ 5 текселей).
 * Регрессия 2 (three.js pitfall): left/right/top/bottom ортокамеры теней
 * пересчитываются ТОЛЬКО в updateProjectionMatrix() — без него камера остаётся
 * на дефолтных ±5 м и карта пишет пустоту; medium 0.33 м/тексель,
 * high 0.17 м/тексель — силуэт читается.
 *
 * Конструктору RenderWorld нужен WebGL, поэтому инстанс собирается через
 * Object.create с минимальными заглушками приватных полей (TS `private` —
 * только compile-time, поля пишутся через Reflect.set).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { QUALITY_PRESETS, type QualityLevel } from '../game/graphicsQuality';
import { RenderWorld } from '../game/RenderWorld';

const SHADOW_EXTENT = 170;

interface World {
  rw: RenderWorld;
  renderer: { shadowMap: { enabled: boolean }; setPixelRatio: (r: number) => void; dispose: () => void };
  sun: THREE.DirectionalLight;
  /** Материалы сцены — на них смотрит перекомпиляция при смене shadows. */
  materials: THREE.MeshLambertMaterial[];
  shadowMapTex: { disposed: boolean; dispose: () => void };
}

function makeWorld(level: QualityLevel, shadowsEnabled: boolean): World {
  const materials = [new THREE.MeshLambertMaterial(), new THREE.MeshLambertMaterial()];
  const shadowMapTex = { disposed: false, dispose: () => { shadowMapTex.disposed = true; } };
  const renderer = {
    shadowMap: { enabled: shadowsEnabled },
    setPixelRatio: vi.fn(),
    dispose: vi.fn(),
  };
  const sun = new THREE.DirectionalLight(0xffffff, 1);
  sun.shadow.mapSize.set(QUALITY_PRESETS.high.shadowMapSize, QUALITY_PRESETS.high.shadowMapSize);
  sun.shadow.map = shadowMapTex as unknown as THREE.WebGLRenderTarget;

  const rw = Object.create(RenderWorld.prototype) as RenderWorld;
  Reflect.set(rw, 'quality', level);
  Reflect.set(rw, 'renderer', renderer);
  Reflect.set(rw, 'sun', sun);
  Reflect.set(rw, 'camera', {});
  Reflect.set(rw, 'scene', {
    traverse: (cb: (o: unknown) => void) => {
      for (const material of materials) cb({ material });
    },
  });

  return { rw, renderer, sun, materials, shadowMapTex };
}

describe('graphicsQuality — тени по пресетам', () => {
  it('low выключает тени, medium/high их держат', () => {
    expect(QUALITY_PRESETS.low.shadows).toBe(false);
    expect(QUALITY_PRESETS.medium.shadows).toBe(true);
    expect(QUALITY_PRESETS.high.shadows).toBe(true);
  });
});

describe('RenderWorld.applyQuality — тени и проекция теневой камеры', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { devicePixelRatio: 2, innerWidth: 1280, innerHeight: 720 });
  });

  it('переключение на low гасит тени и форсит перекомпиляцию материалов', () => {
    const { rw, renderer, sun, materials } = makeWorld('high', true);
    const before = materials.map((m) => m.version);

    rw.applyQuality(QUALITY_PRESETS.low);

    expect(renderer.shadowMap.enabled).toBe(false);
    expect(sun.castShadow).toBe(false);
    // three.js не перекомпилирует уже собранные lit-программы сам — applyQuality
    // обязан поставить needsUpdate, иначе флаг не действует визуально.
    materials.forEach((m, i) => expect(m.version).toBeGreaterThan(before[i]));
  });

  it('возврат на medium включает тени обратно и тоже перекомпилирует', () => {
    const { rw, renderer, sun, materials } = makeWorld('low', false);
    const before = materials.map((m) => m.version);

    rw.applyQuality(QUALITY_PRESETS.medium);

    expect(renderer.shadowMap.enabled).toBe(true);
    expect(sun.castShadow).toBe(true);
    materials.forEach((m, i) => expect(m.version).toBeGreaterThan(before[i]));
  });

  it('applyShadowExtent реально пересчитывает ортопроекцию теневой камеры', () => {
    const { rw, sun } = makeWorld('high', true);
    const sc = sun.shadow.camera as THREE.OrthographicCamera;
    // Дефолт three.js: ±5 м — конфиг границ без updateProjectionMatrix мёртв.
    expect(sc.projectionMatrix.elements[0]).toBeCloseTo(2 / 10, 5);

    // Конструктор RenderWorld зовёт этот же метод (приватный — зовём по ссылке).
    (rw as unknown as { applyShadowExtent: () => void }).applyShadowExtent();

    expect(sc.left).toBe(-SHADOW_EXTENT);
    expect(sc.right).toBe(SHADOW_EXTENT);
    expect(sc.top).toBe(SHADOW_EXTENT);
    expect(sc.bottom).toBe(-SHADOW_EXTENT);
    expect(sc.near).toBe(10);
    expect(sc.far).toBe(420);
    // Проекция соответствует заявленным границам: 2/(right-left) и -2/(far-near).
    expect(sc.projectionMatrix.elements[0]).toBeCloseTo(2 / (2 * SHADOW_EXTENT), 6);
    expect(sc.projectionMatrix.elements[5]).toBeCloseTo(2 / (2 * SHADOW_EXTENT), 6);
    expect(sc.projectionMatrix.elements[10]).toBeCloseTo(-2 / (420 - 10), 6);
  });

  it('low отключает тени, medium/high держат (0.33 и 0.17 м/тексель)', () => {
    const texel = (mapSize: number) => (2 * SHADOW_EXTENT) / mapSize;
    // Танк ~3.6 м: medium/high попадают в силуэт, 512² по арене — в 2× грубее
    // medium (и при pixelRatioMax 1 этот кадр всё равно не прорисует деталь),
    // поэтому low не платит за лишний проход сцены.
    expect(texel(QUALITY_PRESETS.medium.shadowMapSize)).toBeLessThan(0.5);
    expect(texel(QUALITY_PRESETS.high.shadowMapSize)).toBeLessThan(0.2);
    expect(texel(QUALITY_PRESETS.low.shadowMapSize)).toBeCloseTo(0.664, 2);
    expect(texel(QUALITY_PRESETS.low.shadowMapSize)).toBeGreaterThan(
      texel(QUALITY_PRESETS.medium.shadowMapSize),
    );
    expect(QUALITY_PRESETS.low.shadows).toBe(false);
  });

  it('смена размера карты по-прежнему диспозит старую текстуру', () => {
    const { rw, sun, shadowMapTex } = makeWorld('high', true);
    expect(sun.shadow.mapSize.x).toBe(QUALITY_PRESETS.high.shadowMapSize);

    rw.applyQuality(QUALITY_PRESETS.low);

    expect(sun.shadow.mapSize.x).toBe(QUALITY_PRESETS.low.shadowMapSize);
    expect(shadowMapTex.disposed).toBe(true);
    expect(sun.shadow.map).toBeNull();
  });
});