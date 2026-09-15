// ===== Управление камерой: режимы menu/garage/playing/over, обход препятствий, FOV =====
import * as THREE from 'three';
import type { GameMode, GarageViewportInset } from './types';
import type { Collider } from './engine/physics';
import { segmentHitT, dampTo } from './engine/physics';
import type { EffectsPort } from './ports/EffectsPort';
import type { TankVisual } from './Tank';
import type { CameraFollowable } from './tank/simPorts';
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
  player: CameraFollowable | null;
  previewVisual: TankVisual | null;
  colliders: Collider[];
  effects: EffectsPort;
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
  /**
   * Safe-zone гаража: UI сообщает занятые края (CSS px) через GameApi, камера
   * центрирует предпросмотр в оставшемся свободном прямоугольнике кадра.
   */
  garageInset: GarageViewportInset | null = null;
  /** Peek-осмотр (drag): док скрыт, покрытие дока/паспорта демпфируется к нулю. */
  garagePeek = false;

  /** Размер вьюпорта в CSS px — поддерживается актуальным ресайзом (bootstrap). */
  private viewW = 0;
  private viewH = 0;
  /** Демпфированная доля покрытия дока/паспорта при peek (1 = полный инсет). */
  private peekCover = 1;
  /** Последний применённый оффсет — чтобы не пересобирать проекцию впустую. */
  private appliedOffset = { dx: NaN, dy: NaN, w: 0, h: 0 };

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
    this.garagePeek = false;
    this.peekCover = 1;
  }

  /** Актуальный размер вьюпорта (CSS px) — нужен для setViewOffset. */
  setViewportSize(w: number, h: number) {
    this.viewW = w;
    this.viewH = h;
  }

  /** UI-след гаража (CSS px по краям вьюпорта); null — следа нет. */
  setGarageInset(inset: GarageViewportInset | null) {
    this.garageInset = inset;
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
  snap(player: CameraFollowable, camYaw: number, camPitch: number) {
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

    this.applyGarageViewOffset(dt, p.mode);

    const roll = p.effects.getShake(this.shakeV, p.elapsed);
    this.camera.position.copy(this.camPos).add(this.shakeV);
    this.camera.up.set(Math.sin(roll), 1, 0).normalize();
    this.camera.lookAt(this.camLook);
  }

  /**
   * Safe-zone гаража: центр танка совмещается с центром свободного от UI
   * прямоугольника проекционным сдвигом (setViewOffset). Пивот орбиты остаётся
   * на танке — вращение мышью по-прежнему «крутит танк на месте». При выходе
   * из гаража сдвиг снимается, остальные режимы не затронуты.
   */
  private applyGarageViewOffset(dt: number, mode: GameMode) {
    if (mode !== 'garage') {
      if (this.camera.view?.enabled) this.camera.clearViewOffset();
      // Форсируем переприменение при возврате в гараж с теми же инсетами.
      this.appliedOffset.dx = NaN;
      return;
    }
    const inset = this.garageInset;
    if (!inset || this.viewW < 2 || this.viewH < 2) return;

    // Peek: док скрыт — покрытие демпфируется к нулю, танк плавно возвращается
    // в центр кадра (шапка остаётся, её инсет не гаснет).
    this.peekCover = dampTo(this.peekCover, this.garagePeek ? 0 : 1, 7, dt);
    const dx = (inset.right * this.peekCover - inset.left) / 2;
    const dy = (inset.bottom * this.peekCover - inset.top) / 2;

    const a = this.appliedOffset;
    if (
      Math.abs(a.dx - dx) < 0.25 &&
      Math.abs(a.dy - dy) < 0.25 &&
      a.w === this.viewW &&
      a.h === this.viewH
    ) {
      return;
    }
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) {
      if (this.camera.view?.enabled) this.camera.clearViewOffset();
    } else {
      this.camera.setViewOffset(this.viewW, this.viewH, dx, dy, this.viewW, this.viewH);
    }
    a.dx = dx;
    a.dy = dy;
    a.w = this.viewW;
    a.h = this.viewH;
  }

  /** Обход препятствий: возвращает скорректированный сдвиг камеры. */
  avoidObstacles(
    headX: number, headZ: number, dx: number, dz: number, dy: number, colliders: Collider[],
  ): { dx: number; dz: number; dy: number } {
    // Squared ray length for broad-phase distance cull.
    const rayLen2 = dx * dx + dz * dz;
    const rayLen = Math.sqrt(rayLen2);
    let minT = 1;
    for (const c of colliders) {
      // F3:避让 только живой видимой геометрии — конвенция остальных
      // потребителей (физика/LOS/снаряды/ИИ): мусор (active=false),
      // non-LOS фонари/билборды и drivable-'ramp' камера не отъезжают.
      if (!c.active || !c.blocksSight || c.kind === 'ramp' || c.height < 2.5) continue;
      // Broad-phase: skip colliders too far from ray origin (squared compare).
      const halfDiag = ((c.maxX - c.minX) + (c.maxZ - c.minZ)) * 0.5 + 0.7;
      const cx = (c.minX + c.maxX) * 0.5 - headX;
      const cz = (c.minZ + c.maxZ) * 0.5 - headZ;
      const reach = rayLen + halfDiag;
      if (cx * cx + cz * cz > reach * reach) continue;
      const t = segmentHitT(headX, headZ, headX + dx, headZ + dz, c, 0.7);
      if (t >= 0 && t < minT) {
        minT = t;
      }
    }
    if (minT < 1) {
      const tt = Math.max(minT * 0.92, 0.18);
      dx *= tt; dz *= tt; dy *= Math.max(tt, 0.5);
    }
    return { dx, dz, dy };
  }

  /** Плавный переход FOV с обновлением проекционной матрицы. */
  applyFov(targetFov: number, dt: number, rate = 5) {
    this.camFov = dampTo(this.camFov, targetFov, rate, dt);
    if (Math.abs(this.camFov - this.camera.fov) > 0.05) {
      this.camera.fov = this.camFov;
      this.camera.updateProjectionMatrix();
    }
  }
}
