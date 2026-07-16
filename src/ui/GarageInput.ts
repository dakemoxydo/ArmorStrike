// ===== Ввод гаража: вращение/зум 3D-предпросмотра мышью и колесом =====
// Выделен из Game, чтобы оркестратор не занимался обработкой ввода гаража.
import type { CameraRig } from '../game/CameraRig';

export interface GarageInputDeps {
  canvas: HTMLCanvasElement;
  /** Активен ли сейчас режим гаража (ввод обрабатывается только тогда). */
  isInteractive: () => boolean;
  cameraRig: CameraRig;
}

export class GarageInput {
  private dragging = false;
  private lastX = 0;
  private lastY = 0;

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
  }

  private onPointerDown = (e: PointerEvent) => {
    if (!this.deps.isInteractive()) return;
    this.dragging = true;
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
    this.deps.cameraRig.garageDrag(dx, dy);
  };

  private onPointerUp = () => {
    if (!this.dragging) return;
    this.dragging = false;
    if (this.deps.isInteractive()) this.deps.canvas.style.cursor = 'grab';
  };

  private onWheel = (e: WheelEvent) => {
    if (!this.deps.isInteractive()) return;
    e.preventDefault();
    this.deps.cameraRig.garageZoom(e.deltaY);
  };
}
