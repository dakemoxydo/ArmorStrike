/**
 * Вертикальная автонаводка (Pitch-Aim) + 3D-вектор выстрела.
 *
 * Покрывает:
 *  • TankAimSystem — кламп целевого тангажа по elevationAngle / depressionAngle
 *    при наведении на цель выше и ниже стрелка;
 *  • плавный довод `barrelPitch` (шаг pitchSpeed·dt) и возврат в горизонт (0)
 *    при потере цели;
 *  • `Tank.aimDir` — полный 3D-вектор выстрела из `aimYaw` + `barrelPitch`
 *    (горизонтальная трасса не меняется, добавляется только вертикаль).
 */
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { TankAimSystem } from '../game/engine/systems/TankAimSystem';
import type { AimBody } from '../game/tank/simPorts';
import { TankEntity } from '../game/Tank';
import type { TankParams, TankVisual } from '../game/tank/types';

/** Башня с УВН: подъём 0.4 рад, склонение 0.25 рад, скорость довода 8 рад/с. */
const ELEV = 0.4;
const DEP = 0.25;
const PSPEED = 8;

function mkBody(over: Partial<AimBody> = {}): AimBody {
  return {
    params: { turretSpeed: 8, elevationAngle: ELEV, depressionAngle: DEP, pitchSpeed: PSPEED },
    aimYaw: 0,
    yaw: 0,
    turretYaw: 0,
    barrelPitch: 0,
    pitchLocked: false,
    pitchDy: 0,
    pitchDistXZ: 10,
    ...over,
  };
}

describe('TankAimSystem — вертикальная автонаводка (barrelPitch)', () => {
  it('задирание вверх клампится по elevationAngle (цель сильно выше)', () => {
    const b = mkBody({ pitchLocked: true, pitchDy: 100, pitchDistXZ: 1 });
    // atan2(100,1) ≈ 1.56 рад — далеко за сектором; за один «жирный» кадр довод
    // упирается в потолок подъёма.
    TankAimSystem.updateOne(b, 1);
    expect(b.barrelPitch).toBeCloseTo(ELEV, 5);
  });

  it('склонение вниз клампится по depressionAngle (цель сильно ниже)', () => {
    const b = mkBody({ pitchLocked: true, pitchDy: -100, pitchDistXZ: 1 });
    TankAimSystem.updateOne(b, 1);
    expect(b.barrelPitch).toBeCloseTo(-DEP, 5);
  });

  it('внутри сектора берёт точный atan2(dy, distXZ) без клампа', () => {
    const dy = 0.4;
    const distXZ = 10;
    const b = mkBody({ pitchLocked: true, pitchDy: dy, pitchDistXZ: distXZ });
    TankAimSystem.updateOne(b, 1);
    expect(b.barrelPitch).toBeCloseTo(Math.atan2(dy, distXZ), 5);
    // Значение строго внутри [−DEP, +ELEV].
    expect(b.barrelPitch).toBeLessThan(ELEV);
    expect(b.barrelPitch).toBeGreaterThan(-DEP);
  });

  it('доводит плавно: за маленький шаг не перескакивает цель', () => {
    const b = mkBody({ pitchLocked: true, pitchDy: 100, pitchDistXZ: 1 });
    const dt = 0.01; // шаг = 8 * 0.01 = 0.08 рад
    TankAimSystem.updateOne(b, dt);
    expect(b.barrelPitch).toBeCloseTo(0.08, 6);
    expect(b.barrelPitch).toBeLessThan(ELEV); // ещё не дошла до потолка
  });

  it('без цели плавно возвращается в горизонт (0)', () => {
    const b = mkBody({ pitchLocked: false, barrelPitch: ELEV, pitchDy: 999, pitchDistXZ: 1 });
    const dt = 0.02; // шаг 0.16
    TankAimSystem.updateOne(b, dt);
    expect(b.barrelPitch).toBeCloseTo(ELEV - 0.16, 6);
    expect(b.barrelPitch).toBeGreaterThan(0); // идёт к нулю, но ещё положительный

    // Enough frames to settle exactly to 0 (never overshoots past the target).
    for (let i = 0; i < 100; i++) TankAimSystem.updateOne(b, dt);
    expect(b.barrelPitch).toBe(0);
  });

  it('не аллоцирует и не ломается на вырожденной геометрии (dist=0)', () => {
    const b = mkBody({ pitchLocked: true, pitchDy: 0, pitchDistXZ: 0 });
    TankAimSystem.updateOne(b, 1);
    expect(Number.isFinite(b.barrelPitch)).toBe(true);
    expect(b.barrelPitch).toBe(0); // atan2(0,0) = 0
  });

  it('без параметров УВН (тестовый двойник) держит горизонт', () => {
    const b = mkBody({
      params: { turretSpeed: 8 },
      barrelPitch: 0.3,
      pitchLocked: true,
      pitchDy: 50,
      pitchDistXZ: 5,
    });
    TankAimSystem.updateOne(b, 1);
    expect(b.barrelPitch).toBe(0);
  });

  it('не трогает башню по горизонтали (regression: turretYaw всё ещё доводится)', () => {
    const b = mkBody({ aimYaw: 1.0, yaw: 0, turretYaw: 0, pitchLocked: false });
    TankAimSystem.updateOne(b, 0.01);
    expect(b.turretYaw).toBeGreaterThan(0); // доворачивается к aimYaw
  });
});

// ---------------------------------------------------------------- aimDir (3D)

