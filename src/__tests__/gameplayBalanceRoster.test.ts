import { describe, it, expect } from 'vitest';
import { HULLS, WEAPON_TUNING } from '../core/catalog';
import { TankCombatTimersSystem } from '../game/engine/systems/TankCombatTimersSystem';
import { BOT_TURRETS } from '../game/match/rosterSpawn';
import { REPAIR_TUNING } from '../game/tuning';

describe('Gameplay Balance & Out-of-Combat Repair Invariants', () => {
  it('никакой танк с полным HP не уничтожается с одного выстрела (No One-Shot Kill)', () => {
    for (const hullId of Object.keys(HULLS) as (keyof typeof HULLS)[]) {
      const hull = HULLS[hullId];
      // Проверяем против максимального разового урона снайперов
      expect(hull.maxHealth).toBeGreaterThan(WEAPON_TUNING.gauss.damage);
      expect(hull.maxHealth).toBeGreaterThan(WEAPON_TUNING.railgun.damage);
      expect(hull.maxHealth).toBeGreaterThan(WEAPON_TUNING.cannon.damage);
    }
    // Speedy имеет 120 HP и выживает после Гаусса (65) и Рельсы (85)
    expect(HULLS.speedy.maxHealth).toBe(120);
    expect(WEAPON_TUNING.gauss.damage).toBe(65);
    expect(WEAPON_TUNING.railgun.damage).toBe(85);
  });

  it('пушка «Смоки» имеет сбалансированный урон, магазин и кулдаун', () => {
    expect(WEAPON_TUNING.cannon.magazine).toBe(6);
    expect(WEAPON_TUNING.cannon.reloadTime).toBe(2.2);
    expect(WEAPON_TUNING.cannon.shotCooldown).toBe(0.38);
    expect(WEAPON_TUNING.cannon.damage).toBe(25);
    expect(WEAPON_TUNING.cannon.speed).toBe(54);
    expect(WEAPON_TUNING.cannon.splashDmg).toBe(12);
    expect(WEAPON_TUNING.cannon.knockback).toBeLessThanOrEqual(3.0);
  });

  it('Out-of-Combat ремонт активируется после 5 секунд без урона с процентной частью', () => {
    expect(REPAIR_TUNING.outOfCombatDelaySec).toBe(5.0);
    expect(REPAIR_TUNING.baseRatePerSec).toBe(8.0);
    expect(REPAIR_TUNING.maxHealthFracPerSec).toBe(0.04);

    // В бою (timeSinceDamaged < 5.0) здоровье не восстанавливается
    const bodyInCombat = {
      fireTimer: 1.0,
      health: 50,
      maxHealth: 180,
      timeSinceDamaged: 2.0,
      alive: true,
    };
    TankCombatTimersSystem.updateOne(bodyInCombat as any, 1.0);
    expect(bodyInCombat.health).toBe(50); // Без отхила
    expect(bodyInCombat.timeSinceDamaged).toBe(3.0);

    // Вне боя (timeSinceDamaged >= 5.0) активируется плавный ремонт: 8 + 180×0.04 = 15.2 HP/с
    const bodyOutOfCombat = {
      fireTimer: 0,
      health: 50,
      maxHealth: 180,
      timeSinceDamaged: 5.0,
      alive: true,
    };
    TankCombatTimersSystem.updateOne(bodyOutOfCombat as any, 1.0);
    expect(bodyOutOfCombat.health).toBeCloseTo(65.2, 1);
    expect(bodyOutOfCombat.timeSinceDamaged).toBe(6.0);

    // Здоровье не превышает maxHealth
    bodyOutOfCombat.health = 175;
    TankCombatTimersSystem.updateOne(bodyOutOfCombat as any, 1.0);
    expect(bodyOutOfCombat.health).toBe(180);

    // Мёртвый танк не ремонтируется
    const bodyDead = {
      fireTimer: 0,
      health: 0,
      maxHealth: 180,
      timeSinceDamaged: 10.0,
      alive: false,
    };
    TankCombatTimersSystem.updateOne(bodyDead as any, 1.0);
    expect(bodyDead.health).toBe(0);
  });

  it('ботам доступны все 5 башен каталога', () => {
    expect(BOT_TURRETS).toEqual(['railgun', 'flamethrower', 'cannon', 'gauss', 'isida']);
  });
});
