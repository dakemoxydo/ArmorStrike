// ===== Стратегия режима камеры =====
import type { CameraRig } from '../CameraRig';
import type { CameraUpdateParams } from '../CameraRig';

/** Поведение камеры для одного игрового режима (menu/garage/playing/over). */
export interface CameraMode {
  update(dt: number, p: CameraUpdateParams, rig: CameraRig): void;
}
