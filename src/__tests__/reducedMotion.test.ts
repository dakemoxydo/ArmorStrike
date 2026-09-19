// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as THREE from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { prefersReducedMotion, REDUCED_MOTION_QUERY } from '../lib/reducedMotion';
import { CameraShake } from '../game/effects/CameraShake';
import { PlayingCameraMode } from '../game/camera/PlayingCameraMode';

const root = resolve(__dirname, '../..');
function readSrc(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8');
}

/** Подмена window.matchMedia (jsdom её не имеет — helpers обязаны вернуть false без неё). */
function stubMatchMedia(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
    })),
  });
}

afterEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: undefined,
  });
});

describe('prefersReducedMotion — единый гейт вестибулярки (MED-2)', () => {
  it('возвращает false без matchMedia (jsdom/SSR)', () => {
    expect(prefersReducedMotion()).toBe(false);
  });

  it('читает matches живьём, без кеша', () => {
    stubMatchMedia(true);
    expect(prefersReducedMotion()).toBe(true);
    expect(window.matchMedia).toHaveBeenCalledWith(REDUCED_MOTION_QUERY);

    stubMatchMedia(false);
    expect(prefersReducedMotion()).toBe(false);
  });

  it('возвращает false при бросающем matchMedia (защита hot path)', () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: () => {
        throw new Error('no media');
      },
    });
    expect(prefersReducedMotion()).toBe(false);
  });
});

describe('CameraShake под reduce — shake=0 (MED-2)', () => {
  it('add не копит травму при reduce', () => {
    stubMatchMedia(true);
    const shake = new CameraShake();
    shake.add(0.6);
    expect(shake.trauma).toBe(0);
  });

  it('getShake пишет нули при травме, накопленной до включения reduce', () => {
    stubMatchMedia(false);
    const shake = new CameraShake();
    shake.add(0.6);
    expect(shake.trauma).toBeGreaterThan(0);

    stubMatchMedia(true);
    const out = new THREE.Vector3(1, 1, 1);
    const roll = shake.getShake(out, 1.23);
    expect(roll).toBe(0);
    expect(out.x).toBe(0);
    expect(out.y).toBe(0);
    expect(out.z).toBe(0);
  });

  it('без reduce шейк ненулевой (регрессия нормального пути)', () => {
    stubMatchMedia(false);
    const shake = new CameraShake();
    shake.add(0.6);
    const out = new THREE.Vector3();
    shake.getShake(out, 1.23);
    expect(out.length()).toBeGreaterThan(0);
  });
});

describe('PlayingCameraMode под reduce — FOV-punch заглушен (MED-2)', () => {
  function harness() {
    const fovCalls: Array<{ target: number; rate: number }> = [];
    const rig = {
      camPos: { x: 0, y: 0, z: 0 },
      camLook: { x: 0, y: 0, z: 0 },
      avoidObstacles: (_hx: number, _hz: number, dx: number, dz: number, dy: number) => ({ dx, dz, dy }),
      applyFov: (targetFov: number, _dt: number, rate = 5) => {
        fovCalls.push({ target: targetFov, rate });
      },
    };
    // Не-гейтящий порт: отдаёт bias как есть — гейт обязан быть в моде камеры.
    const effects = {
      getFovBias: () => 6.5,
      getShake: () => 0,
    };
    const params = {
      player: {
        position: { x: 0, z: 0 },
        alive: true,
        speed: 0,
        boostActive: false,
        params: { speed: 10 },
      },
      look: { yaw: 0, pitch: 0 },
      colliders: [],
      effects,
    };
    return { rig, params, fovCalls };
  }

  it('при reduce weapon-bias игнорируется (база 58°)', () => {
    stubMatchMedia(true);
    const { rig, params, fovCalls } = harness();
    new PlayingCameraMode().update(1 / 60, params as any, rig as any);
    expect(fovCalls.length).toBe(1);
    expect(fovCalls[0].target).toBeCloseTo(58, 6);
    expect(fovCalls[0].rate).toBe(5);
  });

  it('без reduce bias применяется (регрессия нормального пути)', () => {
    stubMatchMedia(false);
    const { rig, params, fovCalls } = harness();
    new PlayingCameraMode().update(1 / 60, params as any, rig as any);
    expect(fovCalls.length).toBe(1);
    expect(fovCalls[0].target).toBeCloseTo(64.5, 6);
    expect(fovCalls[0].rate).toBe(14);
  });
});

describe('MED-2 source pins: гейт стоит во всех трёх файлах', () => {
  it('Effects глушит shake/punch/tighten/bias', () => {
    const src = readSrc('src/game/effects.ts');
    expect(src).toMatch(/prefersReducedMotion/);
    // addShake + getShake + addFovPunch + setFovTighten + getFovBias
    expect(src.match(/prefersReducedMotion\(\)/g)?.length ?? 0).toBeGreaterThanOrEqual(5);
  });

  it('CameraShake и PlayingCameraMode ссылаются на единый гейт', () => {
    expect(readSrc('src/game/effects/CameraShake.ts')).toMatch(/prefersReducedMotion/);
    expect(readSrc('src/game/camera/PlayingCameraMode.ts')).toMatch(/prefersReducedMotion/);
    expect(readSrc('src/lib/reducedMotion.ts')).toMatch(/REDUCED_MOTION_QUERY/);
  });
});

describe('cheap-LOW: aria-label без роли получили role="img" (как K5)', () => {
  it('HUD cp-points объявлен', () => {
    expect(readSrc('src/components/HUD.tsx')).toMatch(/cp-points[^>]*role="img"/);
  });

  it('HudWeapon weapon-panel объявлен', () => {
    expect(readSrc('src/components/hud/HudWeapon.tsx')).toMatch(/weapon-panel[\s\S]{0,200}role="img"/);
  });
});
