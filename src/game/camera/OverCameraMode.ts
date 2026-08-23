// ===== Камера режима «конец матча» (облёт трупа) =====
import * as THREE from 'three';
import type { CameraMode } from './CameraMode';
import type { CameraRig } from '../CameraRig';
import type { CameraUpdateParams } from '../CameraRig';

export class OverCameraMode implements CameraMode {
  /** Reused scratch vectors — update() runs every frame (was: 2 allocs/frame). */
  private readonly tmpV = new THREE.Vector3();
  private readonly tmpV2 = new THREE.Vector3();

  update(dt: number, p: CameraUpdateParams, rig: CameraRig): void {
    const pl = p.player;
    if (!pl) return;
    const pos = pl.position;
    this.tmpV.set(pos.x - 14, 16, pos.z - 14);
    rig.camPos.lerp(this.tmpV, 1 - Math.exp(-1.5 * dt));
    rig.camLook.lerp(this.tmpV2.set(pos.x, 1, pos.z), 1 - Math.exp(-3 * dt));
  }
}
