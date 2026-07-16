// ===== Камера режима гаража =====
import * as THREE from 'three';
import type { CameraMode } from './CameraMode';
import type { CameraRig } from '../CameraRig';
import type { CameraUpdateParams } from '../CameraRig';
import { PREVIEW_POS } from '../CameraRig';

export class GarageCameraMode implements CameraMode {
  update(dt: number, p: CameraUpdateParams, rig: CameraRig): void {
    const tmpV = new THREE.Vector3();
    const tmpV2 = new THREE.Vector3();
    // Авто-вращение, пока пользователь не взял управление мышью
    if (rig.garageAutoSpin) rig.garageYaw += dt * 0.45;

    const horiz = Math.cos(rig.garagePitch) * rig.garageDist;
    const vert = Math.sin(rig.garagePitch) * rig.garageDist;
    tmpV.set(
      PREVIEW_POS.x + Math.sin(rig.garageYaw) * horiz,
      rig.garageTargetY + 1.6 + vert,
      PREVIEW_POS.z + Math.cos(rig.garageYaw) * horiz,
    );
    rig.camPos.lerp(tmpV, 1 - Math.exp(-9 * dt));
    rig.camLook.lerp(tmpV2.set(PREVIEW_POS.x, rig.garageTargetY, PREVIEW_POS.z), 1 - Math.exp(-9 * dt));

    if (p.previewVisual) {
      // Танк стоит неподвижно, а камера облетает вокруг него; башня слёгка поворачивается
      p.previewVisual.turret.rotation.y = Math.sin(p.elapsed * 1.1) * 0.35;
    }
  }
}
