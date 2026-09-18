import { describe, it, expect } from 'vitest';
import { getAtmosphere, ATMOSPHERES } from '../game/atmospherePresets';
import { MAP_IDS } from '../game/maps/mapCatalog';

describe('atmospherePresets', () => {
  it('покрывает все карты каталога', () => {
    for (const id of MAP_IDS) {
      expect(ATMOSPHERES[id], `нет пресета для ${id}`).toBeDefined();
    }
  });

  it('city = Comic Metropolis Noon (яркий лазурный полдень)', () => {
    const c = getAtmosphere('city');
    expect(c.background).toBe(0x4a8ebb);
    expect(c.rimColor).toBe(0x60c8ff);
    expect(c.exposure).toBe(1.15);
  });

  it('factory = Comic Industrial Sunset (графичный янтарный закат), отличима от city', () => {
    const f = getAtmosphere('factory');
    const c = getAtmosphere('city');
    expect(f).not.toEqual(c);
    expect(f.background).toBe(0x382216);
    expect(f.rimColor).toBe(0xff7b22);
    // закатная дымка плотнее чистого полуденного воздуха города
    expect(f.fogNear).toBeLessThan(c.fogNear);
    expect(f.hemiSky).not.toBe(c.hemiSky);
    expect(f.sunColor).not.toBe(c.sunColor);
  });

  it('village = Comic Pastoral Daylight (свежий солнечный день)', () => {
    const v = getAtmosphere('village');
    const f = getAtmosphere('factory');
    expect(v.sunColor).not.toBe(f.sunColor);
    expect(v.rimColor).not.toBe(f.rimColor);
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

  it('exposure values match documented tuning', () => {
    expect(getAtmosphere('factory').exposure).toBe(1.18);
    expect(getAtmosphere('city').exposure).toBe(1.15);
    expect(getAtmosphere('village').exposure).toBe(1.20);
  });
});
