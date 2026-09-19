// ===== Камера режима меню =====
import * as THREE from 'three';
import type { CameraMode } from './CameraMode';
import type { CameraRig } from '../CameraRig';
import type { CameraUpdateParams } from '../CameraRig';
import { PREVIEW_POS } from '../CameraRig';

export class MenuCameraMode implements CameraMode {
  /** Reused scratch vectors — update() runs every frame (was: 2 allocs/frame). */
  private readonly tmpV = new THREE.Vector3();
  private readonly tmpV2 = new THREE.Vector3();

  update(dt: number, p: CameraUpdateParams, rig: CameraRig): void {
    rig.menuAngle += dt * 0.3;
    const r = 16;
    this.tmpV.set(
      Math.sin(rig.menuAngle) * r,
      PREVIEW_POS.y + 2.8 + Math.sin(p.elapsed * 0.4) * 0.5,
      Math.cos(rig.menuAngle) * r,
    );
    rig.camPos.lerp(this.tmpV, 1 - Math.exp(-3 * dt));
    rig.camLook.lerp(this.tmpV2.set(PREVIEW_POS.x, PREVIEW_POS.y + 0.9, PREVIEW_POS.z), 1 - Math.exp(-5 * dt));

    if (p.previewVisual) {
      p.previewVisual.group.rotation.y = rig.menuAngle * 0.35;
      p.previewVisual.turret.rotation.y = Math.sin(p.elapsed * 0.8) * 0.45;
    }
  }
}
