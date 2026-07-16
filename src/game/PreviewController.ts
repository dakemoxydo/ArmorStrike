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

  constructor(
    private scene: THREE.Scene,
    private modeGetter: () => 'menu' | 'garage' | 'playing' | 'over',
  ) {}

  /** Пересобрать модель предпросмотра под текущий выбор корпуса/башни. */
  rebuild(hullId: HullId, turretId: TurretId) {
    if (this.group) {
      this.scene.remove(this.group);
      disposeObject3D(this.group);
      this.group = null;
      this.visual = null;
    }

    const style = buildPlayerStyle();
    const visual = buildTankMesh(style, hullId, turretId);
    visual.group.position.copy(PREVIEW_POS);
    this.scene.add(visual.group);
    this.group = visual.group;
    this.visual = visual;
    this.setVisible(
      this.modeGetter() === 'menu' || this.modeGetter() === 'garage',
    );
  }

  setVisible(visible: boolean) {
    if (this.group) this.group.visible = visible;
  }

  get previewVisual(): TankVisual | null { return this.visual; }

  dispose() {
    if (this.group) {
      this.scene.remove(this.group);
      disposeObject3D(this.group);
      this.group = null;
      this.visual = null;
    }
  }
}
