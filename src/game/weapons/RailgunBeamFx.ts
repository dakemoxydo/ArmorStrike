// ===== Визуальный луч рельсотрона (multi-layer beam + lights + punch) =====
// Выделен из RailgunWeapon: владеет mesh-слоями, PointLight и fade.
// Чисто визуально — уроном / hitscan не занимается.
// Perf: lights detached while idle (Three still shades intensity-0 lights if in scene).
import * as THREE from 'three';
import { WEAPON_TUNING } from '../../core/catalog';

const tmpMid = new THREE.Vector3();
const tmpLook = new THREE.Vector3();
const tmpEnd = new THREE.Vector3();

const PUNCH_DUR = 0.055;
const CORE_FADE_FRAC = 0.42;
const GLOW_HOLD = 1.35;

// Modest intensities/ranges — high values + many lights stall the GPU hard.
const MUZZLE_LIGHT_PEAK = 28;
const IMPACT_LIGHT_PEAK = 18;
const LIGHT_DIST = 12;

function makeBeamMesh(
  radius: number,
  color: number,
): { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial } {
  const geo = new THREE.CylinderGeometry(radius, radius, 1, 8);
  geo.rotateX(Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.visible = false;
  mesh.matrixAutoUpdate = true;
  return { mesh, mat };
}

export class RailgunBeamFx {
  private coreMesh: THREE.Mesh;
  private coreMat: THREE.MeshBasicMaterial;
  private bodyMesh: THREE.Mesh;
  private bodyMat: THREE.MeshBasicMaterial;
  private glowMesh: THREE.Mesh;
  private glowMat: THREE.MeshBasicMaterial;
  private muzzleLight: THREE.PointLight;
  private impactLight: THREE.PointLight;
  private lightsAttached = false;
  private beamFadeTimer = 0;
  private punchTimer = 0;
  private rayLength = 1;

  constructor(private scene: THREE.Scene) {
    const core = makeBeamMesh(0.055, 0xffffff);
    const body = makeBeamMesh(0.18, 0x8fffe8);
    const glow = makeBeamMesh(0.42, 0x4ee6c8);
    this.coreMesh = core.mesh;
    this.coreMat = core.mat;
    this.bodyMesh = body.mesh;
    this.bodyMat = body.mat;
    this.glowMesh = glow.mesh;
    this.glowMat = glow.mat;

    this.scene.add(this.glowMesh);
    this.scene.add(this.bodyMesh);
    this.scene.add(this.coreMesh);

    // Not added to scene until show() — avoids permanent light budget per weapon instance.
    this.muzzleLight = new THREE.PointLight(0x2ee6c0, 0, LIGHT_DIST, 2);
    this.muzzleLight.castShadow = false;
    this.impactLight = new THREE.PointLight(0xfff0a0, 0, LIGHT_DIST, 2);
    this.impactLight.castShadow = false;
  }

  private attachLights() {
    if (this.lightsAttached) return;
    this.scene.add(this.muzzleLight);
    this.scene.add(this.impactLight);
    this.lightsAttached = true;
  }

  private detachLights() {
    if (!this.lightsAttached) return;
    this.scene.remove(this.muzzleLight);
    this.scene.remove(this.impactLight);
    this.muzzleLight.intensity = 0;
    this.impactLight.intensity = 0;
    this.lightsAttached = false;
  }

  /** Показать луч от muzzle вдоль dir на длину rayLength; punch + fade. */
  show(muzzle: THREE.Vector3, dir: THREE.Vector3, rayLength: number) {
    this.rayLength = Math.max(0.5, rayLength);
    tmpMid.copy(muzzle).addScaledVector(dir, this.rayLength * 0.5);
    tmpEnd.copy(muzzle).addScaledVector(dir, this.rayLength);
    tmpLook.copy(muzzle).addScaledVector(dir, this.rayLength + 1);

    // Orient once on body, copy transform to siblings (avoid 3× lookAt).
    this.bodyMesh.position.copy(tmpMid);
    this.bodyMesh.scale.set(1.85, 1.85, this.rayLength);
    this.bodyMesh.lookAt(tmpLook);
    this.bodyMesh.visible = true;

    this.coreMesh.position.copy(tmpMid);
    this.coreMesh.quaternion.copy(this.bodyMesh.quaternion);
    this.coreMesh.scale.set(2.4, 2.4, this.rayLength);
    this.coreMesh.visible = true;

    this.glowMesh.position.copy(tmpMid);
    this.glowMesh.quaternion.copy(this.bodyMesh.quaternion);
    this.glowMesh.scale.set(1.55, 1.55, this.rayLength);
    this.glowMesh.visible = true;

    this.coreMat.opacity = 1;
    this.bodyMat.opacity = 1;
    this.glowMat.opacity = 0.55;

    this.beamFadeTimer = WEAPON_TUNING.railgun.beamDuration;
    this.punchTimer = PUNCH_DUR;

    this.attachLights();
    this.muzzleLight.position.copy(muzzle);
    this.muzzleLight.intensity = MUZZLE_LIGHT_PEAK;
    this.impactLight.position.copy(tmpEnd);
    this.impactLight.intensity = IMPACT_LIGHT_PEAK;
  }

  /** Позиция impact-light (последнее попадание по танку / стене). */
  setImpactPosition(p: THREE.Vector3) {
    if (!this.lightsAttached) this.attachLights();
    this.impactLight.position.copy(p);
    this.impactLight.intensity = Math.max(this.impactLight.intensity, IMPACT_LIGHT_PEAK * 0.75);
  }

  /** Затухание слоёв + radial punch settle. */
  update(dt: number) {
    if (this.beamFadeTimer <= 0 && this.punchTimer <= 0) return;

    if (this.punchTimer > 0) {
      this.punchTimer = Math.max(0, this.punchTimer - dt);
      const u = 1 - this.punchTimer / PUNCH_DUR;
      const ease = 1 - (1 - u) * (1 - u);
      const coreR = THREE.MathUtils.lerp(2.4, 1, ease);
      const bodyR = THREE.MathUtils.lerp(1.85, 1, ease);
      const glowR = THREE.MathUtils.lerp(1.55, 1, ease);
      this.coreMesh.scale.x = this.coreMesh.scale.y = coreR;
      this.bodyMesh.scale.x = this.bodyMesh.scale.y = bodyR;
      this.glowMesh.scale.x = this.glowMesh.scale.y = glowR;
    }

    if (this.beamFadeTimer <= 0) return;

    this.beamFadeTimer -= dt;
    const dur = WEAPON_TUNING.railgun.beamDuration;
    const t = Math.max(0, this.beamFadeTimer / dur);

    const coreT = Math.max(0, (t - (1 - CORE_FADE_FRAC)) / CORE_FADE_FRAC);
    this.coreMat.opacity = coreT * coreT;
    this.bodyMat.opacity = t;
    const glowT = Math.min(1, t * GLOW_HOLD);
    this.glowMat.opacity = 0.55 * glowT * glowT;

    if (this.lightsAttached) {
      this.muzzleLight.intensity = t * t * MUZZLE_LIGHT_PEAK;
      this.impactLight.intensity = t * IMPACT_LIGHT_PEAK;
    }

    if (this.beamFadeTimer <= 0) {
      this.coreMesh.visible = false;
      this.bodyMesh.visible = false;
      this.glowMesh.visible = false;
      this.coreMat.opacity = 0;
      this.bodyMat.opacity = 0;
      this.glowMat.opacity = 0;
      this.detachLights();
    }
  }

  dispose() {
    this.detachLights();
    for (const mesh of [this.coreMesh, this.bodyMesh, this.glowMesh]) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
    }
    this.coreMat.dispose();
    this.bodyMat.dispose();
    this.glowMat.dispose();
    this.muzzleLight.dispose();
    this.impactLight.dispose();
  }
}
