import * as THREE from 'three';
import type { ParticleSystem } from './ParticleSystem';
import { glowTexture } from '../textures';

export class MuzzleSystem implements ParticleSystem {
  private sprites: THREE.Sprite[] = [];
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    const gtex = glowTexture();
    for (let i = 0; i < 6; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({
        map: gtex, transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending, opacity: 0,
      }));
      sp.visible = false;
      scene.add(sp);
      this.sprites.push(sp);
    }
  }

  flash(p: THREE.Vector3, color: number) {
    const sp = this.sprites.find((s) => !s.visible) ?? this.sprites[0];
    sp.position.copy(p);
    sp.material.color.setHex(color);
    sp.material.opacity = 0.95;
    sp.scale.setScalar(2.6 + Math.random() * 1.4);
    sp.visible = true;
    (sp.material as THREE.SpriteMaterial).rotation = Math.random() * Math.PI;
  }

  update(dt: number) {
    for (const sp of this.sprites) {
      if (!sp.visible) continue;
      sp.material.opacity -= dt * 10;
      sp.scale.multiplyScalar(1 + dt * 6);
      if (sp.material.opacity <= 0) {
        sp.visible = false;
        sp.material.opacity = 0;
      }
    }
  }

  dispose() {
    for (const sp of this.sprites) {
      this.scene.remove(sp);
      sp.material.dispose();
    }
    this.sprites.length = 0;
  }
}
