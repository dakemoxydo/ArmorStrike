// ===== Камера игрового режима (от третьего лица за танком) =====
import type { CameraMode } from './CameraMode';
import type { CameraRig } from '../CameraRig';
import type { CameraUpdateParams } from '../CameraRig';
import type { CameraFollowable } from '../tank/simPorts';
import { dampTo } from '../engine/physics';

export class PlayingCameraMode implements CameraMode {
  update(dt: number, p: CameraUpdateParams, rig: CameraRig): void {
    const pl = p.player as CameraFollowable;
    const yaw = p.look.yaw;
    const pitch = p.look.pitch;
    const dist = 9.6;
    const horiz = Math.cos(pitch) * dist;
    const vert = Math.sin(pitch) * dist + 1.6;
    const fx = Math.sin(yaw);
    const fz = Math.cos(yaw);
    const headX = pl.position.x, headZ = pl.position.z;
    const headY = pl.alive ? 1.8 : 1.2;

    let dx = -fx * horiz, dz = -fz * horiz, dy = vert;

    // Обход препятствий: не давать камере уйти сквозь стену
    const obs = rig.avoidObstacles(headX, headZ, dx, dz, dy, p.colliders);
    dx = obs.dx; dz = obs.dz; dy = obs.dy;

    const targetX = headX + dx;
    const targetY = Math.max(headY + dy, 0.7);
    const targetZ = headZ + dz;
    const lam = pl.alive ? 14 : 4;
    rig.camPos.x = dampTo(rig.camPos.x, targetX, lam, dt);
    rig.camPos.y = dampTo(rig.camPos.y, targetY, lam, dt);
    rig.camPos.z = dampTo(rig.camPos.z, targetZ, lam, dt);

    const lookX = headX + fx * 6;
    const lookY = headY - Math.sin(pitch) * 5.4;
    const lookZ = headZ + fz * 6;
    rig.camLook.x = dampTo(rig.camLook.x, lookX, lam, dt);
    rig.camLook.y = dampTo(rig.camLook.y, lookY, lam, dt);
    rig.camLook.z = dampTo(rig.camLook.z, lookZ, lam, dt);

    // Плавное расширение FOV при скорости/бусте + weapon FOV bias (rail charge/fire)
    const speed01 = Math.min(1, Math.abs(pl.speed) / pl.params.speed);
    const fovBias = p.effects.getFovBias();
    const targetFov = 58 + speed01 * 5
      + (pl.boostActive && pl.speed > pl.params.speed * 0.9 ? 4 : 0)
      + fovBias;
    // Snappier FOV when punch/tighten active
    const fovRate = Math.abs(fovBias) > 0.05 ? 14 : 5;
    rig.applyFov(targetFov, dt, fovRate);
  }
}
