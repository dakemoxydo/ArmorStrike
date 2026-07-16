// ===== Камера режима «конец матча» (облёт трупа) =====
import * as THREE from 'three';
import type { CameraMode } from './CameraMode';
import type { CameraRig } from '../CameraRig';
import type { CameraUpdateParams } from '../CameraRig';

export class OverCameraMode implements CameraMode {
  update(_dt: number, p: CameraUpdateParams, rig: CameraRig): void {
    const tmpV = new THREE.Vector3();
    const tmpV2 = new THREE.Vector3();
    const pl = p.player as import('../Tank').TankEntity;
    const pos = pl.position;
    tmpV.set(pos.x - 14, 16, pos.z - 14);
    rig.camPos.lerp(tmpV, 1 - Math.exp(-1.5 * _dt));
    rig.camLook.lerp(tmpV2.set(pos.x, 1, pos.z), 1 - Math.exp(-3 * _dt));
  }
}
