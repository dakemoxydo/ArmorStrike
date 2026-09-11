import * as THREE from 'three';
import type { ParticleSystem } from './ParticleSystem';
import { clamp } from '../engine/physics';
import { LIGHT_CHANNEL_CAPACITY, type LightRig } from './LightRig';

interface FlashSlot {
  light: THREE.PointLight;
  /** Elapsed time of the current flash; >= dur means "free". */
  t: number;
  dur: number;
  peak: number;
}

/**
 * Concurrent muzzle / impact / explosion flashes. The lights themselves live in
 * the LightRig and are NEVER added to or removed from the scene — the light
 * count is part of the shader program key, so attach/detach used to force a
 * program rebuild for every lit material (and a mid-frame GLSL compile).
 */
const MAX_FLASHES = LIGHT_CHANNEL_CAPACITY.flash;
/** Clamp absurd peaks (railgun used to request 90–140). */
const MAX_PEAK = 55;
const FLASH_DISTANCE = 14;

export class FlashSystem implements ParticleSystem {
  private readonly slots: FlashSlot[] = [];

  constructor(rig: LightRig) {
    for (let i = 0; i < MAX_FLASHES; i++) {
      const light = rig.light('flash', i);
      light.distance = FLASH_DISTANCE;
      this.slots.push({ light, t: 1, dur: 1, peak: 0 });
    }
  }

  flash(p: THREE.Vector3, color: number, intensity: number, dur: number) {
    // Free slot, else steal the most spent one (never grows the light list).
    let slot = this.slots[0];
    for (const s of this.slots) {
      if (s.t >= s.dur) {
        slot = s;
        break;
      }
      if (s.t > slot.t) slot = s;
    }

    slot.light.position.copy(p);
    slot.light.color.setHex(color);
    slot.t = 0;
    slot.dur = dur;
    slot.peak = Math.min(intensity, MAX_PEAK);
    slot.light.intensity = slot.peak;
  }

  update(dt: number) {
    for (const s of this.slots) {
      if (s.t >= s.dur) continue;
      s.t += dt;
      if (s.t >= s.dur) {
        // Extinguish in place — the light stays attached to the scene.
        s.light.intensity = 0;
        continue;
      }
      const k = clamp(1 - s.t / s.dur, 0, 1);
      s.light.intensity = s.peak * k * k;
    }
  }

  /** Kill every running flash (round start). Lights stay attached. */
  clear() {
    for (const s of this.slots) {
      s.t = s.dur;
      s.peak = 0;
      s.light.intensity = 0;
    }
  }

  dispose() {
    this.clear();
    this.slots.length = 0;
  }
}
