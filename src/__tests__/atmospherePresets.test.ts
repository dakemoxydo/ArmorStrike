import { describe, it, expect } from 'vitest';
import { getAtmosphere, ATMOSPHERES } from '../game/atmospherePresets';
import { MAP_IDS } from '../game/maps/mapCatalog';

describe('atmospherePresets', () => {
  it('покрывает все карты каталога', () => {
    for (const id of MAP_IDS) {
      expect(ATMOSPHERES[id], `нет пресета для ${id}`).toBeDefined();
    }
  });

  it('factory и city = legacy cold night (нулевой регресс)', () => {
    const f = getAtmosphere('factory');
    const c = getAtmosphere('city');
    expect(f).toEqual(c);
    expect(f.background).toBe(0x060a12);
    expect(f.rimColor).toBe(0x2ee6c0);
  });

  it('village = тёплый golden-hour dusk (солнце ниже factory)', () => {
    const v = getAtmosphere('village');
    const f = getAtmosphere('factory');
    // ниже солнце → длинные тени
    expect(v.sunPosition[1]).toBeLessThan(f.sunPosition[1]);
    // теплее key/rim
    expect(v.sunColor).not.toBe(f.sunColor);
    expect(v.rimColor).not.toBe(f.rimColor);
    // экспозиция поднята под закат
    expect(v.exposure).toBeGreaterThan(f.exposure);
  });

  it('значения в валидных диапазонах', () => {
    for (const id of MAP_IDS) {
      const p = getAtmosphere(id);
      expect(p.fogFar).toBeGreaterThan(p.fogNear);
      expect(p.exposure).toBeGreaterThan(0);
      expect(p.sunIntensity).toBeGreaterThan(0);
      expect(p.sunPosition).toHaveLength(3);
      expect(p.skyZenith).toHaveLength(3);
      expect(p.skyHorizon).toHaveLength(3);
      expect(p.skySunDir).toHaveLength(3);
    }
  });
});
