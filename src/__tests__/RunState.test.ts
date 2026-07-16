import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RunState } from '../game/RunState';

describe('RunState', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => { store.set(k, v); },
      removeItem: (k: string) => { store.delete(k); },
      clear: () => store.clear(),
    });
  });

  it('resetRun обнуляет счёт и время', () => {
    const r = new RunState();
    r.score = 100;
    r.kills = 5;
    r.matchTime = 42;
    r.resetRun();
    expect(r.score).toBe(0);
    expect(r.kills).toBe(0);
    expect(r.matchTime).toBe(0);
  });

  it('save/load восстанавливает loadout', () => {
    const a = new RunState();
    a.currentHull = 'mammoth';
    a.currentTurret = 'cannon';
    a.save();

    const b = new RunState();
    b.load();
    expect(b.currentHull).toBe('mammoth');
    expect(b.currentTurret).toBe('cannon');
  });

  it('load игнорирует битый JSON и неизвестные id', () => {
    localStorage.setItem('as2_loadout', '{not json');
    const r = new RunState();
    r.load();
    expect(r.currentHull).toBe('hunter');
    expect(r.currentTurret).toBe('railgun');

    localStorage.setItem('as2_loadout', JSON.stringify({ hullId: 'nope', turretId: 'railgun' }));
    r.load();
    expect(r.currentHull).toBe('hunter');
  });
});
