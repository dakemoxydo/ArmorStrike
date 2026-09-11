import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { LightRig, LIGHT_CHANNEL_CAPACITY } from '../game/effects/LightRig';
import { FlashSystem } from '../game/effects/FlashSystem';

/**
 * Regression guard for the shot/death hitch root cause.
 *
 * The number of lights in a scene is part of three's shader program cache key
 * (`numPointLights`), so adding or removing a PointLight at runtime makes every
 * lit material rebuild its program key and — the first time a combination
 * appears — compile GLSL inside the frame. The rig must therefore keep the
 * light count constant for the whole session: writes only, never attach/detach.
 */

const RIG_LIGHTS =
  LIGHT_CHANNEL_CAPACITY.flash + LIGHT_CHANNEL_CAPACITY.beam + LIGHT_CHANNEL_CAPACITY.flame;

function lightCount(scene: THREE.Scene): number {
  return scene.children.filter((c) => c instanceof THREE.PointLight).length;
}

describe('LightRig', () => {
  it('attaches the whole budget once and keeps the light count constant', () => {
    const scene = new THREE.Scene();
    const rig = new LightRig(scene);

    expect(lightCount(scene)).toBe(RIG_LIGHTS);
    for (const child of scene.children) {
      expect((child as THREE.PointLight).intensity).toBe(0);
      expect((child as THREE.PointLight).castShadow).toBe(false);
    }

    const p = new THREE.Vector3(1, 2, 3);
    rig.set('flash', 0, p, 0xffcc44, 40, 14);
    rig.set('beam', 1, p, 0x2ee6c0, 28, 12);
    rig.off('flash', 0);
    rig.clear();

    expect(lightCount(scene)).toBe(RIG_LIGHTS);

    rig.dispose();
    expect(lightCount(scene)).toBe(0);
  });

  it('clamps slot indices to the channel capacity', () => {
    const scene = new THREE.Scene();
    const rig = new LightRig(scene);

    expect(rig.light('flame', 99)).toBe(rig.light('flame', LIGHT_CHANNEL_CAPACITY.flame - 1));
    expect(rig.light('flash', -5)).toBe(rig.light('flash', 0));

    rig.dispose();
  });

  it('flash system writes to rig slots without ever resizing the scene', () => {
    const scene = new THREE.Scene();
    const rig = new LightRig(scene);
    const flash = new FlashSystem(rig);
    const p = new THREE.Vector3();
    const lit = () => {
      let sum = 0;
      for (let i = 0; i < LIGHT_CHANNEL_CAPACITY.flash; i++) sum += rig.light('flash', i).intensity;
      return sum;
    };

    // Overflow the pool: extra flashes steal spent slots, never add lights.
    for (let i = 0; i < LIGHT_CHANNEL_CAPACITY.flash * 3; i++) {
      flash.flash(p, 0xffffff, 60, 0.09);
    }
    expect(lit()).toBeGreaterThan(0);
    expect(lightCount(scene)).toBe(RIG_LIGHTS);

    // Fading extinguishes in place; the lights stay attached to the scene.
    flash.update(1);
    expect(lit()).toBe(0);
    expect(lightCount(scene)).toBe(RIG_LIGHTS);

    flash.clear();
    flash.dispose();
    expect(lightCount(scene)).toBe(RIG_LIGHTS);

    rig.dispose();
  });
});
