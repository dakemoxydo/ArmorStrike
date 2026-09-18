/**
 * J-batch low fixes (аудит 2026-09-15) — поведенческие пины.
 *   E6: TankFxSystem аккумуляторы дыма/пыли вычитают порог (FPS- independent rate)
 *   G3: PlayerInputStage не играет щелчок «перезарядки» на низком баллоне луч-башен
 */
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as THREE from 'three';
import { TankFxSystem } from '../game/engine/systems/TankFxSystem';
import { PlayerInputStage } from '../game/engine/stages/PlayerInputStage';
import { PhysicsSystem } from '../game/engine/systems/PhysicsSystem';
import type { Collider } from '../game/engine/physics';
import { isBeamTurretId } from '../ui/hudPresentation';
import { TANK, BOOST } from '../game/constants';
import type { FxBody } from '../game/tank/simPorts';
import type { EffectsPort } from '../game/ports/EffectsPort';
import type { FrameContext } from '../game/engine/stages/types';
import type { AudioPort } from '../game/ports/AudioPort';
import type { PlayerController } from '../game/PlayerController';
import type { TankEntity } from '../game/Tank';

describe('E6: TankFxSystem accumulator -= threshold', () => {
  const SMOKE_FRAC_TRIGGERED = 0.11;

  function fxTank(speed: number, health: number): FxBody {
    return {
      alive: true,
      health,
      maxHealth: 100,
      position: new THREE.Vector3(0, 0, 0),
      speed,
      yaw: 0,
      params: { speed: 15 },
      fx: { smokeAcc: 0, dustAcc: 0 },
    } as unknown as FxBody;
  }

  it('large dt keeps the remainder, so a following small dt still emits promptly', () => {
    const effects = {
      tankSmoke: vi.fn(),
      tankDust: vi.fn(),
    } as unknown as EffectsPort;
    // dt=0.20 (> SMOKE threshold 0.11): one puff, remainder ~0.09 retained.
    const t = fxTank(0, 5); // low health (speed 0 → no dust)
    TankFxSystem.update([t], effects, 0.20);
    expect(t.fx.smokeAcc).toBeCloseTo(0.20 - SMOKE_FRAC_TRIGGERED, 5);
    // Old `=0` would have dropped this to 0; the retained ~0.09 means a tiny
    // dt crosses the threshold and emits again without losing accumulated time.
    TankFxSystem.update([t], effects, 0.03);
    expect(t.fx.smokeAcc).toBeCloseTo(0.20 + 0.03 - 2 * SMOKE_FRAC_TRIGGERED, 5);
    expect(effects.tankSmoke).toHaveBeenCalledTimes(2);
  });

  it('emission rate is stable across a 1s window regardless of step size', () => {
    const run1 = (dt: number) => {
      const tankSmoke = vi.fn();
      const effects = { tankSmoke, tankDust: vi.fn() } as unknown as EffectsPort;
      const t = fxTank(0, 5);
      for (let acc = 0; acc < 1 - 1e-9; acc += dt) TankFxSystem.update([t], effects, dt);
      return tankSmoke.mock.calls.length;
    };
    // 1 s at 60 fps vs 20 fps → same smoke count (≈1/0.11), not fewer on big dt.
    const at60 = run1(1 / 60);
    const at20 = run1(1 / 20);
    expect(Math.abs(at60 - at20)).toBeLessThanOrEqual(1);
  });

  it('dust accumulator also subtracts threshold (not reset)', () => {
    const effects = { tankSmoke: vi.fn(), tankDust: vi.fn() } as unknown as EffectsPort;
    const t = fxTank(12, 100); // fast, healthy → dust only
    TankFxSystem.update([t], effects, 0.25); // dustAcc += 0.25*(12/15)=0.20 > 0.1
    expect(t.fx.dustAcc).toBeGreaterThan(0); // remainder kept
    expect(t.fx.dustAcc).toBeCloseTo(0.2 - 0.1, 5);
  });
});

describe('G3: reload click gated for beam turrets', () => {
  function stageScenario(turretId: string, ammo: Record<string, unknown>) {
    const audio = { reload: vi.fn() } as unknown as AudioPort;
    const input = { update: vi.fn(), enabled: true } as unknown as PlayerController;
    const stage = new PlayerInputStage(input, audio);
    const player = {
      alive: true,
      turretId,
      weapon: { getAmmoState: () => ammo },
    } as unknown as TankEntity;
    const ctx = {
      player,
      prevReloading: { value: false },
    } as unknown as FrameContext;
    stage.update(ctx);
    return audio.reload;
  }

  it('cannon low-magazine reload still plays the click', () => {
    const click = stageScenario('cannon', { reloading: true, isCharging: false });
    expect(click).toHaveBeenCalledTimes(1);
  });

  it('isida low balloon (reloading) does NOT play the magazine click', () => {
    const click = stageScenario('isida', { reloading: true, isCharging: false });
    expect(click).not.toHaveBeenCalled();
  });

  it('flamethrower low balloon does NOT play the click', () => {
    const click = stageScenario('flamethrower', { reloading: true, isCharging: false });
    expect(click).not.toHaveBeenCalled();
  });

  it('railgun charge (isCharging) never clicks (pre-existing gate intact)', () => {
    const click = stageScenario('railgun', { reloading: true, isCharging: true });
    expect(click).not.toHaveBeenCalled();
  });

  it('isBeamTurretId classifies exactly flamethrower + isida', () => {
    expect(isBeamTurretId('flamethrower')).toBe(true);
    expect(isBeamTurretId('isida')).toBe(true);
    expect(isBeamTurretId('railgun')).toBe(false);
    expect(isBeamTurretId('cannon')).toBe(false);
  });
});

