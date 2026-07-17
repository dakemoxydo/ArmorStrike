import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import { createDamageSystem } from '../core/DamageSystem';
import type { ArenaLike, TankLike } from '../core/types';

function makeTank(over: Partial<TankLike> = {}): TankLike & { health: number; alive: boolean } {
  return {
    id: 1, name: 'T', isPlayer: false, health: 100, alive: true, radius: 1.5,
    knockback: new THREE.Vector3(), position: new THREE.Vector3(),
    yaw: 0, takeDamage: vi.fn(function (this: any, d: number) { this.health -= d; if (this.health <= 0) this.alive = false; }) as any,
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

  it("при разрушении блока возвращает 'destroyed' и вызывает onBlockDestroyed", () => {
    const { arena, blocks } = makeArena(10);
    const onBlockDestroyed = vi.fn();
    const ds = createDamageSystem(arena, { onTankDamaged: vi.fn(), onBlockDestroyed });
    const hitPos = new THREE.Vector3(1, 1, 1);
    ds.damageBlock(1, 50, hitPos);
    expect(blocks.get(1)!.active).toBe(false);
    expect(onBlockDestroyed).toHaveBeenCalledWith(hitPos, 1.4);
  });

  it("при неполном разрушении возвращает 'hit' и НЕ зовёт onBlockDestroyed", () => {
    const { arena, blocks } = makeArena(100);
    const onBlockDestroyed = vi.fn();
    const ds = createDamageSystem(arena, { onTankDamaged: vi.fn(), onBlockDestroyed });
    ds.damageBlock(1, 30, new THREE.Vector3());
    expect(blocks.get(1)!.hp).toBe(70);
    expect(onBlockDestroyed).not.toHaveBeenCalled();
  });
});