function makeVisual(): TankVisual {
  const group = new THREE.Group();
  return {
    group,
    hull: new THREE.Group(),
    turret: new THREE.Group(),
    barrelGroup: new THREE.Group(),
    muzzle: new THREE.Object3D(),
    ring: new THREE.Mesh(),
    bodyMats: [],
    bodyBaseColors: [],
    trackTex: null as unknown as THREE.CanvasTexture,
  };
}

const PARAMS: TankParams = {
  maxHealth: 100, speed: 15, reverseSpeed: 9, turnSpeed: 2.5, turretSpeed: 8,
  damage: 40, shotCooldown: 0.28,
  elevationAngle: ELEV, depressionAngle: DEP, pitchSpeed: PSPEED,
};

describe('Tank.aimDir — 3D-вектор выстрела из тангажа ствола', () => {
  const out = new THREE.Vector3();

  it('при нулевом тангаже выстрел строго горизонтален', () => {
    const t = new TankEntity('T', true, PARAMS, makeVisual());
    t.aimYaw = 0;
    t.barrelPitch = 0;
    t.aimDir(out);
    expect(out.x).toBeCloseTo(0, 6);
    expect(out.y).toBeCloseTo(0, 6);
    expect(out.z).toBeCloseTo(1, 6);
    expect(out.length()).toBeCloseTo(1, 6);
  });

  it('положительный тангаж задирает вектор вверх (y>0) и остаётся единичным', () => {
    const t = new TankEntity('T', true, PARAMS, makeVisual());
    t.aimYaw = 0;
    t.barrelPitch = 0.4;
    t.aimDir(out);
    expect(out.y).toBeCloseTo(Math.sin(0.4), 6);
    expect(out.z).toBeCloseTo(Math.cos(0.4), 6);
    expect(out.x).toBeCloseTo(0, 6);
    expect(out.length()).toBeCloseTo(1, 6);
  });

  it('отрицательный тангаж опускает вектор вниз (y<0)', () => {
    const t = new TankEntity('T', true, PARAMS, makeVisual());
    t.aimYaw = 0;
    t.barrelPitch = -0.25;
    t.aimDir(out);
    expect(out.y).toBeCloseTo(Math.sin(-0.25), 6);
    expect(out.y).toBeLessThan(0);
  });

  it('азимут сохраняется, а XZ-проекция (направление в плане) не зависит от тангажа', () => {
    const yaw = 0.9;
    const t = new TankEntity('T', true, PARAMS, makeVisual());
    t.aimYaw = yaw;
    t.barrelPitch = 0.33;
    t.aimDir(out);
    // Горизонтальная ось выстрела — ровно по aimYaw (модуль cos pitch не искажает угол).
    const xz = Math.hypot(out.x, out.z);
    expect(out.x / xz).toBeCloseTo(Math.sin(yaw), 6);
    expect(out.z / xz).toBeCloseTo(Math.cos(yaw), 6);
    expect(out.length()).toBeCloseTo(1, 6);
  });
});

// ------------------------------------- сквозной путь: lock → aim → 3D-выстрел

describe('Вертикальная автонаводка end-to-end (цель другой высоты)', () => {
  const target = new THREE.Vector3();
  const dir = new THREE.Vector3();

  /** Танк с дулом на (0, 2, 0) (muzzleWorld = локальная позиция изолированного Object3D). */
  function shooter() {
    const visual = makeVisual();
    visual.muzzle.position.set(0, 2, 0);
    const t = new TankEntity('S', true, PARAMS, visual);
    t.aimYaw = 0;
    return t;
  }

  it('цель выше дула → ствол задирается вверх, вектор выстрела с +y', () => {
    const t = shooter();
    // Центр прицела цели на (0, 5, 10): dy=3, distXZ=10 → atan2(3,10)=0.29 рад (в секторе).
    t.setPitchAim(target.set(0, 5, 10));
    expect(t.pitchLocked).toBe(true);
    TankAimSystem.updateOne(t, 1); // доводим до установившегося угла (жирный шаг)
    const expected = Math.atan2(5 - 2, 10);
    expect(t.barrelPitch).toBeCloseTo(expected, 5);
    expect(t.barrelPitch).toBeGreaterThan(0);

    t.aimDir(dir);
    expect(dir.y).toBeCloseTo(Math.sin(expected), 5);
    expect(dir.y).toBeGreaterThan(0);
  });

  it('цель ниже дула → ствол опускается, вектор с −y', () => {
    const t = shooter();
    // Цель на (0, -3, 8): dy=−5, distXZ=8 → atan2(−5,8)=−0.558 → кламп по −DEP=−0.25.
    t.setPitchAim(target.set(0, -3, 8));
    TankAimSystem.updateOne(t, 1);
    expect(t.barrelPitch).toBeCloseTo(-DEP, 5);
    t.aimDir(dir);
    expect(dir.y).toBeCloseTo(Math.sin(-DEP), 5);
  });

  it('потеря цели (clearPitchAim) → тангаж доводится обратно к горизонту', () => {
    const t = shooter();
    t.setPitchAim(target.set(0, 5, 10));
    TankAimSystem.updateOne(t, 1); // подняли ствол
    expect(t.barrelPitch).toBeGreaterThan(0);

    t.clearPitchAim();
    expect(t.pitchLocked).toBe(false);
    for (let i = 0; i < 100; i++) TankAimSystem.updateOne(t, 0.05);
    expect(t.barrelPitch).toBe(0);
    t.aimDir(dir);
    expect(dir.y).toBe(0);
  });
});
