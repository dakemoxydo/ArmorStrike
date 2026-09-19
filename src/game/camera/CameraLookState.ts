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
  sensitivity = 1.0;
  invertY = false;

  /** Применить delta мыши (pointer-lock movementX/Y). */
  applyPointerDelta(dx: number, dy: number): void {
    this.yaw -= dx * AIM_SENS_X * this.sensitivity;
    const dySigned = this.invertY ? -dy : dy;
    this.pitch = THREE.MathUtils.clamp(this.pitch + dySigned * AIM_SENS_Y * this.sensitivity, PITCH_MIN, PITCH_MAX);
  }

  setMouseSettings(settings: { sensitivity?: number; invertY?: boolean }): void {
    if (settings.sensitivity !== undefined && Number.isFinite(settings.sensitivity)) {
      this.sensitivity = settings.sensitivity;
    }
    if (settings.invertY !== undefined) {
      this.invertY = settings.invertY;
    }
  }

  /** Сброс на старт матча / спавн. */
  reset(yaw: number, pitch = DEFAULT_CAM_PITCH): void {
    this.yaw = yaw;
    this.pitch = pitch;
  }
}
