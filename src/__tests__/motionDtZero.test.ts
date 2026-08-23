// Тест FIX-1: dt=0 (hit-stop) не должен давать NaN/Infinity в vel
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { TankMotionSystem } from '../game/engine/systems/TankMotionSystem';
import type { MotionBody } from '../game/tank/simPorts';

function makeBody(over: Partial<MotionBody> = {}): MotionBody {
  return {
    position: new THREE.Vector3(0, 0, 0),
    params: { speed: 10, reverseSpeed: 5, turnSpeed: 2 },
    boosting: false,
    boostEnergy: 1,
    boostDrainMul: 1,
    boostRechargeMul: 1,
    boostActive: false,
    throttle: 1,
    speed: 0,
    yaw: 0,
    steer: 0,
    knockback: new THREE.Vector3(0, 0, 0),
    vel: new THREE.Vector3(0, 0, 0),
    ...over,
  };
}

const finite = (v: THREE.Vector3) =>
  Number.isFinite(v.x) && Number.isFinite(v.z);

describe('TankMotionSystem: dt=0 (hit-stop) NaN guard', () => {
  it('dt=0 keeps vel finite and zeroed', () => {
    const t = makeBody();
    TankMotionSystem.updateOne(t, 0);
    expect(finite(t.vel)).toBe(true);
    expect(t.vel.x).toBe(0);
    expect(t.vel.z).toBe(0);
  });

  it('dt=0 with active knockback keeps vel finite and position frozen', () => {
    const t = makeBody({ knockback: new THREE.Vector3(30, 0, -12) });
    TankMotionSystem.updateOne(t, 0);
    expect(finite(t.vel)).toBe(true);
    // Позиция не должна сдвинуться при нулевом dt
    expect(t.position.x).toBe(0);
    expect(t.position.z).toBe(0);
  });

  it('dt>0 still computes velocity from position delta', () => {
    const t = makeBody({ yaw: Math.PI / 2 }); // движение вдоль +X
    TankMotionSystem.updateOne(t, 0.1);
    expect(finite(t.vel)).toBe(true);
    expect(t.vel.x).toBeGreaterThan(0); // едет по X при yaw=π/2
    expect(Math.abs(t.vel.z)).toBeLessThan(1e-6);
  });

  it('microscopic dt (≤1e-6) is treated as freeze, not division blow-up', () => {
    const t = makeBody();
    TankMotionSystem.updateOne(t, 1e-9);
    expect(finite(t.vel)).toBe(true);
    expect(t.vel.x).toBe(0);
  });
});
