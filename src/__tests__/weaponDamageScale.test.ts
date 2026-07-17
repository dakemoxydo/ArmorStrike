/**
 * M6: railgun/flamethrower damage must follow owner.params.damage (wave scale),
 * not only WEAPON_TUNING. Exercises shipped resolveWeaponDamage used by both weapons.
 */
import { describe, it, expect } from 'vitest';
import { WEAPON_TUNING } from '../core/catalog';
import { resolveWeaponDamage } from '../game/weapons/weaponDamage';

/** Same scale formula as botSpawn / createTankEntity damageScale for wave w. */
function botDamageScale(wave: number): number {
  return 0.7 + wave * 0.08;
}

describe('resolveWeaponDamage (M6 — shipped by Railgun + Flamethrower)', () => {
  it('uses scaled params.damage for late-wave railgun bot (not raw tuning 85)', () => {
    const scale = botDamageScale(5);
    const paramsDamage = Math.round(WEAPON_TUNING.railgun.damage * scale);
    expect(paramsDamage).not.toBe(WEAPON_TUNING.railgun.damage);

    const dmg = resolveWeaponDamage(paramsDamage, WEAPON_TUNING.railgun.damage);
    expect(dmg).toBe(paramsDamage);
    expect(dmg).toBeGreaterThan(WEAPON_TUNING.railgun.damage);
  });

  it('uses scaled params.damage for flamethrower tick (not raw damagePerTick 12)', () => {
    const scale = botDamageScale(8);
    const paramsDamage = Math.round(WEAPON_TUNING.flamethrower.damagePerTick * scale);
    expect(paramsDamage).not.toBe(WEAPON_TUNING.flamethrower.damagePerTick);

    const dmg = resolveWeaponDamage(paramsDamage, WEAPON_TUNING.flamethrower.damagePerTick);
    expect(dmg).toBe(paramsDamage);
  });

  it('falls back to tuning when params.damage missing or non-positive', () => {
    expect(resolveWeaponDamage(undefined, WEAPON_TUNING.railgun.damage)).toBe(
      WEAPON_TUNING.railgun.damage,
    );
    expect(resolveWeaponDamage(0, WEAPON_TUNING.flamethrower.damagePerTick)).toBe(
      WEAPON_TUNING.flamethrower.damagePerTick,
    );
    expect(resolveWeaponDamage(-1, 32)).toBe(32);
  });

  it('player/catalog path: params.damage equals tuning base → same value', () => {
    // Player factory sets damage from turret catalog (= tuning base at scale 1).
    const playerRail = WEAPON_TUNING.railgun.damage;
    expect(resolveWeaponDamage(playerRail, WEAPON_TUNING.railgun.damage)).toBe(playerRail);
  });

  it('early wave scale can be below catalog base (damageScale 0.7+w*0.08 at w=1)', () => {
    const scale = botDamageScale(1);
    const paramsDamage = Math.round(WEAPON_TUNING.railgun.damage * scale);
    expect(paramsDamage).toBeLessThan(WEAPON_TUNING.railgun.damage);
    expect(resolveWeaponDamage(paramsDamage, WEAPON_TUNING.railgun.damage)).toBe(paramsDamage);
  });
});
