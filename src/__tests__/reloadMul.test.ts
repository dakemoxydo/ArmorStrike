// ===== ownerReloadMul — шов падов каденции ботов (iter 15) =====
// Через этот множитель railgun/flamer боты стреляют медленнее игрока:
// rosterSpawn ставит reloadSpeedMul = 1/firePadForRole(role), а оружие
// делит charge/reload (рельса) и множит восстановление батареи (огнемёт).
import { describe, expect, it } from 'vitest';
import { ownerReloadMul } from '../game/weapons/reloadMul';
import type { WeaponOwner } from '../game/weapons/types';
import { firePadForRole } from '../game/aiRoles';

function owner(mul: number | undefined): WeaponOwner {
  return { reloadSpeedMul: mul } as WeaponOwner;
}

describe('ownerReloadMul', () => {
  it('undefined / 0 / отрицательный → 1 (игрок и стандарт-боты без пада)', () => {
    expect(ownerReloadMul(owner(undefined))).toBe(1);
    expect(ownerReloadMul(owner(0))).toBe(1);
    expect(ownerReloadMul(owner(-2))).toBe(1);
  });

  it('положительный множитель проходит как есть', () => {
    expect(ownerReloadMul(owner(1.5))).toBe(1.5);
  });

  it('бот-снайпер: mul = 1/1.35 — рельса медленнее в firePad раз', () => {
    const mul = ownerReloadMul(owner(1 / firePadForRole('sniper')));
    expect(mul).toBeCloseTo(0.7407);
    // Перезарядка рельсы: 4.8 / mul ≈ 6.48 с; заряд: 1.1 / mul ≈ 1.485 с.
    expect(4.8 / mul).toBeCloseTo(6.48);
    expect(1.1 / mul).toBeCloseTo(1.485);
  });

  it('бот-штурм: mul = 1/1.15 — батарея огнемёта восстанавливается медленнее', () => {
    const mul = ownerReloadMul(owner(1 / firePadForRole('assault')));
    expect(22 * mul).toBeCloseTo(19.13);
  });
});
