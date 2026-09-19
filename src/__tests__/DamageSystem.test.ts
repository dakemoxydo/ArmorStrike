import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import { createDamageSystem } from '../core/DamageSystem';
import { RESIST_MULTIPLIER_MAX, RESIST_MULTIPLIER_MIN, resistMultiplier } from '../core/damageRolls';
import type { ArenaLike, TankLike } from '../core/types';

let _tid = 1;
function makeTank(over: Partial<TankLike> = {}): TankLike & { health: number; alive: boolean } {
  return {
    id: _tid++, name: 'T', isPlayer: false, health: 100, alive: true, radius: 1.5,
    knockback: new THREE.Vector3(), position: new THREE.Vector3(),
    yaw: 0, teamId: null, invulnT: 0,
    takeDamage: vi.fn(function (this: any, d: number) { this.health -= d; if (this.health <= 0) this.alive = false; }) as any,
    ...over,
  } as any;
}

function makeArena(hp: number): { arena: ArenaLike; blocks: Map<number, { hp: number; active: boolean }> } {
  const blocks = new Map<number, { hp: number; active: boolean }>();
  blocks.set(1, { hp, active: true });
  const arena: ArenaLike = {
    damageBlock: (id: number, dmg: number) => {
      const b = blocks.get(id);
      if (!b) return null;
      b.hp -= dmg;
      if (b.hp <= 0) { b.active = false; return 'destroyed'; }
      return 'hit';
    },
  };
  return { arena, blocks };
}

describe('createDamageSystem', () => {
  it('применяет урон к цели и зовёт onTankDamaged', () => {
    const target = makeTank();
    const source = makeTank();
    const onTankDamaged = vi.fn();
    const ds = createDamageSystem({} as any, { onTankDamaged, onBlockDestroyed: vi.fn() });
    ds.applyDamage(target, 30, source);
    expect(target.takeDamage).toHaveBeenCalledWith(30, source.id);
    expect(onTankDamaged).toHaveBeenCalled();
    expect(target.health).toBe(70);
  });

  it('не бьёт мёртвых (защита от повторных эффектов/скоринга)', () => {
    const target = makeTank({ alive: false, health: 0 });
    const onTankDamaged = vi.fn();
    const ds = createDamageSystem({} as any, { onTankDamaged, onBlockDestroyed: vi.fn() });
    ds.applyDamage(target, 30, makeTank());
    expect(onTankDamaged).not.toHaveBeenCalled();
  });

  it('C2/M2: dmg<=0 не вызывает takeDamage и onTankDamaged (knockback-only path)', () => {
    const target = makeTank();
    const onTankDamaged = vi.fn();
    const ds = createDamageSystem({} as any, { onTankDamaged, onBlockDestroyed: vi.fn() });
    ds.applyDamage(target, 0, makeTank());
    ds.applyDamage(target, -5, makeTank());
    expect(target.takeDamage).not.toHaveBeenCalled();
    expect(onTankDamaged).not.toHaveBeenCalled();
    expect(target.health).toBe(100);
  });

  it("при разрушении блока возвращает 'destroyed' и вызывает onBlockDestroyed", () => {
    const { arena, blocks } = makeArena(10);
    const onBlockDestroyed = vi.fn();
    const ds = createDamageSystem(arena, { onTankDamaged: vi.fn(), onBlockDestroyed });
    const hitPos = new THREE.Vector3(1, 1, 1);
    ds.damageBlock(1, 50, hitPos);
    expect(blocks.get(1)!.active).toBe(false);
    expect(onBlockDestroyed).toHaveBeenCalledWith(hitPos, 1.4, 1);
  });

  it("при неполном разрушении возвращает 'hit' и НЕ зовёт onBlockDestroyed", () => {
    const { arena, blocks } = makeArena(100);
    const onBlockDestroyed = vi.fn();
    const ds = createDamageSystem(arena, { onTankDamaged: vi.fn(), onBlockDestroyed });
    ds.damageBlock(1, 30, new THREE.Vector3());
    expect(blocks.get(1)!.hp).toBe(70);
    expect(onBlockDestroyed).not.toHaveBeenCalled();
  });

  it('блокирует friendly fire при одинаковых teamId', () => {
    const target = makeTank({ teamId: 'alpha' });
    const source = makeTank({ teamId: 'alpha' });
    const onTankDamaged = vi.fn();
    const ds = createDamageSystem({} as any, { onTankDamaged, onBlockDestroyed: vi.fn() });
    ds.applyDamage(target, 30, source);
    expect(onTankDamaged).not.toHaveBeenCalled();
  });

  it('TDM: урон между разными командами проходит', () => {
    const target = makeTank({ teamId: 'bravo' });
    const source = makeTank({ teamId: 'alpha' });
    const onTankDamaged = vi.fn();
    const ds = createDamageSystem({} as any, { onTankDamaged, onBlockDestroyed: vi.fn() });
    ds.applyDamage(target, 30, source);
    expect(onTankDamaged).toHaveBeenCalled();
    expect(target.health).toBe(70);
  });

  it('блокирует урон при invulnT > 0', () => {
    const target = makeTank({ invulnT: 1.5 });
    const source = makeTank();
    const onTankDamaged = vi.fn();
    const ds = createDamageSystem({} as any, { onTankDamaged, onBlockDestroyed: vi.fn() });
    ds.applyDamage(target, 30, source);
    expect(onTankDamaged).not.toHaveBeenCalled();
  });

  it('remote-owned shots are cosmetic (HP arrives via tank_damage)', () => {
    const target = makeTank();
    const source = makeTank({ isRemote: true });
    const onTankDamaged = vi.fn();
    const ds = createDamageSystem({} as any, { onTankDamaged, onBlockDestroyed: vi.fn() });
    ds.applyDamage(target, 40, source);
    expect(target.takeDamage).not.toHaveBeenCalled();
    expect(onTankDamaged).not.toHaveBeenCalled();
    expect(target.health).toBe(100);
  });
});

describe('resistMultiplier — границы фактического контракта (Damage_System.md)', () => {
  it('контракт 0.65/1.35 под макс resist каталога 0.35', () => {
    expect(RESIST_MULTIPLIER_MIN).toBe(0.65);
    expect(RESIST_MULTIPLIER_MAX).toBe(1.35);
  });

  it('границы каталога ложатся ровно на кламп (Титан nano −0.35 → ×1.35)', () => {
    expect(resistMultiplier({ nano: -0.35 }, 'nano')).toBeCloseTo(1.35, 10);
    expect(resistMultiplier({ ballistic: 0.35 }, 'ballistic')).toBeCloseTo(0.65, 10);
  });

  it('запредельные резисты клампятся, а не дают неуязвимость/испарение', () => {
    expect(resistMultiplier({ kinetic: 0.95 }, 'kinetic')).toBe(0.65);
    expect(resistMultiplier({ thermal: -0.9 }, 'thermal')).toBe(1.35);
  });

  it('без типа/таблицы — нейтральная 1 (тестовые танки, будущие источники)', () => {
    expect(resistMultiplier(undefined, 'nano')).toBe(1);
    expect(resistMultiplier({ nano: 0.2 }, undefined)).toBe(1);
    expect(resistMultiplier({}, 'nano')).toBe(1);
  });
});
