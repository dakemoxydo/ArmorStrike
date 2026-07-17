// ===== Визуальный луч рельсотрона (beam mesh + lights) =====
// Выделен из RailgunWeapon: владеет Cylinder mesh, PointLight и fade.
// Чисто визуально — уроном / hitscan не занимается.
import * as THREE from 'three';
import { WEAPON_TUNING } from '../../core/catalog';

const tmpMid = new THREE.Vector3();
const tmpLook = new THREE.Vector3();

export class RailgunBeamFx {
  private beamMesh: THREE.Mesh;
  private beamMat: THREE.MeshBasicMaterial;
  private muzzleLight: THREE.PointLight;
  private impactLight: THREE.PointLight;
  private beamFadeTimer = 0;

  constructor(private scene: THREE.Scene) {
    const beamGeo = new THREE.CylinderGeometry(0.18, 0.18, 1, 12);
    beamGeo.rotateX(Math.PI / 2); // ось Z вдоль луча

    this.beamMat = new THREE.MeshBasicMaterial({
      color: 0x8fffe8,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.beamMesh = new THREE.Mesh(beamGeo, this.beamMat);
    this.beamMesh.frustumCulled = false;
    this.beamMesh.visible = false;
    this.scene.add(this.beamMesh);

    this.muzzleLight = new THREE.PointLight(0x2ee6c0, 0, 18);
    this.impactLight = new THREE.PointLight(0xfff0a0, 0, 15);
    this.scene.add(this.muzzleLight);
    this.scene.add(this.impactLight);
  }

  /** Показать луч от muzzle вдоль dir на длину rayLength; старт fade. */
  show(muzzle: THREE.Vector3, dir: THREE.Vector3, rayLength: number) {
    tmpMid.copy(muzzle).addScaledVector(dir, rayLength * 0.5);

    this.beamMesh.position.copy(tmpMid);
    this.beamMesh.scale.set(1, 1, rayLength);
    this.beamMesh.lookAt(tmpLook.copy(muzzle).addScaledVector(dir, rayLength + 1));
    this.beamMesh.visible = true;

    this.beamMat.opacity = 1.0;
    this.beamFadeTimer = WEAPON_TUNING.railgun.beamDuration;

    this.muzzleLight.position.copy(muzzle);
    this.muzzleLight.intensity = 80;
  }

  /** Позиция impact-light (последнее попадание по танку). */
  setImpactPosition(p: THREE.Vector3) {
    this.impactLight.position.copy(p);
  }

  /** Затухание луча 1 → 0. */
  update(dt: number) {
    if (this.beamFadeTimer <= 0) return;

    this.beamFadeTimer -= dt;
    const opacity = Math.max(0, this.beamFadeTimer / WEAPON_TUNING.railgun.beamDuration);
    this.beamMat.opacity = opacity;
    this.muzzleLight.intensity = opacity * 60;
    this.impactLight.intensity = opacity * 40;

    if (this.beamFadeTimer <= 0) {
      this.beamMesh.visible = false;
      this.muzzleLight.intensity = 0;
      this.impactLight.intensity = 0;
    }
  }

  dispose() {
    this.scene.remove(this.beamMesh);
    this.scene.remove(this.muzzleLight);
    this.scene.remove(this.impactLight);
    this.beamMat.dispose();
    this.beamMesh.geometry.dispose();
  }
}
