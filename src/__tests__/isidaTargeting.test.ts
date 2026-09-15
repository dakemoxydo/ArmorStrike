// ===== «Изида»: чистый автозахват нано-луча (конус 20°, враг > союзник, LOS) =====
import { describe, expect, it } from 'vitest';
import {
  acquireIsidaTarget,
  isBeamAllied,
  isBeamCandidate,
  isBeamHostile,
  type BeamCone,
  type BeamPeer,
} from '../game/weapons/isidaTargeting';
import type { Collider } from '../game/engine/physics';
import { WEAPON_TUNING } from '../core/catalog';

function peer(over: Partial<BeamPeer> & { id: number }): BeamPeer {
  return {
    alive: true,
    position: { x: 0, z: 8 },
    health: 50,
    maxHealth: 100,
    teamId: null,
    ...over,
  };
}

/** Конус вдоль +Z из начала координат (как муззл танка с aimYaw=0). */
function cone(): BeamCone {
  return {
    x: 0, z: 0, dirX: 0, dirZ: 1,
    halfCos: Math.cos(WEAPON_TUNING.isida.coneHalfAngle),
    range: WEAPON_TUNING.isida.range,
  };
}

const wall: Collider = {
  id: 99, minX: -5, maxX: 5, minZ: 4, maxZ: 6,
  height: 4, blocksShots: true, blocksSight: true, destructible: false, active: true, kind: 'wall',
};

describe('isidaTargeting — отношения фракций', () => {
  it('FFA (null team) враждебен всем, союзничества нет', () => {
    const a = { id: 1, teamId: null };
    const b = { id: 2, teamId: null };
    expect(isBeamHostile(a, b)).toBe(true);
    expect(isBeamAllied(a, b)).toBe(false);
    expect(isBeamHostile(a, a)).toBe(false); // сам себя не лучим
  });

  it('одинаковая команда — не враги; разная — враги; undefined team = FFA', () => {
    expect(isBeamHostile({ id: 1, teamId: 'alpha' }, { id: 2, teamId: 'alpha' })).toBe(false);
    expect(isBeamHostile({ id: 1, teamId: 'alpha' }, { id: 2, teamId: 'bravo' })).toBe(true);
    expect(isBeamAllied({ id: 1, teamId: 'alpha' }, { id: 2, teamId: 'alpha' })).toBe(true);
    expect(isBeamHostile({ id: 1, teamId: undefined }, { id: 2, teamId: 'alpha' })).toBe(true);
  });
});

describe('isidaTargeting — geometry захвата', () => {
  it('враг в конусе и с LOS — захват attack', () => {
    const enemy = peer({ id: 2, position: { x: 0, z: 10 } });
    const found = acquireIsidaTarget([enemy], { id: 1 }, cone(), []);
    expect(found?.mode).toBe('attack');
    expect(found?.peer.id).toBe(2);
  });

  it('цель вне конуса (~20° в стороне) не захватывается', () => {
    // x=3.2, z=8 → 21.8° от оси; полуугол 10°.
    const enemy = peer({ id: 2, position: { x: 3.2, z: 8 } });
    expect(acquireIsidaTarget([enemy], { id: 1 }, cone(), [])).toBeNull();
  });

  it('дальше range (17 м) — мимо', () => {
    const enemy = peer({ id: 2, position: { x: 0, z: 18 } });
    expect(acquireIsidaTarget([enemy], { id: 1 }, cone(), [])).toBeNull();
  });

  it('стена между дулом и целью рвёт луч', () => {
    const enemy = peer({ id: 2, position: { x: 0, z: 10 } });
    expect(acquireIsidaTarget([enemy], { id: 1 }, cone(), [wall])).toBeNull();
  });

  it('мёртвая цель не захватывается', () => {
    const enemy = peer({ id: 2, alive: false, position: { x: 0, z: 10 } });
    expect(acquireIsidaTarget([enemy], { id: 1 }, cone(), [])).toBeNull();
  });

  it('из двух врагов в конусе берется ближайший к оси (max dot)', () => {
    const offAxis = peer({ id: 2, position: { x: 0.65, z: 7.4 } }); // ~5° от оси
    const onAxis = peer({ id: 3, position: { x: 0.2, z: 12 } });    // ~1°
    const found = acquireIsidaTarget([offAxis, onAxis], { id: 1 }, cone(), []);
    expect(found?.peer.id).toBe(3);
  });
});

describe('isidaTargeting — приоритет и лечение', () => {
  const owner = { id: 1, teamId: 'alpha' };
  const enemy = peer({ id: 2, teamId: 'bravo', position: { x: 0, z: 12 } });
  const ally = peer({ id: 3, teamId: 'alpha', position: { x: 0, z: 8 }, health: 40 });

  it('враг приоритетнее раненого союзника даже дальше', () => {
    const found = acquireIsidaTarget([ally, enemy], owner, cone(), []);
    expect(found?.mode).toBe('attack');
    expect(found?.peer.id).toBe(2);
  });

  it('без врага — лечим раненого союзника', () => {
    const found = acquireIsidaTarget([ally], owner, cone(), []);
    expect(found?.mode).toBe('heal');
    expect(found?.peer.id).toBe(3);
  });

  it('полный союзник (≥ healHpFrac) — не цель', () => {
    const full = peer({ id: 4, teamId: 'alpha', health: 100 });
    expect(acquireIsidaTarget([full], owner, cone(), [])).toBeNull();
  });

  it('isBeamCandidate: тот же набор проверок, что и в acquire (in-place стики)', () => {
    const c = cone();
    expect(isBeamCandidate(enemy, owner, c, [], 'attack')).toBe(true);
    expect(isBeamCandidate(enemy, owner, c, [], 'heal')).toBe(false); // враг не лечится
    expect(isBeamCandidate(ally, owner, c, [], 'attack')).toBe(false); // союзник не бьется
    enemy.alive = false;
    expect(isBeamCandidate(enemy, owner, c, [], 'attack')).toBe(false);
  });

  it('лечение через стену невозможно (LOS обязателен и союзнику)', () => {
    expect(acquireIsidaTarget([ally], owner, cone(), [wall])).toBeNull();
  });
});
