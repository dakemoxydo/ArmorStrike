// ===== Состояние взгляда камеры/прицела (yaw/pitch) =====
// Выделено из PlayerController: чистые углы + чувствительность.
// Input владеет экземпляром; CameraRig читает только look-данные.
import * as THREE from 'three';

export const DEFAULT_CAM_PITCH = 0.34;
export const AIM_SENS_X = 0.0021;
export const AIM_SENS_Y = 0.0016;
export const PITCH_MIN = -0.18;
export const PITCH_MAX = 0.85;

export class CameraLookState {
  yaw = 0;
  pitch = DEFAULT_CAM_PITCH;

  /** Применить delta мыши (pointer-lock movementX/Y). */
  applyPointerDelta(dx: number, dy: number): void {
    this.yaw -= dx * AIM_SENS_X;
    this.pitch = THREE.MathUtils.clamp(this.pitch + dy * AIM_SENS_Y, PITCH_MIN, PITCH_MAX);
  }

  /** Сброс на старт матча / спавн. */
  reset(yaw: number, pitch = DEFAULT_CAM_PITCH): void {
    this.yaw = yaw;
    this.pitch = pitch;
  }
}
