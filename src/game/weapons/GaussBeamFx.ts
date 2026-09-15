// ===== Визуальный гиперзвуковой луч пушки Гаусс =====
import * as THREE from 'three';

const tmpDelta = new THREE.Vector3();
const tmpMid = new THREE.Vector3();
const yAxis = new THREE.Vector3(0, 1, 0);

export class GaussBeamFx {
  private scene: THREE.Scene;
  private group = new THREE.Group();
  private coreMesh: THREE.Mesh<THREE.CylinderGeometry, THREE.MeshBasicMaterial>;
  private glowMesh: THREE.Mesh<THREE.CylinderGeometry, THREE.MeshBasicMaterial>;
  private life = 0;
  private maxLife = 0.55;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    const coreGeo = new THREE.CylinderGeometry(0.06, 0.06, 1, 8, 1, true);
    const glowGeo = new THREE.CylinderGeometry(0.24, 0.24, 1, 8, 1, true);

    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xa855f7,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.coreMesh = new THREE.Mesh(coreGeo, coreMat);
    this.glowMesh = new THREE.Mesh(glowGeo, glowMat);
    this.group.add(this.coreMesh);
    this.group.add(this.glowMesh);
    this.group.visible = false;
    this.scene.add(this.group);
  }

  fire(from: THREE.Vector3, to: THREE.Vector3, duration = 0.55) {
    this.maxLife = Math.max(0.1, duration);
    this.life = this.maxLife;

    tmpDelta.subVectors(to, from);
    const len = tmpDelta.length();
    if (len < 0.01) return;

    tmpMid.addVectors(from, to).multiplyScalar(0.5);
    this.group.position.copy(tmpMid);

    this.group.quaternion.setFromUnitVectors(yAxis, tmpDelta.clone().normalize());
    this.group.scale.set(1, len, 1);

    this.coreMesh.material.opacity = 0.95;
    this.glowMesh.material.opacity = 0.8;
    this.group.visible = true;
  }

  update(dt: number) {
    if (this.life <= 0) return;
    this.life = Math.max(0, this.life - dt);
    const p = this.life / this.maxLife;
    this.coreMesh.material.opacity = p * 0.95;
    this.glowMesh.material.opacity = p * p * 0.8;
    if (this.life <= 0) {
      this.group.visible = false;
    }
  }

  hide() {
    this.life = 0;
    this.group.visible = false;
  }

  dispose() {
    this.scene.remove(this.group);
    this.coreMesh.geometry.dispose();
    this.coreMesh.material.dispose();
    this.glowMesh.geometry.dispose();
    this.glowMesh.material.dispose();
  }
}
