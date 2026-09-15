import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import { CombatSystem } from '../game/CombatSystem';
import { TankEntity } from '../game/Tank';
import { TankCombatTimersSystem } from '../game/engine/systems/TankCombatTimersSystem';
import { hudNeedsRender } from '../ui/hudRenderGate';
import type { HudSnapshot } from '../game/types';

function makeMockTank(over: Partial<TankEntity> = {}): TankEntity {
  const t = new TankEntity(
    'Tester',
    true,
    { maxHealth: 180, speed: 12.5, reverseSpeed: 8, turnSpeed: 2.4, turretSpeed: 8, damage: 20, shotCooldown: 0.38 },
    { group: new THREE.Group(), hull: new THREE.Group(), turret: new THREE.Group(), barrelGroup: new THREE.Group(), muzzle: new THREE.Object3D() } as any,
  );
  Object.assign(t, over);
  return t;
}

describe('Combat Clarity & Directional Feedback', () => {
  it('направление playerHit.dir рассчитывается относительно aimYaw (камеры), а не корпуса', () => {
    const emitted: any[] = [];
    const combat = new CombatSystem({
      arena: { damageBlock: vi.fn() } as any,
      effects: { addShake: vi.fn(), explosion: vi.fn(), debris: vi.fn(), spawnWreck: vi.fn() } as any,
      audio: { hitPlayer: vi.fn(), explosion: vi.fn() } as any,
      emit: (e) => emitted.push(e),
      onPlayerDeath: vi.fn(),
    });

    const player = makeMockTank({ isPlayer: true });
    player.position.set(0, 0, 0);
    // Корпус смотрит на Восток (+X, yaw = PI/2)
    player.yaw = Math.PI / 2;
    // Но камера/прицел смотрит на Север (+Z, aimYaw = 0)
    player.aimYaw = 0;

    // Враг стреляет с Севера (0, 0, 10) — прямо перед глазами камеры
    const shooterNorth = makeMockTank({ isPlayer: false });
    shooterNorth.position.set(0, 0, 10);

    combat.onTankDamaged(player, 10, shooterNorth);

    expect(emitted).toHaveLength(1);
    expect(emitted[0].type).toBe('playerHit');
    // Относительно камеры (aimYaw = 0) стрелок прямо спереди: dir ≈ 0
    expect(emitted[0].dir).toBeCloseTo(0, 2);

    // Враг стреляет с Востока (10, 0, 0) — справа от камеры
    emitted.length = 0;
    const shooterEast = makeMockTank({ isPlayer: false });
    shooterEast.position.set(10, 0, 0);

    combat.onTankDamaged(player, 10, shooterEast);

    expect(emitted).toHaveLength(1);
    // Относительно камеры на север, стрелок на востоке — справа (+PI/2)
    expect(emitted[0].dir).toBeCloseTo(Math.PI / 2, 2);
  });
});

describe('Tank Out-of-Combat Repair Lifecycle', () => {
  it('получение урона сбрасывает timeSinceDamaged в 0', () => {
    const tank = makeMockTank();
    tank.timeSinceDamaged = 15;

    tank.takeDamage(30, 99);
    expect(tank.health).toBe(150);
    expect(tank.timeSinceDamaged).toBe(0);
  });

  it('тиковый ремонт восстанавливает здоровье после 5 секунд без урона', () => {
    const tank = makeMockTank();
    tank.health = 100;
    tank.timeSinceDamaged = 4.5;

    // 0.4 секунды спустя: timeSinceDamaged = 4.9с (< 5.0с) — отхила нет
    TankCombatTimersSystem.updateOne(tank, 0.4);
    expect(tank.health).toBe(100);
    expect(tank.timeSinceDamaged).toBeCloseTo(4.9, 3);

    // Ещё 1.0 секунда: timeSinceDamaged = 5.9с (>= 5.0с) — отхил 8 + 180×0.04 = 15.2 HP
    TankCombatTimersSystem.updateOne(tank, 1.0);
    expect(tank.health).toBeCloseTo(115.2, 1);
  });
});

describe('HUD Render Gate — incomingLock channel', () => {
  it('incomingLock является императивным ref-painted каналом и не форсит React-рендер', () => {
    const base: HudSnapshot = {
      mode: 'playing', paused: false, health: 100, maxHealth: 100, ammo: 6, magazine: 6,
      reloading: false, reloadProgress: 0, isCharging: false, boost: 1, score: 0, kills: 0,
      deaths: 0, enemiesAlive: 4, alive: true, respawnInSec: 0, timeSec: 0, muted: false,
      turretId: 'railgun', weaponName: 'Railgun', weaponLabel: 'РЕЛЬСА',
      weaponAccentClass: 'text-cyan-300', showScore: false,
      scoreboard: [], matchMode: 'deathmatch', winTarget: 30, timeLimitSec: 720,
      teamKillsAlpha: 0, teamKillsBravo: 0, teamScoreAlpha: 0, teamScoreBravo: 0,
      capturePoints: [], crossX: 50, crossY: 50, incomingLock: false,
    };

    expect(hudNeedsRender(base, { ...base, incomingLock: true })).toBe(false);
  });
});
