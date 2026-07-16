import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  QUALITY_PRESETS, loadQuality, saveQuality, nextQuality, getQualityPreset,
} from '../game/graphicsQuality';

describe('graphicsQuality', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => { store.set(k, v); },
      removeItem: (k: string) => { store.delete(k); },
      clear: () => store.clear(),
    });
  });

  it('nextQuality циклит low → medium → high → low', () => {
    expect(nextQuality('low')).toBe('medium');
    expect(nextQuality('medium')).toBe('high');
    expect(nextQuality('high')).toBe('low');
  });

  it('save/load quality', () => {
    saveQuality('low');
    expect(loadQuality()).toBe('low');
    saveQuality('medium');
    expect(loadQuality()).toBe('medium');
  });

  it('default high when empty', () => {
    expect(loadQuality()).toBe('high');
  });

  it('presets: high имеет больший shadow map, чем low', () => {
    expect(QUALITY_PRESETS.high.shadowMapSize).toBeGreaterThan(QUALITY_PRESETS.low.shadowMapSize);
    expect(QUALITY_PRESETS.high.pixelRatioMax).toBeGreaterThan(QUALITY_PRESETS.low.pixelRatioMax);
    expect(getQualityPreset('medium').id).toBe('medium');
  });
});
