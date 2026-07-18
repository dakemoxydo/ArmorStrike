import { describe, it, expect } from 'vitest';
import { applyWaveBuff, clearWaveBuff } from '../game/waveBuffs';
import type { BuffableTank } from '../game/tank/simPorts';

function mockPlayer(over: Partial<BuffableTank> = {}): BuffableTank {
  return {
    boostDrainMul: 1,
    boostRechargeMul: 1,
    reloadSpeedMul: 1,
    buffBase: null,
    params: {
      damage: 40,
      speed: 15,
      reverseSpeed: 9,
      turnSpeed: 2.5,
      shotCooldown: 0.28,
    },
    ...over,
  };
}

describe('waveBuffs (combat)', () => {
  it('damage buff multiplies params.damage and restores on clear', () => {
    const p = mockPlayer();
    applyWaveBuff(p, 'damage');
    expect(p.params.damage).toBe(50);
    expect(p.buffBase?.damage).toBe(40);
    clearWaveBuff(p);
    expect(p.params.damage).toBe(40);
    expect(p.buffBase).toBeNull();
  });

  it('speed buff scales move and turn', () => {
    const p = mockPlayer();
    applyWaveBuff(p, 'speed');
    expect(p.params.speed).toBeCloseTo(18, 5);
    expect(p.params.reverseSpeed).toBeCloseTo(10.8, 5);
    expect(p.params.turnSpeed).toBeCloseTo(2.5 * 1.15, 5);
    clearWaveBuff(p);
    expect(p.params.speed).toBe(15);
  });

  it('reload buff sets reloadSpeedMul and shortens shotCooldown', () => {
    const p = mockPlayer();
    applyWaveBuff(p, 'reload');
    expect(p.reloadSpeedMul).toBeCloseTo(1 / 0.7, 5);
    expect(p.params.shotCooldown).toBeCloseTo(0.28 * 0.7, 5);
    clearWaveBuff(p);
    expect(p.reloadSpeedMul).toBe(1);
    expect(p.params.shotCooldown).toBe(0.28);
  });

  it('applying a second buff replaces the first', () => {
    const p = mockPlayer();
    applyWaveBuff(p, 'damage');
    applyWaveBuff(p, 'speed');
    expect(p.params.damage).toBe(40);
    expect(p.params.speed).toBeCloseTo(18, 5);
  });
});
