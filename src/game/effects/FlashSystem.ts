import * as THREE from 'three';
import type { ParticleSystem } from './ParticleSystem';
import { clamp } from '../engine/physics';

interface FlashLight { light: THREE.PointLight; t: number; dur: number; peak: number }

export class FlashSystem implements ParticleSystem {
  private flashes: FlashLight[] = [];
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  private getLight(): FlashLight {
    const free = this.flashes.find((f) => f.t >= f.dur);
    if (free) return free;
    const light = new THREE.PointLight(0xffffff, 0, 26, 1.8);
    this.scene.add(light);
    const fl: FlashLight = { light, t: 1, dur: 1, peak: 0 };
    this.flashes.push(fl);
    return fl;
  }

  flash(p: THREE.Vector3, color: number, intensity: number, dur: number) {
    const f = this.getLight();
    f.light.position.copy(p);
    f.light.color.setHex(color);
    f.t = 0;
    f.dur = dur;
    f.peak = intensity;
    f.light.intensity = intensity;
  }

  update(dt: number) {
    for (const f of this.flashes) {
      if (f.t >= f.dur) continue;
      f.t += dt;
      const k = clamp(1 - f.t / f.dur, 0, 1);
      f.light.intensity = f.peak * k * k;
      if (f.t >= f.dur) f.light.intensity = 0;
    }
  }

  dispose() {
    for (const f of this.flashes) {
      this.scene.remove(f.light);
    }
    this.flashes.length = 0;
  }
}
