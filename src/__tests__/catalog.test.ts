import { describe, it, expect } from 'vitest';
import { TURRETS, WEAPON_TUNING } from '../core/catalog';

describe('catalog balance single source of truth', () => {
  it('TURRETS боевые поля совпадают с WEAPON_TUNING', () => {
    expect(TURRETS.railgun.damage).toBe(WEAPON_TUNING.railgun.damage);
    expect(TURRETS.railgun.range).toBe(WEAPON_TUNING.railgun.range);
    expect(TURRETS.railgun.fullReload).toBe(WEAPON_TUNING.railgun.reloadTime);
    expect(TURRETS.railgun.recoil).toBe(WEAPON_TUNING.railgun.knockback);

    expect(TURRETS.flamethrower.damage).toBe(WEAPON_TUNING.flamethrower.damagePerTick);
    expect(TURRETS.flamethrower.range).toBe(WEAPON_TUNING.flamethrower.range);
    expect(TURRETS.flamethrower.magazine).toBe(WEAPON_TUNING.flamethrower.energyMax);
    expect(TURRETS.flamethrower.recoil).toBe(WEAPON_TUNING.flamethrower.knockback);

    expect(TURRETS.cannon.damage).toBe(WEAPON_TUNING.cannon.damage);
    expect(TURRETS.cannon.shotCooldown).toBe(WEAPON_TUNING.cannon.shotCooldown);
    expect(TURRETS.cannon.magazine).toBe(WEAPON_TUNING.cannon.magazine);
    expect(TURRETS.cannon.fullReload).toBe(WEAPON_TUNING.cannon.reloadTime);
    expect(TURRETS.cannon.range).toBe(WEAPON_TUNING.cannon.range);
    expect(TURRETS.cannon.recoil).toBe(WEAPON_TUNING.cannon.knockback);
  });
});
