import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MAP_ID,
  isMapId,
  MAP_IDS,
  MAPS,
} from '../game/maps/mapCatalog';

describe('mapCatalog', () => {
  it('lists factory, village, city', () => {
    expect(MAP_IDS).toEqual(['factory', 'village', 'city']);
    expect(DEFAULT_MAP_ID).toBe('factory');
  });

  it('has complete defs for every map id', () => {
    for (const id of MAP_IDS) {
      const def = MAPS[id];
      expect(def.id).toBe(id);
      expect(def.name.length).toBeGreaterThan(0);
      expect(def.blurb.length).toBeGreaterThan(0);
      expect(def.accent).toMatch(/^#/);
    }
  });

  it('isMapId guards unknown values', () => {
    expect(isMapId('factory')).toBe(true);
    expect(isMapId('village')).toBe(true);
    expect(isMapId('city')).toBe(true);
    expect(isMapId('moon')).toBe(false);
    expect(isMapId(null)).toBe(false);
  });
});
