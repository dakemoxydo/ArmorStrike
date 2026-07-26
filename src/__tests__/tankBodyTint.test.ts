import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { TankAnimationSystem } from '../game/engine/systems/TankAnimationSystem';
import type { AnimBody } from '../game/tank/simPorts';

const ACCENT = 0x274a58;

function makeBody(health: number, maxHealth = 100, alive = true): AnimBody {
  const bodyMats = [
    new THREE.MeshStandardMaterial({ color: 0xffffff }), // camo (белая база + map)
    new THREE.MeshStandardMaterial({ color: ACCENT }),   // accent metal
  ];
  return {
    id: 1,
    alive,
    boostActive: false,
    deathT: 0,
    speed: 0,
    health,
    maxHealth,
    position: new THREE.Vector3(),
    fx: { barrelKick: 0, hitFlash: 0, smokeAcc: 0 },
    visual: {
      barrelGroup: new THREE.Group(),
      turret: new THREE.Group(),
      bodyMats,
      bodyBaseColors: bodyMats.map((m) => m.color.getHex()),
      ring: new THREE.Mesh(undefined, new THREE.MeshBasicMaterial()),
      trackTex: { offset: { y: 0 } } as unknown as THREE.CanvasTexture,
    },
  };
}

const accentOf = (b: AnimBody) => b.visual.bodyMats[1].color;

describe('tank body tint keeps base colors', () => {
  it('full health leaves accent material at its authored color', () => {
    const b = makeBody(100);
    TankAnimationSystem.update([b], 0.016);
    expect(accentOf(b).getHex()).toBe(ACCENT);
  });

  it('low health darkens from the base color, not to grey', () => {
    const b = makeBody(25);
    TankAnimationSystem.update([b], 0.016);
    const base = new THREE.Color(ACCENT);
    const k = 0.55 + 0.45 * (0.25 / 0.5);
    expect(accentOf(b).r).toBeCloseTo(base.r * k, 5);
    expect(accentOf(b).b).toBeCloseTo(base.b * k, 5);
    // Не серый: каналы сохраняют исходное соотношение.
    expect(accentOf(b).b).toBeGreaterThan(accentOf(b).r);
  });

  it('death fade scales the base color and recovers hue on heal', () => {
    const dead = makeBody(0, 100, false);
    TankAnimationSystem.update([dead], 0.5);
    expect(accentOf(dead).b).toBeGreaterThan(accentOf(dead).r);

    const healed = makeBody(100);
    TankAnimationSystem.update([healed], 0.016);
    expect(accentOf(healed).getHex()).toBe(ACCENT);
  });
});
