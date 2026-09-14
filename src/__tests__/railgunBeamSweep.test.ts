import { describe, it, expect, vi } from 'vitest';
import { BeamSweep, type BeamSweepEvent } from '../game/weapons/railgunBeamSweep';

/** Собирает длину из setLength-колбэка (то, что идёт в beamFx.setLength). */
function collectLengths(sweep: BeamSweep, dt: number, steps: number): number[] {
  const lens: number[] = [];
  for (let i = 0; i < steps; i++) {
    if (sweep.step(dt, (len) => lens.push(len))) break;
  }
  return lens;
}

describe('BeamSweep (M20 running beam front)', () => {
  it('events fire in distance order as the front passes them', () => {
    const order: string[] = [];
    const events: BeamSweepEvent[] = [
      { d: 60, run: () => order.push('b') },
      { d: 20, run: () => order.push('a') },
    ];
    const sweep = new BeamSweep(120, 2400, events);
    // Один шаг = 2400*0.016 = 38.4 юнита: пройден только d=20.
    expect(sweep.step(0.016, () => {})).toBe(false);
    expect(order).toEqual(['a']);
    // Второй шаг — фронт на 76.8: пройден и d=60.
    sweep.step(0.016, () => {});
    expect(order).toEqual(['a', 'b']);
  });

  it('each event fires exactly once', () => {
    const run = vi.fn();
    const sweep = new BeamSweep(100, 2400, [{ d: 50, run }]);
    for (let i = 0; i < 10 && !sweep.step(0.016, () => {}); i++) { /* шагаем */ }
    // добиваем до конца
    sweep.step(1, () => {});
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('length grows monotonically to total, then reports done', () => {
    const sweep = new BeamSweep(120, 2400, []);
    const lens = collectLengths(sweep, 0.016, 20);
    expect(lens.length).toBeGreaterThan(1);
    for (let i = 1; i < lens.length; i++) expect(lens[i]).toBeGreaterThanOrEqual(lens[i - 1]);
    expect(lens[lens.length - 1]).toBeCloseTo(120, 5);
    // Фронт дошёл — следующий шаг не требуется (done вернул true на последнем).
    expect(sweep.step(0.016, () => {})).toBe(true);
  });

  it('a huge dt fires every passed event and completes in one step', () => {
    const a = vi.fn();
    const b = vi.fn();
    const sweep = new BeamSweep(50, 2400, [{ d: 10, run: a }, { d: 48, run: b }]);
    const lens: number[] = [];
    expect(sweep.step(5, (len) => lens.push(len))).toBe(true);
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
    expect(lens[lens.length - 1]).toBe(50);
  });

  it('events past total are clamped onto the terminus and still fire', () => {
    const run = vi.fn();
    // Стена ровно на total; случайный pierce за пределами — зажимается.
    const sweep = new BeamSweep(30, 2400, [{ d: 999, run }]);
    let done = false;
    while (!done) done = sweep.step(0.016, () => {});
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('a near-zero sweep (sub-muzzle shot) still fires its wall event', () => {
    const run = vi.fn();
    const sweep = new BeamSweep(2, 2400, [{ d: 2, run }]);
    expect(sweep.step(0.016, () => {})).toBe(true);
    expect(run).toHaveBeenCalledTimes(1);
  });
});
