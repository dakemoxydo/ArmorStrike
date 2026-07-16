// ===== Амбиентная пыль: дрейфующие частицы вокруг игрока =====
import * as THREE from 'three';
import { glowTexture } from '../textures';

export class AmbientDust {
  private ambient: THREE.Points;
  private ambPos: Float32Array;
  private ambVel: Float32Array;
  private ambCenter = new THREE.Vector3();
  private readonly ambCount = 140;
  private readonly ambRange = 95;

  constructor(scene: THREE.Scene, visible = true) {
    this.ambPos = new Float32Array(this.ambCount * 3);
    this.ambVel = new Float32Array(this.ambCount * 3);
    for (let i = 0; i < this.ambCount; i++) {
      this.ambPos[i * 3] = (Math.random() * 2 - 1) * this.ambRange;
      this.ambPos[i * 3 + 1] = 1 + Math.random() * 26;
      this.ambPos[i * 3 + 2] = (Math.random() * 2 - 1) * this.ambRange;
      this.ambVel[i * 3] = (Math.random() - 0.5) * 0.5;
      this.ambVel[i * 3 + 1] = -0.1 - Math.random() * 0.25;
      this.ambVel[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
    }
    const ambGeo = new THREE.BufferGeometry();
    ambGeo.setAttribute('position', new THREE.BufferAttribute(this.ambPos, 3));
    const gtex = glowTexture();
    const ambMat = new THREE.PointsMaterial({
      size: 0.55, map: gtex, color: 0xcdb09a,
      transparent: true, opacity: 0.22, depthWrite: false,
      blending: THREE.AdditiveBlending, sizeAttenuation: true,
    });
    this.ambient = new THREE.Points(ambGeo, ambMat);
    this.ambient.frustumCulled = false;
    this.ambient.visible = visible;
    scene.add(this.ambient);
  }

  /** Центр амбиентной пыли — обычно позиция игрока. */
  setCenter(x: number, z: number) {
    this.ambCenter.set(x, 0, z);
  }

  setVisible(v: boolean) {
    this.ambient.visible = v;
  }

  update(dt: number) {
    if (!this.ambient.visible) return;
    const cx = this.ambCenter.x, cz = this.ambCenter.z, R = this.ambRange;
    for (let i = 0; i < this.ambCount; i++) {
      const ix = i * 3, iy = ix + 1, iz = ix + 2;
      this.ambPos[ix] += this.ambVel[ix] * dt;
      this.ambPos[iy] += this.ambVel[iy] * dt;
      this.ambPos[iz] += this.ambVel[iz] * dt;
      if (this.ambPos[iy] < 0.6) { this.ambPos[iy] = 27; }
      if (this.ambPos[ix] - cx > R) this.ambPos[ix] = cx - R;
      else if (this.ambPos[ix] - cx < -R) this.ambPos[ix] = cx + R;
      if (this.ambPos[iz] - cz > R) this.ambPos[iz] = cz - R;
      else if (this.ambPos[iz] - cz < -R) this.ambPos[iz] = cz + R;
    }
    (this.ambient.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
  }
}