describe('C3: таран в упор в тонкую опору на макс. бусте', () => {
  // Опора уровня city-пиллона: 0.7 м толщины (Arena_Physics bounds). Скорость —
  // самый быстрый корпус (16) × нитро (1.5) = 24 м/с; dt — от «плохого» 1/20
  // до 1/60. Инвариант: за 2 с прямого тарана танк не оказывается за стеной.
  const MAX_BOOST_SPEED = 16 * BOOST.multiplier;

  function thinWall(): Collider {
    return {
      id: 1, minX: 0, maxX: 0.7, minZ: -20, maxZ: 20, height: 5, kind: 'block',
      active: true, blocksShots: true, blocksSight: true, destructible: false,
    };
  }

  for (const dt of [1 / 20, 1 / 30, 1 / 60]) {
    it(`не проходит насквозь при dt=${dt.toFixed(4)}`, () => {
      const wall = thinWall();
      const t = {
        alive: true, radius: TANK.radius,
        position: { x: -14, z: 0.35 }, yaw: 0, speed: MAX_BOOST_SPEED,
      };
      const tanks = [t] as unknown as Parameters<typeof PhysicsSystem.resolveCollisions>[0];
      const steps = Math.ceil(2 / dt);
      for (let i = 0; i < steps; i++) {
        t.position.x += MAX_BOOST_SPEED * dt; // газ в пол, руль прямо
        PhysicsSystem.resolveCollisions(tanks, [wall], dt);
        expect(t.position.x, `пролез сквозь опору на шаге ${i}`).toBeLessThan(0.7 + TANK.radius);
      }
      // Итог: прижат передней кромкой к стене (x = minX − r), не внутри.
      expect(t.position.x).toBeLessThanOrEqual(-TANK.radius + 0.05);
    });
  }
});

describe('D6/B10: source pins', () => {
  const read = (rel: string) => readFileSync(resolve(__dirname, '../..', rel), 'utf8');

  it('D6: BotAiStage guard compares size AND first bot id', () => {
    const src = read('src/game/engine/stages/BotAiStage.ts');
    expect(src).toMatch(/const firstBotId = rosterSize \? this\.bots\.bots\[0\]\.tank\.id : -1/);
    expect(src).toMatch(/this\._rosterSize !== rosterSize \|\| this\._firstBotId !== firstBotId/);
    expect(src).toMatch(/onRosterCleared\(\)[\s\S]*?this\._firstBotId = -1;/);
  });

  it('B10: CaptureMarkers redraws the letter canvas only on color change', () => {
    const src = read('src/game/match/CaptureMarkers.ts');
    expect(src).toMatch(/if \(letterCol !== e\.lastLetterCol\)/);
    expect(src).toMatch(/lastLetterCol: -1/);
  });

  it('J13: start.bat honors --no-open in both branches; node gate checks minor too', () => {
    const bat = read('start.bat');
    expect((bat.match(/--no-open/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect(bat).toMatch(/NODE_MAJOR% EQU 20 if %NODE_MINOR% GEQ 19/);
    expect(bat).toMatch(/NODE_MAJOR% EQU 22 if %NODE_MINOR% GEQ 12/);
    expect(read('.gitignore')).not.toMatch(/PROGRESS\.md/);
  });

  it('J13-hotfix: echo/rem lines have no unescaped parens (cmd parses blocks eagerly)', () => {
    // Регрессия живого креша: `echo ...(text)...` внутри if-блока ронял весь
    // start.bat на парсинге ("was unexpected at this time") даже при невыбранной
    // ветке. Инвариант: в echo/rem строках скобки только экранированные ^(^.
    const bat = read('start.bat');
    for (const line of bat.split(/\r?\n/)) {
      if (!/^\s*(echo|rem)\b/.test(line) && !/^\s*::/.test(line)) continue;
      const stripped = line.replace(/\^[()]/g, '');
      expect(stripped, `unescaped paren in: ${line.trim()}`).not.toMatch(/[()]/);
    }
  });

  it('F5: projectile wall test sweeps the pre-step→step segment (no ghost pass)', () => {
    const src = read('src/game/engine/Projectile.ts');
    expect(src).toMatch(/segmentHitsCollider\(px, pz, pos\.x, pos\.z, c\)/);
  });

  it('B9: ParticleEffects disposes the shared geometries it owns', () => {
    const src = read('src/game/effects/particles.ts');
    expect(src).toMatch(/this\.sharedGeos = \[sphereGeo, ringGeo, circleGeo\]/);
    expect(src).toMatch(/for \(const g of this\.sharedGeos\) g\.dispose\(\)/);
  });
});
