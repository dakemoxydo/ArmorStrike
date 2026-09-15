// ===== «Изида»: двойная нано-дуга =====
// Два тонких шейдер-арка стартуют из рожков-эмитёров (±X от муззла) и сходятся
// в точку на цели — канонный «сдвоенный излучатель» Tanki Online, волнистые
// намагниченные потоки нанороботов.
// Шейдер/геомметрия дуги — общие с рельсотроном (экспорт из RailgunBeamFx):
// различие только в uniform'ах: дуга тоньше, «нервная» (высокий uSnap — форма
// пересобирается ~14 раз/с, как живой поток нано-разрядов), спираль плазмы
// выключена (её роль несёт NanoFlowPool — направленные частицы нанитов).
// Непрерывное оружие: в отличие от трейсера рельсы луч живёт пока горит —
// шаг() переставляет дуги каждый кадр, fadeStep() гасит после отпускания.
import * as THREE from 'three';
import {
  VERTEX_SHADER,
  FRAGMENT_SHADER,
  cssPxScale,
  cssPxToNdc,
  acquireSharedBeamGeo,
  releaseSharedBeamGeo,
} from './RailgunBeamFx';

/** Параметры нано-дуги (отличия от BEAM_ARC рельсы намеренные). */
const NANO_ARC = {
  /** Радиус дуги «в метрах» — тоньше рельсовой (0.06): игла, не жгут. */
  radius: 0.045,
  /** Тоньше рельсовой (12 px): читаемость добирается парностью дуг и потоком. */
  pixelWidth: 7,
  /** Излом мельче (рельса 1.8): «кипящая» нанопыль, а не молния. */
  cellLength: 1.15,
  /** Амплитуда излома меньше (рельса 0.3): дуги почти держат прямую. */
  amplitude: 0.13,
  /** Перестроек формы в секунду: электрическая «нервозность» потока. */
  snapRate: 14,
  /** Первые полуметра от рожка дуга прямая (иначе липнет к эмитёру). */
  muzzleStraight: 0.5,
  /** Неровность толщины вдоль дуги (±доля). */
  thicknessNoise: 0.25,
  coreExp: 2.0,
  /** Нитей больше рельсовой (4): 5 тонких струй читаются как «поток нанитов». */
  filaments: 5,
  strandAmt: 0.3,
  gain: 1.0,
} as const;

const tmpLook = new THREE.Vector3();

interface NanoArcLayer {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
}

function createLayer(geo: THREE.BufferGeometry, seed: number): NanoArcLayer {
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uSeed: { value: seed },
      uAmp: { value: NANO_ARC.amplitude },
      uCells: { value: 8 },
      uLen: { value: 1 },
      uSnap: { value: NANO_ARC.snapRate },
      uStraight: { value: NANO_ARC.muzzleStraight },
      uRadius: { value: NANO_ARC.radius },
      uPxWidth: { value: NANO_ARC.pixelWidth },
      uPxScale: { value: cssPxScale() },
      uThick: { value: NANO_ARC.thicknessNoise },
      uPxToNdc: { value: new THREE.Vector2(2 / 1280, 2 / 720) },
      uOpacity: { value: 0 },
      uGain: { value: NANO_ARC.gain },
      uCoreExp: { value: NANO_ARC.coreExp },
      uFilaments: { value: NANO_ARC.filaments },
      uStrandAmt: { value: NANO_ARC.strandAmt },
      uCoreColor: { value: new THREE.Color(1, 1, 1) },
      uEdgeColor: { value: new THREE.Color(0xff2d6b) },
      // Спираль плазмы выключена: uSpiralPxWidth=0 → вырожденная геометрия,
      // uSpiralGain=0 на всякий случай (нулевая площадь и так не растров.
      uSpiralRadius: { value: 0.18 },
      uSpiralPitch: { value: 2.0 },
      uSpiralSafe: { value: 1.0 },
      uSpiralPxWidth: { value: 0 },
      uSpiralColor: { value: new THREE.Color(0, 0, 0) },
      uSpiralGain: { value: 0 },
    },
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.visible = false;
  mesh.renderOrder = 10;
  return { mesh, mat };
}

export class NanoBeamFx {
  private readonly layers: [NanoArcLayer, NanoArcLayer];
  private readonly geoRadius: number;
  private time = 0;
  /** Текущая прозрачность луча (0…1): разгон при захвате, затухание при отпускании. */
  private alpha = 0;

  constructor(private scene: THREE.Scene) {
    const geo = acquireSharedBeamGeo(NANO_ARC.radius);
    this.geoRadius = NANO_ARC.radius;
    this.layers = [createLayer(geo, 3.71), createLayer(geo, 9.37)];
    scene.add(this.layers[0].mesh, this.layers[1].mesh);
  }

  /**
   * Шаг активного луча: fromA/fromB — рожки-эмитёры, to — точка на цели.
   * widthMul 0.4…1.3 — «пунч» при захвате; edgeHex — край дуги (режим),
   * ядро всегда белое (палитра разрядов как у рельсы).
   */
  step(
    dt: number,
    fromA: THREE.Vector3,
    fromB: THREE.Vector3,
    to: THREE.Vector3,
    widthMul: number,
    edgeHex: number,
  ): void {
    this.time += dt;
    this.alpha = Math.min(1, this.alpha + dt * 8);
    const origins = [fromA, fromB];
    for (let i = 0; i < 2; i++) {
      const { mesh, mat } = this.layers[i];
      const from = origins[i];
      const len = from.distanceTo(to);
      mesh.visible = true;
      mesh.position.copy(from);
      tmpLook.copy(to);
      mesh.lookAt(tmpLook);
      // scale.x/y — радиальный множитель (в шейдере `rs`: пиксельный пол и
      // мировая база толщины), scale.z — длина луча. Толщина-«пунч» идёт
      // только через rs, uniform uPxWidth держим номинальным.
      mesh.scale.set(widthMul, widthMul, len);
      const u = mat.uniforms;
      u.uTime.value = this.time;
      u.uLen.value = len;
      u.uCells.value = Math.max(2, len / NANO_ARC.cellLength);
      u.uOpacity.value = this.alpha;
      u.uPxScale.value = cssPxScale();
      cssPxToNdc(u.uPxToNdc.value as THREE.Vector2);
      (u.uEdgeColor.value as THREE.Color).setHex(edgeHex);
    }
  }

  /** Шаг погасания (спуск отпущен / цель потеряна): гасим и скрываем дуги. */
  fadeStep(dt: number): void {
    if (this.alpha <= 0) return;
    this.time += dt;
    this.alpha = Math.max(0, this.alpha - dt * 7);
    if (this.alpha <= 0) {
      this.layers[0].mesh.visible = false;
      this.layers[1].mesh.visible = false;
      return;
    }
    for (const { mat } of this.layers) {
      mat.uniforms.uTime.value = this.time;
      mat.uniforms.uOpacity.value = this.alpha;
    }
  }

  /** Мгновенное гашение (смерть владельца): без затухания, визуал не должен жить. */
  kill(): void {
    this.alpha = 0;
    this.layers[0].mesh.visible = false;
    this.layers[1].mesh.visible = false;
  }

  dispose(): void {
    for (const { mesh, mat } of this.layers) {
      this.scene.remove(mesh);
      mat.dispose();
    }
    releaseSharedBeamGeo(this.geoRadius);
  }
}
