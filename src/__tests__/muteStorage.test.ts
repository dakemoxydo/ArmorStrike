import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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
    try {
      fx.setMuted(true);
      expect(loadMuted()).toBe(true);
      expect(new AudioFX().muted).toBe(true);
      fx.setMuted(false);
      expect(loadMuted()).toBe(false);
      expect(new AudioFX().muted).toBe(false);
    } finally {
      fx.dispose();
    }
  });

  it('cross-tab storage syncs audio.muted so HudModel kill-feed icon stops lying', () => {
    // Пин источником: слушатель обязан жить в audio.ts (синк audio.muted),
    // иконка kill-feed идёт через HudModel (target.muted = audio.muted).
    const audioSrc = readFileSync(resolve(__dirname, '../game/audio.ts'), 'utf8');
    expect(audioSrc).toMatch(/addEventListener\('storage'/);
    expect(audioSrc).toMatch(/MUTE_LS_KEY/);
    expect(audioSrc).toMatch(/this\.muted = m|this\.muted=m/);
    const hudSrc = readFileSync(resolve(__dirname, '../game/HudModel.ts'), 'utf8');
    expect(hudSrc).toMatch(/target\.muted = audio\.muted/);
  });

  it('storage event flips a live instance without localStorage round-trip', () => {
    const handlers = new Map<string, (e: unknown) => void>();
    const win = {
      addEventListener: vi.fn((type: string, fn: (e: unknown) => void) => {
        handlers.set(type, fn);
      }),
      removeEventListener: vi.fn((type: string) => {
        handlers.delete(type);
      }),
    };
    vi.stubGlobal('window', win);
    const fx = new AudioFX();
    try {
      expect(fx.muted).toBe(false);
      handlers.get('storage')?.({ key: 'as2_muted', newValue: '1' });
      expect(fx.muted).toBe(true);
      handlers.get('storage')?.({ key: 'as2_muted', newValue: '0' });
      expect(fx.muted).toBe(false);
      // чужой ключ игнорируется
      handlers.get('storage')?.({ key: 'as2_other', newValue: '1' });
      expect(fx.muted).toBe(false);
    } finally {
      fx.dispose();
      vi.unstubAllGlobals();
    }
  });
});
