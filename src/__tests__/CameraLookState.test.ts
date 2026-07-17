import { describe, it, expect } from 'vitest';
import {
  CameraLookState,
  AIM_SENS_X,
  AIM_SENS_Y,
  DEFAULT_CAM_PITCH,
  PITCH_MIN,
  PITCH_MAX,
} from '../game/camera/CameraLookState';

describe('CameraLookState', () => {
  it('defaults pitch to DEFAULT_CAM_PITCH and yaw 0', () => {
    const look = new CameraLookState();
    expect(look.yaw).toBe(0);
    expect(look.pitch).toBe(DEFAULT_CAM_PITCH);
  });

  it('applyPointerDelta: movementX subtracts yaw; movementY adds pitch', () => {
    const look = new CameraLookState();
    look.applyPointerDelta(100, 50);
    expect(look.yaw).toBeCloseTo(-100 * AIM_SENS_X, 10);
    expect(look.pitch).toBeCloseTo(DEFAULT_CAM_PITCH + 50 * AIM_SENS_Y, 10);
  });

  it('clamps pitch to PITCH_MIN / PITCH_MAX', () => {
    const look = new CameraLookState();
    look.applyPointerDelta(0, -1e6);
    expect(look.pitch).toBe(PITCH_MIN);
    look.applyPointerDelta(0, 1e6);
    expect(look.pitch).toBe(PITCH_MAX);
  });

  it('reset sets yaw and optional pitch', () => {
    const look = new CameraLookState();
    look.applyPointerDelta(10, 10);
    look.reset(1.5);
    expect(look.yaw).toBe(1.5);
    expect(look.pitch).toBe(DEFAULT_CAM_PITCH);
    look.reset(0.2, 0.5);
    expect(look.yaw).toBe(0.2);
    expect(look.pitch).toBe(0.5);
  });
});
