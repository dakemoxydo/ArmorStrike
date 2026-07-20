import { describe, it, expect } from 'vitest';
import { botAiForWave, SCORE } from '../game/constants';

describe('bot AI / score constants (post-wave)', () => {
  it('botAiForWave: aimError сужается, sightRange стабилен', () => {
    const w1 = botAiForWave(1);
    const w5 = botAiForWave(5);
    expect(w1.sightRange).toBe(46);
    expect(w5.sightRange).toBe(46);
    expect(w5.aimError).toBeLessThan(w1.aimError);
    expect(w5.aimError).toBeGreaterThanOrEqual(0.05);
  });

  it('SCORE.kill is fixed', () => {
    expect(SCORE.kill).toBe(100);
  });
});
