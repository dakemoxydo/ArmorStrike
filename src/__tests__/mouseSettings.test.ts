import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadMouseSettings,
  saveMouseSettings,
  DEFAULT_MOUSE_SENSITIVITY,
} from '../ui/mouseSettings';
import { CameraLookState, AIM_SENS_X, AIM_SENS_Y, DEFAULT_CAM_PITCH } from '../game/camera/CameraLookState';

describe('mouseSettings & CameraLookState', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => { store.set(k, v); },
      removeItem: (k: string) => { store.delete(k); },
      clear: () => store.clear(),
    });
  });

  it('loads defaults when localStorage is empty', () => {
    const s = loadMouseSettings();
    expect(s.sensitivity).toBe(DEFAULT_MOUSE_SENSITIVITY);
    expect(s.invertY).toBe(false);
  });

  it('persists and loads sensitivity and invertY', () => {
    saveMouseSettings({ sensitivity: 1.6, invertY: true });
    const s = loadMouseSettings();
    expect(s.sensitivity).toBe(1.6);
    expect(s.invertY).toBe(true);
  });

  it('applies sensitivity scaling to pointer delta', () => {
    const look = new CameraLookState();
    look.setMouseSettings({ sensitivity: 2.0, invertY: false });
    look.applyPointerDelta(10, 10);
    expect(look.yaw).toBeCloseTo(-10 * AIM_SENS_X * 2.0, 5);
    expect(look.pitch).toBeCloseTo(DEFAULT_CAM_PITCH + 10 * AIM_SENS_Y * 2.0, 5);
  });

  it('applies invertY to pitch delta', () => {
    const look = new CameraLookState();
    look.setMouseSettings({ sensitivity: 1.0, invertY: true });
    look.applyPointerDelta(0, 10);
    expect(look.pitch).toBeCloseTo(DEFAULT_CAM_PITCH - 10 * AIM_SENS_Y, 5);
  });
});
