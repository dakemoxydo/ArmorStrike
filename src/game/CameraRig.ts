// ===== Управление камерой: режимы menu/garage/playing/over, обход препятствий, FOV =====
import * as THREE from 'three';
import type { GameMode } from './types';
import type { Collider } from './engine/physics';
import { segmentHitT, dampTo } from './engine/physics';
import type { Effects } from './effects';
import type { TankEntity } from './Tank';
import type { TankVisual } from './Tank';
import type { CameraLookState } from './camera/CameraLookState';
import { CameraMode } from './camera/CameraMode';
import { MenuCameraMode } from './camera/MenuCameraMode';
import { GarageCameraMode } from './camera/GarageCameraMode';
import { PlayingCameraMode } from './camera/PlayingCameraMode';
import { OverCameraMode } from './camera/OverCameraMode';

export const PREVIEW_POS = new THREE.Vector3(0, 21, 0);

export interface CameraUpdateParams {
  mode: GameMode;
  elapsed: number;
  /** Углы взгляда (playing); menu/garage/over игнорируют. */
  look: CameraLookState;
  player: TankEntity | null;
  previewVisual: TankVisual | null;
  colliders: Collider[];
  effects: Effects;
}

export class CameraRig {
  camera: THREE.PerspectiveCamera;
  camPos = new THREE.Vector3(0, 20, 12);
  camLook = new THREE.Vector3(0, 16, 0);
  camFov = 58;
  menuAngle = 0.6;
  shakeV = new THREE.Vector3();

  // Ручное управление предпросмотром в гараже (мышь)
  garageYaw = Math.PI * 0.25;
  garagePitch = 0.32;
  garageDist = 9.5;
  garageAutoSpin = true;
  garageTargetY = PREVIEW_POS.y + 0.8;

  private modes: Record<GameMode, CameraMode>;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    this.modes = {
      menu: new MenuCameraMode(),
      garage: new GarageCameraMode(),
      playing: new PlayingCameraMode(),
      over: new OverCameraMode(),
    };
  }

  /** Сброс ручного управления гаражом при входе/выходе. */
  resetGarage() {
    this.garageYaw = Math.PI * 0.25;
    this.garagePitch = 0.32;
    this.garageDist = 9.5;
    this.garageAutoSpin = true;
    this.garageTargetY = PREVIEW_POS.y + 0.8;
  }

  /** Перетаскивание мыши — вращение камеры вокруг танка. */
  garageDrag(dx: number, dy: number) {
    this.garageAutoSpin = false;
    this.garageYaw -= dx * 0.008;
    this.garagePitch = THREE.MathUtils.clamp(this.garagePitch - dy * 0.006, 0.05, 1.35);
  }

  /** Колесо мыши — приближение/отдаление. */
  garageZoom(delta: number) {
    this.garageDist = THREE.MathUtils.clamp(this.garageDist + delta * 0.01, 4.5, 18);
  }

  resetFov() {
    this.camFov = 58;
    if (Math.abs(this.camera.fov - 58) > 0.05) {
      this.camera.fov = 58;
      this.camera.updateProjectionMatrix();
    }
  }

  /** Мгновенно поставить камеру за спиной игрока (спавн/старт матча). */
  snap(player: TankEntity, camYaw: number, camPitch: number) {
    if (!player) return;
    const yaw = camYaw;
    const pitch = camPitch;
    const horiz = Math.cos(pitch) * 9.6;
    const vert = Math.sin(pitch) * 9.6 + 1.6;
    const fx = Math.sin(yaw), fz = Math.cos(yaw);
    const headY = player.alive ? 1.8 : 1.2;
    this.camPos.set(player.position.x - fx * horiz, headY + vert, player.position.z - fz * horiz);
    this.camLook.set(player.position.x + fx * 6, headY - Math.sin(pitch) * 5.4, player.position.z + fz * 6);
    this.camera.fov = this.camFov;
    this.camera.updateProjectionMatrix();
  }

  update(dt: number, p: CameraUpdateParams) {
    if (p.mode === 'playing' || p.mode === 'over') {
      if (p.player) this.modes[p.mode].update(dt, p, this);
    } else {
      this.modes[p.mode].update(dt, p, this);
    }

    const roll = p.effects.getShake(this.shakeV, p.elapsed);
    this.camera.position.copy(this.camPos).add(this.shakeV);
    this.camera.up.set(Math.sin(roll), 1, 0).normalize();
    this.camera.lookAt(this.camLook);
  }

  /** Обход препятствий: возвращает скорректированный сдвиг камеры. */
  avoidObstacles(
    headX: number, headZ: number, dx: number, dz: number, dy: number, colliders: Collider[],
  ): { dx: number; dz: number; dy: number } {
    for (const c of colliders) {
      if (c.height < 2.5) continue;
      const t = segmentHitT(headX, headZ, headX + dx, headZ + dz, c, 0.7);
      if (t >= 0 && t < 1) {
        const tt = Math.max(t * 0.92, 0.18);
        dx *= tt; dz *= tt; dy *= Math.max(tt, 0.5);
        break;
      }
    }
    return { dx, dz, dy };
  }

  /** Плавный переход FOV с обновлением проекционной матрицы. */
  applyFov(targetFov: number, dt: number) {
    this.camFov = dampTo(this.camFov, targetFov, 5, dt);
    if (Math.abs(this.camFov - this.camera.fov) > 0.05) {
      this.camera.fov = this.camFov;
      this.camera.updateProjectionMatrix();
    }
  }
}
