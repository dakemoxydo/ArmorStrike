import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AudioFX, loadMuted } from '../game/audio';

describe('mute persistence (G2)', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => { store.set(k, v); },
      removeItem: (k: string) => { store.delete(k); },
      clear: () => store.clear(),
    });
  });

  it('default unmuted when empty', () => {
    expect(loadMuted()).toBe(false);
    expect(new AudioFX().muted).toBe(false);
  });

  it('setMuted persists and fresh instance picks it up', () => {
    const fx = new AudioFX();
    fx.setMuted(true);
    expect(loadMuted()).toBe(true);
    expect(new AudioFX().muted).toBe(true);
    fx.setMuted(false);
    expect(loadMuted()).toBe(false);
    expect(new AudioFX().muted).toBe(false);
  });
});
