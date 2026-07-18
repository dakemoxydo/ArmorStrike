import { describe, it, expect } from 'vitest';
import { botsForWave } from '../game/constants';
import { previewWaveComposition, tallyWeapons, WAVE_BUFF_OPTIONS } from '../game/wavePreview';

describe('wavePreview', () => {
  it('preview length matches botsForWave', () => {
    for (const w of [1, 2, 3, 5, 10]) {
      expect(previewWaveComposition(w)).toHaveLength(botsForWave(w));
    }
  });

  it('tally sums to unit count', () => {
    const units = previewWaveComposition(4);
    const tally = tallyWeapons(units);
    expect(tally.reduce((s, t) => s + t.count, 0)).toBe(units.length);
    expect(tally.every((t) => t.count > 0)).toBe(true);
  });

  it('buff options are three distinct ids', () => {
    expect(WAVE_BUFF_OPTIONS.map((o) => o.id).sort()).toEqual(
      ['damage', 'reload', 'speed'].sort(),
    );
  });
});
