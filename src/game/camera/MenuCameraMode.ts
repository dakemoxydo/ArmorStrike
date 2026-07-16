// ===== Камера режима меню =====
import * as THREE from 'three';
import type { CameraMode } from './CameraMode';
import type { CameraRig } from '../CameraRig';
import type { CameraUpdateParams } from '../CameraRig';
import { PREVIEW_POS } from '../CameraRig';

export class MenuCameraMode implements CameraMode {
  update(dt: number, p: CameraUpdateParams, rig: CameraRig): void {
    const tmpV = new THREE.Vector3();
    const tmpV2 = new THREE.Vector3();
    rig.menuAngle += dt * 0.3;
    const r = 17;
    tmpV.set(
      Math.sin(rig.menuAngle) * r,
      PREVIEW_POS.y + 3.2 + Math.sin(p.elapsed * 0.4) * 0.6,
      Math.cos(rig.menuAngle) * r,
    );
    rig.camPos.lerp(tmpV, 1 - Math.exp(-3 * dt));
    rig.camLook.lerp(tmpV2.set(PREVIEW_POS.x + 6, PREVIEW_POS.y + 1.2, PREVIEW_POS.z), 1 - Math.exp(-5 * dt));

    if (p.previewVisual) {
      p.previewVisual.group.rotation.y = rig.menuAngle * 0.35;
      p.previewVisual.turret.rotation.y = Math.sin(p.elapsed * 0.8) * 0.45;
    }
  }
}
