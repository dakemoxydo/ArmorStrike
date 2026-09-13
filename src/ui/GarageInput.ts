// ===== Ввод гаража: вращение/зум 3D-предпросмотра мышью и колесом =====
// Выделен из Game, чтобы оркестратор не занимался обработкой ввода гаража.
import type { CameraRig } from '../game/CameraRig';

export interface GarageInputDeps {
  canvas: HTMLCanvasElement;
  /** Активен ли сейчас режим гаража (ввод обрабатывается только тогда). */
  isInteractive: () => boolean;
  cameraRig: CameraRig;
  /**
   * Peek-осмотр: true на первом заметном движении drag, false на отпускании.
   * Скрывает док UI (CSS-класс) и демпфирует safe-zone сдвиг камеры.
   */
  onPeekChange?: (active: boolean) => void;
}

export class GarageInput {
  private dragging = false;
  private lastX = 0;
  private lastY = 0;
  /** Накопленный путь указателя за drag: короткий клик осмотр не включает. */
  private dragDist = 0;
  private peek = false;

  constructor(private deps: GarageInputDeps) {}

  attach() {
    this.deps.canvas.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    this.deps.canvas.addEventListener('wheel', this.onWheel, { passive: false });
  }

  detach() {
    this.deps.canvas.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    this.deps.canvas.removeEventListener('wheel', this.onWheel);
    // Размонтирование гаража в середине drag не должно оставить peek навсегда.
    this.endPeek();
  }

  private endPeek() {
    if (!this.peek) return;
    this.peek = false;
    this.deps.onPeekChange?.(false);
  }

  private onPointerDown = (e: PointerEvent) => {
    if (!this.deps.isInteractive()) return;
    this.dragging = true;
    this.dragDist = 0;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.deps.canvas.style.cursor = 'grabbing';
  };

  private onPointerMove = (e: PointerEvent) => {
    if (!this.dragging) return;
    const dx = e.clientX - this.lastX;
    const dy = e.clientY - this.lastY;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.dragDist += Math.abs(dx) + Math.abs(dy);
    if (!this.peek && this.dragDist > 6) {
      this.peek = true;
      this.deps.onPeekChange?.(true);
    }
    this.deps.cameraRig.garageDrag(dx, dy);
  };

  private onPointerUp = () => {
    if (!this.dragging) return;
    this.dragging = false;
    this.endPeek();
    if (this.deps.isInteractive()) this.deps.canvas.style.cursor = 'grab';
  };

  private onWheel = (e: WheelEvent) => {
    if (!this.deps.isInteractive()) return;
    e.preventDefault();
    this.deps.cameraRig.garageZoom(e.deltaY);
  };
}
