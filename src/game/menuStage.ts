// ===== Сцена-подиума меню/гаража (Visual_Coherence_Pass п.16) =====
import * as THREE from 'three';
import { disposeObject3D } from './resources/disposeObject3D';
import { podiumTexture, stagePaperTexture } from './textures/stage';
import { PREVIEW_POS } from './CameraRig';

/** Радиус бумажного «цикла»: больше всех орбит камеры (menu r=16, garage ≤18). */
const STAGE_RADIUS = 26;
/** Верх подиума = точка предпросмотра: танк стоит на круге, не в пустоте. */
const PODIUM_TOP = PREVIEW_POS.y;
const PODIUM_R = 6.5;
const PODIUM_H = 0.32;
const INK = 0x0b0e14;

/**
 * Бумажная сцена для меню/гаража: пол + подиум с Ben-Day + цикл-стена.
 * Вместо живой арены 300×300 в тумане: GameModeController гасит арену,
 * RenderWorld.setFogEnabled(false) выключает туман — на сцене только бумага.
 * Владелец видимости — PreviewController.setVisible (тот же гейт, что у танка).
 */
export class MenuStage {
  readonly group = new THREE.Group();

  constructor(private scene: THREE.Scene) {
    // Paper floor — плоская печать без освещения (MeshBasic, комикс-стиль).
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(STAGE_RADIUS, 64),
      new THREE.MeshBasicMaterial({ map: stagePaperTexture(8, 8) }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = PODIUM_TOP - PODIUM_H;
    this.group.add(floor);

    // Podium: [side, top, bottom] — бока в чернила, cap — графический круг.
    const podium = new THREE.Mesh(
      new THREE.CylinderGeometry(PODIUM_R, PODIUM_R + 0.3, PODIUM_H, 48),
      [
        new THREE.MeshBasicMaterial({ color: INK }),
        new THREE.MeshBasicMaterial({ map: podiumTexture() }),
        new THREE.MeshBasicMaterial({ color: INK }),
      ],
    );
    podium.position.y = PODIUM_TOP - PODIUM_H / 2;
    this.group.add(podium);

    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(PODIUM_R, 0.08, 6, 64),
      new THREE.MeshBasicMaterial({ color: INK }),
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.y = PODIUM_TOP;
    this.group.add(rim);

    // Цикл-стена (BackSide): камера внутри — во все стороны видна бумага.
    // Высота 56 от y=-8 до y=48 перекрывает максимальный ракурс garage
    // (cam y ≈ 41, pitch 1.35 — верх кадра смотрит вниз, стена не нужна выше).
    const backdrop = new THREE.Mesh(
      new THREE.CylinderGeometry(STAGE_RADIUS, STAGE_RADIUS, 56, 48, 1, true),
      new THREE.MeshBasicMaterial({
        map: stagePaperTexture(10, 4),
        side: THREE.BackSide,
        fog: false,
      }),
    );
    backdrop.position.y = 20;
    this.group.add(backdrop);

    this.group.visible = false;
    this.scene.add(this.group);
  }

  setVisible(visible: boolean) {
    this.group.visible = visible;
  }

  dispose() {
    this.scene.remove(this.group);
    // Текстуры — markShared из cachedTexture, disposeObject3D их пропустит.
    disposeObject3D(this.group);
  }
}
