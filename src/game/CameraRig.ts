// ===== Управление камерой: режимы menu/garage/playing/over, обход препятствий, FOV =====
import * as THREE from 'three';
import type { GameMode } from './types';
import type { Collider } from './engine/physics';
import { segmentHitT } from './engine/physics';
import type { Effects } from './effects';
import type { PlayerController } from './PlayerController';
import type { TankEntity } from './Tank';
import type { TankVisual } from './Tank';

export const PREVIEW_POS = new THREE.Vector3(0, 21, 0);

export interface CameraUpdateParams {
  mode: GameMode;
  elapsed: number;
  input: PlayerController;
  player: TankEntity | null;
  previewVisual: TankVisual | null;
  colliders: Collider[];
  effects: Effects;
}

export class CameraRig {
  private camera: THREE.PerspectiveCamera;
  private camPos = new THREE.Vector3(0, 20, 12);
  private camLook = new THREE.Vector3(0, 16, 0);
  private camFov = 58;
  private menuAngle = 0.6;
  private shakeV = new THREE.Vector3();

  // Ручное управление предпросмотром в гараже (мышь)
  private garageYaw = Math.PI * 0.25;
  private garagePitch = 0.32;
  private garageDist = 9.5;
  private garageAutoSpin = true;
  private garageTargetY = PREVIEW_POS.y + 0.8;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
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
    const tmpV = new THREE.Vector3();
    const tmpV2 = new THREE.Vector3();

    if (p.mode === 'menu') {
      this.menuAngle += dt * 0.3;
      const r = 17;
      tmpV.set(
        Math.sin(this.menuAngle) * r,
        PREVIEW_POS.y + 3.2 + Math.sin(p.elapsed * 0.4) * 0.6,
        Math.cos(this.menuAngle) * r,
      );
      this.camPos.lerp(tmpV, 1 - Math.exp(-3 * dt));
      this.camLook.lerp(tmpV2.set(PREVIEW_POS.x + 6, PREVIEW_POS.y + 1.2, PREVIEW_POS.z), 1 - Math.exp(-5 * dt));

      if (p.previewVisual) {
        p.previewVisual.group.rotation.y = this.menuAngle * 0.35;
        p.previewVisual.turret.rotation.y = Math.sin(p.elapsed * 0.8) * 0.45;
      }

    } else if (p.mode === 'garage') {
      // Авто-вращение, пока пользователь не взял управление мышью
      if (this.garageAutoSpin) this.garageYaw += dt * 0.45;

      const horiz = Math.cos(this.garagePitch) * this.garageDist;
      const vert = Math.sin(this.garagePitch) * this.garageDist;
      tmpV.set(
        PREVIEW_POS.x + Math.sin(this.garageYaw) * horiz,
        this.garageTargetY + 1.6 + vert,
        PREVIEW_POS.z + Math.cos(this.garageYaw) * horiz,
      );
      this.camPos.lerp(tmpV, 1 - Math.exp(-9 * dt));
      this.camLook.lerp(tmpV2.set(PREVIEW_POS.x, this.garageTargetY, PREVIEW_POS.z), 1 - Math.exp(-9 * dt));

      if (p.previewVisual) {
        // Танк стоит неподвижно, а камера облетает вокруг него; башня слёгка поворачивается
        p.previewVisual.turret.rotation.y = Math.sin(p.elapsed * 1.1) * 0.35;
      }

    } else if (p.mode === 'playing' && p.player) {
      const pl = p.player;
      const yaw = p.input.camYaw;
      const pitch = p.input.camPitch;
      const dist = 9.6;
      const horiz = Math.cos(pitch) * dist;
      const vert = Math.sin(pitch) * dist + 1.6;
      const fx = Math.sin(yaw);
      const fz = Math.cos(yaw);
      const headX = pl.position.x, headZ = pl.position.z;
      const headY = pl.alive ? 1.8 : 1.2;

      let dx = -fx * horiz, dz = -fz * horiz, dy = vert;

      // Обход препятствий: не давать камере уйти сквозь стену
      for (const c of p.colliders) {
        if (c.height < 2.5) continue;
        const t = segmentHitT(headX, headZ, headX + dx, headZ + dz, c, 0.7);
        if (t >= 0 && t < 1) {
          const tt = Math.max(t * 0.92, 0.18);
          dx *= tt; dz *= tt; dy *= Math.max(tt, 0.5);
          break;
        }
      }

      const targetX = headX + dx;
      const targetY = Math.max(headY + dy, 0.7);
      const targetZ = headZ + dz;
      const lam = pl.alive ? 14 : 4;
      this.camPos.x = THREE.MathUtils.damp(this.camPos.x, targetX, lam, dt);
      this.camPos.y = THREE.MathUtils.damp(this.camPos.y, targetY, lam, dt);
      this.camPos.z = THREE.MathUtils.damp(this.camPos.z, targetZ, lam, dt);

      const lookX = headX + fx * 6;
      const lookY = headY - Math.sin(pitch) * 5.4;
      const lookZ = headZ + fz * 6;
      this.camLook.x = THREE.MathUtils.damp(this.camLook.x, lookX, lam, dt);
      this.camLook.y = THREE.MathUtils.damp(this.camLook.y, lookY, lam, dt);
      this.camLook.z = THREE.MathUtils.damp(this.camLook.z, lookZ, lam, dt);

      // Плавное расширение FOV при скорости/бусте
      const speed01 = Math.min(1, Math.abs(pl.speed) / pl.params.speed);
      const targetFov = 58 + speed01 * 5 + (pl.boostActive && pl.speed > pl.params.speed * 0.9 ? 4 : 0);
      this.camFov = THREE.MathUtils.damp(this.camFov, targetFov, 5, dt);
      if (Math.abs(this.camFov - this.camera.fov) > 0.05) {
        this.camera.fov = this.camFov;
        this.camera.updateProjectionMatrix();
      }

    } else if (p.mode === 'over' && p.player) {
      const pos = p.player.position;
      tmpV.set(pos.x - 14, 16, pos.z - 14);
      this.camPos.lerp(tmpV, 1 - Math.exp(-1.5 * dt));
      this.camLook.lerp(tmpV2.set(pos.x, 1, pos.z), 1 - Math.exp(-3 * dt));
    }

    const roll = p.effects.getShake(this.shakeV, p.elapsed);
    this.camera.position.copy(this.camPos).add(this.shakeV);
    this.camera.up.set(Math.sin(roll), 1, 0).normalize();
    this.camera.lookAt(this.camLook);
  }
}
