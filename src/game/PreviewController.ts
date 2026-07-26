// ===== Контроллер 3D-предпросмотра танка в гараже/меню =====
import * as THREE from 'three';
import { buildTankMesh } from './Tank';
import type { TankVisual } from './Tank';
import { buildPlayerStyle } from '../core/TankCatalog';
import { disposeObject3D } from './resources/disposeObject3D';
import { PREVIEW_POS } from './CameraRig';
import type { HullId, TurretId } from '../core/catalog';

/** Управляет группой предпросмотра: сборка, видимость, очистка. */
export class PreviewController {
  private group: THREE.Group | null = null;
  private visual: TankVisual | null = null;
  /**
   * Bumped on every rebuild/dispose. `buildTankMesh` асинхронен (GLB), поэтому
   * устаревшая сборка обязана выбросить свой результат, иначе быстрые клики в
   * гараже оставляют вторую модель в сцене навсегда.
   */
  private buildSeq = 0;

  constructor(
    private scene: THREE.Scene,
    private modeGetter: () => 'menu' | 'garage' | 'playing' | 'over',
  ) {}

  /** Пересобрать модель предпросмотра под текущий выбор корпуса/башни. */
  async rebuild(hullId: HullId, turretId: TurretId) {
    const seq = ++this.buildSeq;
    this.clearCurrent();

    const style = buildPlayerStyle();
    const visual = await buildTankMesh(style, hullId, turretId);

    if (seq !== this.buildSeq) {
      // Superseded while loading — drop this build instead of leaking it.
      disposeObject3D(visual.group);
      return;
    }

    visual.group.position.copy(PREVIEW_POS);
    this.scene.add(visual.group);
    this.group = visual.group;
    this.visual = visual;
    this.setVisible(
      this.modeGetter() === 'menu' || this.modeGetter() === 'garage',
    );
  }

  private clearCurrent() {
    if (!this.group) return;
    this.scene.remove(this.group);
    disposeObject3D(this.group);
    this.group = null;
    this.visual = null;
  }

  setVisible(visible: boolean) {
    if (this.group) this.group.visible = visible;
  }

  get previewVisual(): TankVisual | null { return this.visual; }

  async dispose() {
    // Bump: in-flight rebuild must not re-add itself after teardown.
    this.buildSeq += 1;
    this.clearCurrent();
  }
}
