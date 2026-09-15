/**
 * Прицел на реальной линии выстрела (aimReticle): горизонтальная трасса от
 * дула останавливается блокирующим коллайдером, чужим танком (радиус как у
 * полёта снаряда) или на дальности оружия. Позиция прицела = проекция этой
 * точки, так чтоprediction обязана совпадать с физикой выстреля.
 */
import { describe, expect, it } from 'vitest';
import { reticleImpactDistance, type ReticleTank } from '../game/aimReticle';
import { colliderFromCenter, type Collider } from '../game/engine/physics';
import { PROJECTILE } from '../game/constants';

function tank(id: number, x: number, z: number, over: Partial<ReticleTank> = {}): ReticleTank {
  return { id, alive: true, position: { x, z }, radius: 1.8, ...over };
}

const noColliders: Collider[] = [];

// Луч: muzzle (0,0,y=1.6) → dir +Z, unit.
const MZ_Y = 1.6;
const aim = { dx: 0, dz: 1 };

describe('reticleImpactDistance — куда реально летит выстрел', () => {
  it('чисто поле — дальность оружия', () => {
    expect(
      reticleImpactDistance(0, 0, MZ_Y, aim.dx, aim.dz, 120, noColliders, [], 1),
    ).toBe(120);
  });

  it('блокирующая стена раньше дальности — прицел на стене', () => {
    const wall = colliderFromCenter(0, 30, 8, 4, 3, 'wall');
    const d = reticleImpactDistance(0, 0, MZ_Y, aim.dx, aim.dz, 120, [wall], [], 1);
    expect(d).toBeCloseTo(28, 5); // вход в AABB по z: 30 − d/2 = 28
  });

  it('низкая стена ниже дула не блокирует горизонтальный луч', () => {
    const low = colliderFromCenter(0, 30, 8, 4, 1, 'wall'); // height 1 < muzzleY − eps
    const d = reticleImpactDistance(0, 0, MZ_Y, aim.dx, aim.dz, 120, [low], [], 1);
    expect(d).toBe(120);
  });

  it('декор (blocksShots:false) снаряд не останавливает', () => {
    const decoy = colliderFromCenter(0, 30, 8, 4, 5, 'wall', { blocksShots: false });
    const d = reticleImpactDistance(0, 0, MZ_Y, aim.dx, aim.dz, 120, [decoy], [], 1);
    expect(d).toBe(120);
  });

  it('враг на линии раньше стены — прицел на танке (радиус + радиус снаряда)', () => {
    const wall = colliderFromCenter(0, 30, 8, 4, 3, 'wall');
    const enemy = tank(2, 0, 15);
    const d = reticleImpactDistance(0, 0, MZ_Y, aim.dx, aim.dz, 120, [wall], [enemy], 1);
    expect(d).toBeCloseTo(15 - (1.8 + PROJECTILE.radius), 5);
  });

  it('pierceTanks (рельса): танк на линии не режет трассу — термин на стене', () => {
    const wall = colliderFromCenter(0, 30, 8, 4, 3, 'wall');
    const enemy = tank(2, 0, 15);
    const d = reticleImpactDistance(0, 0, MZ_Y, aim.dx, aim.dz, 120, [wall], [enemy], 1, true);
    expect(d).toBeCloseTo(28, 5); // только стена: луч пробивает танк насквозь
  });

  it('pierceTanks: без стены прицел на полной дальности, сколько бы танков ни стояло', () => {
    const line = [tank(2, 0, 15), tank(3, 0, 40), tank(4, 0, 90)];
    const d = reticleImpactDistance(0, 0, MZ_Y, aim.dx, aim.dz, 120, noColliders, line, 1, true);
    expect(d).toBe(120);
  });

  it('вне линии — не считается; рядом по перпендикуляру больше r+pad — мимо', () => {
    const side = tank(2, 3, 15); // 3 > 1.8 + 0.18 — снаряд проходит левее корпуса
    const d = reticleImpactDistance(0, 0, MZ_Y, aim.dx, aim.dz, 120, noColliders, [side], 1);
    expect(d).toBe(120);
  });

  it('свой и мёртвый танки не таранят трассу', () => {
    const self = tank(1, 0, 5);
    const dead = tank(2, 0, 8, { alive: false });
    const d = reticleImpactDistance(0, 0, MZ_Y, aim.dx, aim.dz, 120, noColliders, [self, dead], 1);
    expect(d).toBe(120);
  });

  it('танк позади дула — нет пересечения', () => {
    const behind = tank(2, 0, -10);
    const d = reticleImpactDistance(0, 0, MZ_Y, aim.dx, aim.dz, 120, noColliders, [behind], 1);
    expect(d).toBe(120);
  });

  it('дальность ограничивает раньше стены', () => {
    const wall = colliderFromCenter(0, 300, 8, 4, 3, 'wall');
    const d = reticleImpactDistance(0, 0, MZ_Y, aim.dx, aim.dz, 120, [wall], [], 1);
    expect(d).toBe(120);
  });
});
