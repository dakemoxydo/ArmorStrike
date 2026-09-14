// ===== M21: контактные шары заряда рельсотрона на дуле =====
// Электрический шар нарастает, белый «воздушный» схлопывается; при p = 1
// радиусы равны («соприкосновение») — это тот же кадр, в котором FSM стреляет.
// Чисто визуал: sizes из chargeBallRadii (railgunFireLogic), FSM/тайминги не
// владеет — weapon вызывает beginCharge/setProgress/confirmFire каждый кадр.
// Выстрел с M20 неотменим, поэтому «разрядной» анимации нет: единственный
// досрочный выход — hide() при смерти/дислоузе.
import * as THREE from 'three';
import { WEAPON_TUNING } from '../../core/catalog';
import { chargeBallRadii } from './railgunFireLogic';
import { fillMuzzleAndAim } from './muzzle';
import type { WeaponOwner } from './types';

const tmpMuzzle = new THREE.Vector3();
const tmpDir = new THREE.Vector3();

const ELECTRIC_COLOR = 0x8fffe8; // семейство луча (body color)
const AIR_COLOR = 0xffffff;
/** Амплитуда «кипения» электрического шара на полном заряде (доля радиуса). */
const PULSE_AMP = 0.08;

// Общий unit-сферы с ref-count, как у цилиндров RailgunBeamFx: N оружий —
// одна геометрия, освобождается последним владельцем (hot-reload safe).
let sphereGeo: THREE.SphereGeometry | null = null;
let sphereRefs = 0;
function acquireSphereGeo(): THREE.SphereGeometry {
  if (!sphereGeo) sphereGeo = new THREE.SphereGeometry(1, 16, 12);
  sphereRefs += 1;
  return sphereGeo;
}
function releaseSphereGeo(): void {
  sphereRefs -= 1;
  if (sphereRefs <= 0 && sphereGeo) {
    sphereGeo.dispose();
    sphereGeo = null;
  }
}

function makeBall(color: number, additive: boolean, geo: THREE.SphereGeometry):
  { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial } {
  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.visible = false;
  return { mesh, mat };
}

type BallsMode = 'off' | 'charge' | 'release';

export class RailgunChargeBalls {
  private electricMesh: THREE.Mesh;
  private electricMat: THREE.MeshBasicMaterial;
  private airMesh: THREE.Mesh;
  private airMat: THREE.MeshBasicMaterial;
  private mode: BallsMode = 'off';
  private progress = 0;
  private releaseT = 0;

  constructor(private scene: THREE.Scene) {
    const geo = acquireSphereGeo();
    const e = makeBall(ELECTRIC_COLOR, true, geo);
    const a = makeBall(AIR_COLOR, false, geo);
    this.electricMesh = e.mesh;
    this.electricMat = e.mat;
    this.airMesh = a.mesh;
    this.airMat = a.mat;
    // Воздушный рисуется под электрическим (аддитивный glow поверх).
    this.airMesh.renderOrder = 1;
    this.electricMesh.renderOrder = 2;
    this.scene.add(this.airMesh);
    this.scene.add(this.electricMesh);
  }

  /** Кадр старта заряда (setFire → CHARGING): шары появляются на дуле. */
  beginCharge(): void {
    this.mode = 'charge';
    this.progress = 0;
    this.electricMesh.visible = true;
    this.airMesh.visible = true;
  }

  /** Каждый кадр CHARGING: текущий прогресс 0..1. */
  setProgress(progress: number): void {
    if (this.mode === 'charge') this.progress = progress;
  }

  /** Кадр выстрела: электрический втягивается в луч, воздух «хлопает». */
  confirmFire(): void {
    if (this.mode !== 'charge') return;
    this.mode = 'release';
    this.releaseT = 0;
    this.progress = 1;
  }

  /**
   * Каждый кадр (ранний выход, когда шаров нет): позиция живая — дуло во
   * время заряда трясётся (barrel jitter), шары сидят на muzzle и трясутся
   * вместе со стволом бесплатно.
   */
  update(dt: number, owner: WeaponOwner): void {
    if (this.mode === 'off') return;
    const cfg = WEAPON_TUNING.railgun.chargeBalls;
    fillMuzzleAndAim(owner, tmpMuzzle, tmpDir);

    if (this.mode === 'charge') {
      const r = chargeBallRadii(this.progress, cfg);
      // 0..1 — насколько воздух уже схлопнулся (по фактическому радиусу).
      const span = Math.max(1e-6, cfg.airStart - cfg.contactRadius);
      const collapse = (cfg.airStart - r.air) / span;
      const t = performance.now() * 0.001;
      const pulse = 1 + Math.sin(t * (26 + this.progress * 50)) * PULSE_AMP * this.progress;

      this.electricMesh.position.copy(tmpMuzzle);
      this.electricMesh.scale.setScalar(r.electric * pulse);
      // Ярче базово (0.55): аддитивный cyan поверх белого шара иначе не читается.
      this.electricMat.opacity = 0.55 + 0.45 * this.progress * this.progress;

      this.airMesh.position.copy(tmpMuzzle);
      this.airMesh.scale.setScalar(r.air);
      // Сжатый воздух ярче, но остаётся полупрозрачным (≤0.3): сквозь него
      // видно растущий электрический шар.
      this.airMat.opacity = 0.08 + 0.22 * collapse;
      return;
    }

    // release: короткий pop, дальше шары сами гасятся.
    this.releaseT += dt;
    const u = Math.min(1, this.releaseT / Math.max(1e-4, cfg.releaseDuration));
    const ease = 1 - (1 - u) * (1 - u);

    this.electricMesh.position.copy(tmpMuzzle);
    this.electricMesh.scale.setScalar(cfg.contactRadius * (1 - u));
    this.electricMat.opacity = 1 - u; // вспышка на старте релиза

    this.airMesh.position.copy(tmpMuzzle);
    this.airMesh.scale.setScalar(
      THREE.MathUtils.lerp(cfg.contactRadius, cfg.airPopRadius, ease),
    );
    this.airMat.opacity = 0.5 * (1 - u);

    if (u >= 1) this.hide();
  }

  /** Мгновенно погасить (смерть владельца / dispose). */
  hide(): void {
    this.mode = 'off';
    this.progress = 0;
    this.releaseT = 0;
    this.electricMesh.visible = false;
    this.airMesh.visible = false;
    this.electricMat.opacity = 0;
    this.airMat.opacity = 0;
  }

  dispose(): void {
    this.hide();
    this.scene.remove(this.electricMesh);
    this.scene.remove(this.airMesh);
    this.electricMat.dispose();
    this.airMat.dispose();
    releaseSphereGeo();
  }
}
