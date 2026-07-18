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

  /** Hard cap — extra concurrent flashes cost full per-fragment lighting. */
  private static readonly MAX_LIGHTS = 4;

  private getLight(): FlashLight | null {
    const free = this.flashes.find((f) => f.t >= f.dur);
    if (free) {
      if (!free.light.parent) this.scene.add(free.light);
      return free;
    }
    if (this.flashes.length >= FlashSystem.MAX_LIGHTS) {
      // Steal oldest active slot instead of growing the light list forever.
      let oldest = this.flashes[0];
      for (let i = 1; i < this.flashes.length; i++) {
        if (this.flashes[i].t > oldest.t) oldest = this.flashes[i];
      }
      if (!oldest.light.parent) this.scene.add(oldest.light);
      return oldest;
    }
    const light = new THREE.PointLight(0xffffff, 0, 14, 2);
    light.castShadow = false;
    this.scene.add(light);
    const fl: FlashLight = { light, t: 1, dur: 1, peak: 0 };
    this.flashes.push(fl);
    return fl;
  }

  flash(p: THREE.Vector3, color: number, intensity: number, dur: number) {
    const f = this.getLight();
    if (!f) return;
    f.light.position.copy(p);
    f.light.color.setHex(color);
    f.t = 0;
    f.dur = dur;
    // Clamp absurd peaks (railgun used to request 90–140).
    f.peak = Math.min(intensity, 55);
    f.light.intensity = f.peak;
    f.light.distance = 14;
  }

  update(dt: number) {
    for (const f of this.flashes) {
      if (f.t >= f.dur) {
        if (f.light.parent && f.light.intensity === 0) {
          // Detach spent lights so WebGLRenderer light count stays low.
          this.scene.remove(f.light);
        }
        continue;
      }
      f.t += dt;
      const k = clamp(1 - f.t / f.dur, 0, 1);
      f.light.intensity = f.peak * k * k;
      if (f.t >= f.dur) {
        f.light.intensity = 0;
        this.scene.remove(f.light);
      }
    }
  }

  dispose() {
    for (const f of this.flashes) {
      this.scene.remove(f.light);
    }
    this.flashes.length = 0;
  }
}
