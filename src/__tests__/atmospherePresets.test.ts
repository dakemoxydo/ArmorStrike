import { describe, it, expect } from 'vitest';
import { getAtmosphere, ATMOSPHERES } from '../game/atmospherePresets';
import { MAP_IDS } from '../game/maps/mapCatalog';

describe('atmospherePresets', () => {
  it('покрывает все карты каталога', () => {
    for (const id of MAP_IDS) {
      expect(ATMOSPHERES[id], `нет пресета для ${id}`).toBeDefined();
    }
  });

  it('city = legacy cold night (нулевой регресс)', () => {
    const c = getAtmosphere('city');
    expect(c.background).toBe(0x060a12);
    expect(c.rimColor).toBe(0x2ee6c0);
    expect(c.exposure).toBe(0.92);
  });

  it('factory = натриевая смога-ночь, отличима от city', () => {
    const f = getAtmosphere('factory');
    const c = getAtmosphere('city');
    expect(f).not.toEqual(c);
    expect(f.background).toBe(0x0d0b08);
    expect(f.rimColor).toBe(0xff8c30);
    // смог плотнее ночного воздуха города
    expect(f.fogNear).toBeLessThan(c.fogNear);
    // тёплый key против холодного города
    expect(f.hemiSky).not.toBe(c.hemiSky);
    expect(f.sunColor).not.toBe(c.sunColor);
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

  // Absolute pins: exposure values were globally retuned in 14478e1
  // (NIGHT 1.08->0.92, DUSK 1.14->1.0); GDD now documents 1.0. Pin them so
  // accidental drift in either direction fails loudly.
  it('exposure values match documented tuning', () => {
    expect(getAtmosphere('factory').exposure).toBe(0.95);
    expect(getAtmosphere('city').exposure).toBe(0.92);
    expect(getAtmosphere('village').exposure).toBe(1.0);
  });
});
