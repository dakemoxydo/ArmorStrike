// ===== Визуальный луч рельсотрона (multi-layer beam + lights + punch) =====
// Выделен из RailgunWeapon: владеет mesh-слоями, PointLight и fade.
// Чисто визуально — уроном / hitscan не занимается.
// Perf: свет берётся из LightRig и НИКОГДА не добавляется/не удаляется из
// сцены — смена числа источников заставляет three пересобирать программу
// каждому lit-материалу и компилировать GLSL прямо в кадре выстрела.
import * as THREE from 'three';
import { WEAPON_TUNING } from '../../core/catalog';
import type { LightRig } from '../effects/LightRig';

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
/** Rig channel indices: the pair is shared by all railgun instances. */
const MUZZLE_SLOT = 0;
const IMPACT_SLOT = 1;
const MUZZLE_LIGHT_COLOR = 0x2ee6c0;
const IMPACT_LIGHT_COLOR = 0xfff0a0;

const CORE_RADIUS = 0.055;
const BODY_RADIUS = 0.18;
const GLOW_RADIUS = 0.42;

/**
 * Shared geometry per radius across all beam instances (perf: avoid N×CylinderGeometry).
 * Ref-counted: each RailgunBeamFx instance acquires on construction and releases
 * on dispose; the geometry is disposed only when the last user is gone (fixes
 * module-level leak under hot-reload / repeated test runs).
 */
const SHARED_GEO_REFS = new Map<number, { geo: THREE.CylinderGeometry; refs: number }>();

function acquireSharedBeamGeo(radius: number): THREE.CylinderGeometry {
  let entry = SHARED_GEO_REFS.get(radius);
  if (!entry) {
    const geo = new THREE.CylinderGeometry(radius, radius, 1, 8);
    geo.rotateX(Math.PI / 2);
    entry = { geo, refs: 0 };
    SHARED_GEO_REFS.set(radius, entry);
  }
  entry.refs += 1;
  return entry.geo;
}

function releaseSharedBeamGeo(radius: number): void {
  const entry = SHARED_GEO_REFS.get(radius);
  if (!entry) return;
  entry.refs -= 1;
  if (entry.refs <= 0) {
    entry.geo.dispose();
    SHARED_GEO_REFS.delete(radius);
  }
}

