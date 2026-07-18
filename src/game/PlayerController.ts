// ===== Управление игроком: WASD — корпус, мышь (pointer-lock) — башня/камера, ЛКМ/Пробел — огонь =====
// Схема управления: камера следует за мышью (CameraLookState),
// а башня целится туда же, куда смотрит камера. Прицел — по центру экрана.
import type { ControllableTank } from './tank/simPorts';
import { CameraLookState } from './camera/CameraLookState';

export class PlayerController {
  wantsFire = false;
  reloadRequested = false;
  scoreHeld = false;

  /** Направление взгляда камеры (абсолютный мировой yaw) — задаёт и прицел. */
  readonly look = new CameraLookState();

  /** Активно только в режиме боя. */
  enabled = false;
  locked = false;
  onLockLost?: () => void;

  private keys = new Set<string>();
  private dom: HTMLElement | null = null;

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) { this.swallow(e); return; }
    this.keys.add(e.code);
    if (e.code === 'Space') this.wantsFire = true;
    if (e.code === 'KeyR') this.reloadRequested = true;
    if (e.code === 'Tab') { this.scoreHeld = true; e.preventDefault(); }
    this.swallow(e);
  };
  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
    if (e.code === 'Space') this.wantsFire = false;
    if (e.code === 'Tab') this.scoreHeld = false;
  };
  private onMouseMove = (e: MouseEvent) => {
    if (!this.locked || !this.enabled) return;
    this.look.applyPointerDelta(e.movementX, e.movementY);
  };
  private onMouseDown = (e: MouseEvent) => {
    if (e.button === 0) this.wantsFire = true;
    if (this.enabled && !this.locked) this.requestLock();
  };
  private onMouseUp = (e: MouseEvent) => {
    if (e.button === 0) this.wantsFire = false;
  };
  private onBlur = () => {
    this.keys.clear();
    this.wantsFire = false;
  };
  private onContext = (e: Event) => e.preventDefault();
  private onLockChange = () => {
    this.locked = document.pointerLockElement === this.dom;
    if (!this.locked && this.enabled) this.onLockLost?.();
  };

  private swallow(e: KeyboardEvent) {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Tab'].includes(e.code)) {
      e.preventDefault();
    }
  }

  attach(dom: HTMLElement) {
    this.dom = dom;
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('mousemove', this.onMouseMove);
    dom.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('blur', this.onBlur);
    document.addEventListener('pointerlockchange', this.onLockChange);
    dom.addEventListener('contextmenu', this.onContext);
  }

  detach() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('blur', this.onBlur);
    document.removeEventListener('pointerlockchange', this.onLockChange);
    if (this.dom) {
      this.dom.removeEventListener('mousedown', this.onMouseDown);
      this.dom.removeEventListener('contextmenu', this.onContext);
    }
    this.dom = null;
  }

  requestLock() {
    try {
      const p = this.dom?.requestPointerLock() as unknown as Promise<void> | undefined;
      if (p && typeof p.catch === 'function') p.catch(() => undefined);
    } catch { /* ignore */ }
  }

  releaseLock() {
    if (document.pointerLockElement === this.dom) document.exitPointerLock();
  }

  /** Применить ввод к танку. Возвращает true, если запрошен выстрел. */
  update(tank: ControllableTank): boolean {
    const k = this.keys;
    tank.throttle = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) + (k.has('KeyS') || k.has('ArrowDown') ? -1 : 0);
    tank.steer = (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0) + (k.has('KeyD') || k.has('ArrowRight') ? -1 : 0);
    tank.boosting = k.has('ShiftLeft') || k.has('ShiftRight');

    // Башня целится туда же, куда смотрит камера (как в game1)
    tank.aimYaw = this.look.yaw;

    if (this.reloadRequested) {
      tank.weapon?.requestReload();
      this.reloadRequested = false;
    }

    return this.wantsFire;
  }
}
