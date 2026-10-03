import { describe, it, expect } from 'vitest';
import { TURRETS, TURRET_IDS, WEAPON_TUNING } from '../core/catalog';

describe('catalog balance single source of truth', () => {
  it('TURRETS боевые поля совпадают с WEAPON_TUNING', () => {
    expect(TURRETS.railgun.damage).toBe(WEAPON_TUNING.railgun.damage);
    expect(TURRETS.railgun.range).toBe(WEAPON_TUNING.railgun.range);
    expect(TURRETS.railgun.fullReload).toBe(WEAPON_TUNING.railgun.reloadTime);

    expect(TURRETS.flamethrower.damage).toBe(WEAPON_TUNING.flamethrower.damagePerTick);
    expect(TURRETS.flamethrower.range).toBe(WEAPON_TUNING.flamethrower.range);
    expect(TURRETS.flamethrower.magazine).toBe(WEAPON_TUNING.flamethrower.energyMax);

    expect(TURRETS.cannon.damage).toBe(WEAPON_TUNING.cannon.damage);
    expect(TURRETS.cannon.shotCooldown).toBe(WEAPON_TUNING.cannon.shotCooldown);
    expect(TURRETS.cannon.magazine).toBe(WEAPON_TUNING.cannon.magazine);
    expect(TURRETS.cannon.fullReload).toBe(WEAPON_TUNING.cannon.reloadTime);
    expect(TURRETS.cannon.range).toBe(WEAPON_TUNING.cannon.range);

    const is = WEAPON_TUNING.isida;
    // «Изида»: damage в каталоге — тиковый (damagePerSec × tickRate), округлённый;
    // магазин = баллон энергии; range = дальность луча.
    expect(TURRETS.isida.damage).toBe(Math.round(is.damagePerSec * is.tickRate));
    expect(TURRETS.isida.range).toBe(is.range);
    expect(TURRETS.isida.magazine).toBe(is.energyMax);
    expect(TURRETS.isida.weaponType).toBe('isida');

    // Самоотдача у башен в каталоге намеренно НЕ хранится: оружия передают её в
    // `onFired` явными константами (`WEAPON_TUNING.*.selfRecoil` /
    // `selfRecoilBot` / `knockback` / `botKnockback`), а `knockback` у рельсы и
    // пушки — это импульс ПО ЦЕЛИ, а не владельцу. Пин против возврата поля.
    for (const id of TURRET_IDS) {
      expect(Object.prototype.hasOwnProperty.call(TURRETS[id], 'recoil'), `recoil у ${id}`).toBe(false);
    }
  });
});

describe('TurretDef структурные инварианты (все башни)', () => {
  it('ключ каталога совпадает с полем id', () => {
    for (const id of TURRET_IDS) expect(TURRETS[id].id, `id у ${id}`).toBe(id);
  });

  it('дальность, боезапас и доводы положительны у каждой башни', () => {
    for (const id of TURRET_IDS) {
      const t = TURRETS[id];
      // railgun.range = Infinity (хитскан) — проходит как «больше нуля».
      expect(t.range, `range у ${id}`).toBeGreaterThan(0);
      expect(t.magazine, `magazine у ${id}`).toBeGreaterThan(0);
      expect(t.damage, `damage у ${id}`).toBeGreaterThan(0);
      expect(t.turretSpeed, `turretSpeed у ${id}`).toBeGreaterThan(0);
      expect(t.pitchSpeed, `pitchSpeed у ${id}`).toBeGreaterThan(0);
      expect(t.elevationAngle, `elevationAngle у ${id}`).toBeGreaterThan(0);
      expect(t.depressionAngle, `depressionAngle у ${id}`).toBeGreaterThan(0);
    }
  });

  it('cadence-поля неотрицательны; у луч-башен каденция weapon-internal (= 0)', () => {
    // Пушка — единственная башня с внешним межвыстреловым кадром из каталога.
    const externalCadence = new Set(['cannon']);
    // Без магазина (только баллон энергии) — fullReload = 0: огнемёт и «Изида».
    const noMagazine = new Set(['flamethrower', 'isida']);
    for (const id of TURRET_IDS) {
      const t = TURRETS[id];
      expect(t.shotCooldown, `shotCooldown у ${id}`).toBeGreaterThanOrEqual(0);
      expect(t.fullReload, `fullReload у ${id}`).toBeGreaterThanOrEqual(0);
      if (externalCadence.has(id)) {
        expect(t.shotCooldown, `shotCooldown у ${id}`).toBeGreaterThan(0);
      } else {
        expect(t.shotCooldown, `shotCooldown у ${id} должен быть 0`).toBe(0);
      }
      if (noMagazine.has(id)) {
        expect(t.fullReload, `fullReload у ${id} должен быть 0`).toBe(0);
      } else {
        expect(t.fullReload, `fullReload у ${id}`).toBeGreaterThan(0);
      }
    }
  });
});