function makeBeamMesh(
  radius: number,
  color: number,
): { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial } {
  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const mesh = new THREE.Mesh(acquireSharedBeamGeo(radius), mat);
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
  private beamFadeTimer = 0;
  private punchTimer = 0;
  private rayLength = 1;
  /** Beam frame captured at show(): origin + direction, so length can change later. */
  private beamOrigin = new THREE.Vector3();
  private beamDir = new THREE.Vector3(0, 0, 1);

  constructor(private scene: THREE.Scene, private rig: LightRig) {
    const core = makeBeamMesh(CORE_RADIUS, 0xffffff);
    const body = makeBeamMesh(BODY_RADIUS, 0x8fffe8);
    const glow = makeBeamMesh(GLOW_RADIUS, 0x4ee6c8);
    this.coreMesh = core.mesh;
    this.coreMat = core.mat;
    this.bodyMesh = body.mesh;
    this.bodyMat = body.mat;
    this.glowMesh = glow.mesh;
    this.glowMat = glow.mat;

    this.scene.add(this.glowMesh);
    this.scene.add(this.bodyMesh);
    this.scene.add(this.coreMesh);

    // Rig lights are permanently attached; a beam only writes to them.
    this.muzzleLight = rig.light('beam', MUZZLE_SLOT);
    this.impactLight = rig.light('beam', IMPACT_SLOT);
  }

  /** Extinguish the beam lights in place (they stay attached to the scene). */
  private offLights() {
    this.muzzleLight.intensity = 0;
    this.impactLight.intensity = 0;
  }

  /** Place/scale all three beam layers for the current origin/dir/rayLength. */
  private layoutBeam(): void {
    tmpMid.copy(this.beamOrigin).addScaledVector(this.beamDir, this.rayLength * 0.5);
    tmpEnd.copy(this.beamOrigin).addScaledVector(this.beamDir, this.rayLength);
    tmpLook.copy(this.beamOrigin).addScaledVector(this.beamDir, this.rayLength + 1);

    // Orient once on body, copy transform to siblings (avoid 3× lookAt).
    this.bodyMesh.position.copy(tmpMid);
    this.bodyMesh.scale.set(1.85, 1.85, this.rayLength);
    this.bodyMesh.lookAt(tmpLook);

    this.coreMesh.position.copy(tmpMid);
    this.coreMesh.quaternion.copy(this.bodyMesh.quaternion);
    this.coreMesh.scale.set(2.4, 2.4, this.rayLength);

    this.glowMesh.position.copy(tmpMid);
    this.glowMesh.quaternion.copy(this.bodyMesh.quaternion);
    this.glowMesh.scale.set(1.55, 1.55, this.rayLength);
  }

  /** Показать луч от muzzle вдоль dir на длину rayLength; punch + fade. */
  show(muzzle: THREE.Vector3, dir: THREE.Vector3, rayLength: number) {
    this.beamOrigin.copy(muzzle);
    this.beamDir.copy(dir);
    this.rayLength = Math.max(0.5, rayLength);

    this.layoutBeam();
    this.bodyMesh.visible = true;
    this.coreMesh.visible = true;
    this.glowMesh.visible = true;

    this.coreMat.opacity = 1;
    this.bodyMat.opacity = 1;
    this.glowMat.opacity = 0.55;

    this.beamFadeTimer = WEAPON_TUNING.railgun.beamDuration;
    this.punchTimer = PUNCH_DUR;

    // Colors/distances are re-applied on every show(): the rig slots are shared
    // with other railgun instances and with the flame channel's neighbours.
    this.rig.set('beam', MUZZLE_SLOT, muzzle, MUZZLE_LIGHT_COLOR, MUZZLE_LIGHT_PEAK, LIGHT_DIST);
    this.rig.set('beam', IMPACT_SLOT, tmpEnd, IMPACT_LIGHT_COLOR, IMPACT_LIGHT_PEAK, LIGHT_DIST);
  }

  /**
   * Shorten the visible beam to `dist` (a wall/block stopped it earlier than
   * the initial range) and move the impact light to the new beam end.
   * M18 fix: previously only the light moved — mesh layers kept drawing
   * straight through the wall to full range (GDD: walls stop the beam).
   */
  setLength(dist: number) {
    if (!this.bodyMesh.visible) return; // no active beam to shorten
    this.rayLength = Math.max(0.5, dist);
    this.layoutBeam();
    tmpEnd.copy(this.beamOrigin).addScaledVector(this.beamDir, this.rayLength);
    this.impactLight.position.copy(tmpEnd);
  }

  /** Позиция impact-light (последнее попадание по танку / стене). */
  setImpactPosition(p: THREE.Vector3) {
    this.impactLight.position.copy(p);
    this.impactLight.intensity = Math.max(this.impactLight.intensity, IMPACT_LIGHT_PEAK * 0.75);
  }

  /** Мгновенно скрыть луч и погасить свет (смерть владельца mid-fade). */
  hide() {
    this.coreMesh.visible = false;
    this.bodyMesh.visible = false;
    this.glowMesh.visible = false;
    this.coreMat.opacity = 0;
    this.bodyMat.opacity = 0;
    this.glowMat.opacity = 0;
    this.beamFadeTimer = 0;
    this.punchTimer = 0;
    this.offLights();
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

    this.muzzleLight.intensity = t * t * MUZZLE_LIGHT_PEAK;
    this.impactLight.intensity = t * IMPACT_LIGHT_PEAK;

    if (this.beamFadeTimer <= 0) {
      this.coreMesh.visible = false;
      this.bodyMesh.visible = false;
      this.glowMesh.visible = false;
      this.coreMat.opacity = 0;
      this.bodyMat.opacity = 0;
      this.glowMat.opacity = 0;
      this.offLights();
    }
  }

  dispose() {
    this.offLights();
    for (const mesh of [this.coreMesh, this.bodyMesh, this.glowMesh]) {
      this.scene.remove(mesh);
    }
    this.coreMat.dispose();
    this.bodyMat.dispose();
    this.glowMat.dispose();
    // Rig lights are shared and scene-owned — never disposed here.
    // Shared geometry is ref-counted — release our references last.
    releaseSharedBeamGeo(CORE_RADIUS);
    releaseSharedBeamGeo(BODY_RADIUS);
    releaseSharedBeamGeo(GLOW_RADIUS);
  }
}
