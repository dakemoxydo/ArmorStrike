import { describe, it, expect } from 'vitest';
import { findCoverPoint } from '../game/aiCover';
import { losClear } from '../game/engine/physics';
import type { Collider } from '../game/engine/physics';
import { BOT_NORMAL } from '../game/match/matchConfig';

function block(id: number, cx: number, cz: number, w = 6, d = 6): Collider {
  return {
    id,
    minX: cx - w / 2,
    maxX: cx + w / 2,
    minZ: cz - d / 2,
    maxZ: cz + d / 2,
    height: 3,
    blocksShots: true,
    blocksSight: true,
    destructible: true,
    active: true,
    kind: 'block',
  };
}

describe('aiCover', () => {
  it('возвращает null, когда укрытий нет', () => {
    expect(findCoverPoint(0, 0, 20, 0, [])).toBeNull();
  });

  it('picks a stand point on the far side of cover from the threat', () => {
    // Threat at x=0, cover at x=20 — stand should be further positive X (away from threat).
    const pt = findCoverPoint(18, 0, 0, 0, [block(1, 20, 0)]);
    expect(pt).not.toBeNull();
    expect(pt!.x).toBeGreaterThan(20);
  });

  it('ignores inactive or non-sight blockers', () => {
    const dead = block(1, 10, 0);
    dead.active = false;
    const ramp = block(2, 12, 0);
    ramp.kind = 'ramp';
    const open = block(3, 14, 0);
    open.blocksSight = false;
    expect(findCoverPoint(0, 0, -10, 0, [dead, ramp, open])).toBeNull();
  });
});

// ===== D3: контракт поиска укрытия vs классы оружия =====
// Поиск класс-нейтрален (maxDist 42 / standOff 3.4, scoring сам-относительный);
// класс-уместность возникает через preferred range класса (см. aiCover.ts).
describe('aiCover — дистанции vs классы оружия (D3)', () => {
  it('радиус поиска (42) внутри восприятия бота (sight 46)', () => {
    // За пределами 42 укрытие не ищется вовсе…
    expect(findCoverPoint(0, 0, -60, 0, [block(1, 60, 0)])).toBeNull();
    // …на 41 — ещё находится.
    expect(findCoverPoint(0, 0, -41, 0, [block(1, 41, 0)])).not.toBeNull();
    // Поиск никогда не выходит за sight: бот не бежит в зону, где не видит угрозу.
    expect(BOT_NORMAL.sightRange).toBeGreaterThanOrEqual(42);
  });

  it('brawler-геометрия (flamer, preferred ~8): укрытие у боя, LOS порван', () => {
    // Штурм дерётся вплотную: угроза в (0,0), блок в 12, бот в (8,0).
    const blk = block(1, 12, 0);
    const pt = findCoverPoint(8, 0, 0, 0, [blk]);
    expect(pt).not.toBeNull();
    // Угроза не видит точку стояния (ядро контракта укрытия).
    expect(losClear(0, 0, pt!.x, pt!.z, [blk])).toBe(false);
    // Точка — на дальней от угрозы стороне, за гранью блока + stand-off.
    expect(pt!.x).toBeGreaterThan(blk.maxX + 3);
    // Ближнее к бою укрытие — пере-вступление в brawling остаётся коротким.
    expect(Math.hypot(pt!.x, pt!.z)).toBeLessThan(20);
  });

  it('sniper-геометрия (railgun, preferred ~46): укрытие далеко от угрозы', () => {
    // Снайпер дерётся на дальней дистанции: угроза в (0,0), блок у бота в (52,0).
    const blk = block(1, 52, 0);
    const pt = findCoverPoint(46, 0, 0, 0, [blk]);
    expect(pt).not.toBeNull();
    expect(losClear(0, 0, pt!.x, pt!.z, [blk])).toBe(false);
    // Сам-относительный scoring даёт дальнее укрытие: класс-уместность без
    // per-class кода — бот на дальней дистанции боя прячется далеко от угрозы.
    expect(pt!.x).toBeGreaterThan(50);
  });

  it('ближнее укрытие выигрывает у дальнего (scoring сам-относительный)', () => {
    const near = block(1, 8, 0);
    const far = block(2, 40, 0);
    const pt = findCoverPoint(0, 0, -50, 0, [near, far]);
    expect(pt).not.toBeNull();
    // Выбран блок в 8 (точка ~14.4 от бота), а не в 40.
    expect(pt!.x).toBeLessThan(near.maxX + 10);
  });
});
