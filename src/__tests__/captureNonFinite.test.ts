import { describe, expect, it } from 'vitest';
import {
  CAPTURE,
  countPresenceInZone,
  createZone,
  stepCaptureZone,
  stepCaptureZoneInto,
} from '../game/match/captureLogic';

type Tank = {
  alive: boolean;
  teamId: 'alpha' | 'bravo' | null;
  position: { x: number; z: number };
};

const tank = (teamId: Tank['teamId'], x: number, z: number, alive = true): Tank => ({
  alive,
  teamId,
  position: { x, z },
});

describe('countPresenceInZone: нефинитная поза', () => {
  it('игнорирует танк с NaN в позиции (сравнение с NaN не проходит радиусный тест)', () => {
    const zone = createZone('A', 0, 0, 20);
    const presence = countPresenceInZone(zone, [
      tank('alpha', 0, 0),
      tank('bravo', Number.NaN, 0),
    ]);
    // Регрессия: NaN-танк раньше давал dx*dx + dz*dz = NaN, `NaN > r2` === false,
    // `continue` не срабатывал → bravo засчитывался как стоящий в зоне.
    expect(presence).toEqual({ alpha: 1, bravo: 0 });
  });

  it('игнорирует ±Infinity и NaN в любой из координат', () => {
    const zone = createZone('A', 0, 0, 20);
    for (const bad of [Number.NaN, Infinity, -Infinity]) {
      expect(countPresenceInZone(zone, [tank('bravo', bad, 0)])).toEqual({
        alpha: 0,
        bravo: 0,
      });
      expect(countPresenceInZone(zone, [tank('alpha', 0, bad)])).toEqual({
        alpha: 0,
        bravo: 0,
      });
    }
  });

  it('невидимый пир с испорченной позой больше не замораживает прогресс зон', () => {
    // Полный сценарий бага: хост получает позу пира с NaN по z, и такой танк
    // засчитывался в каждой зоне → contested → прогресс замирал до конца матча.
    const anchors = [
      createZone('A', 0, 0),
      createZone('B', 60, 30),
      createZone('C', -60, 30),
    ];
    const broken: Tank = tank('bravo', Number.NaN, Number.NaN);

    for (let i = 0; i < 60 * 20; i++) {
      for (const zone of anchors) {
        stepCaptureZoneInto(
          zone,
          countPresenceInZone(zone, [tank('alpha', zone.x, zone.z), broken]),
          1 / 60,
        );
      }
    }

    for (const zone of anchors) {
      expect(zone.owner).toBe('alpha');
      expect(zone.contested).toBe(false);
    }
  });

  it('регрессия: конечные позиции считаются как раньше (1 alpha + 2 bravo)', () => {
    const zone = createZone('A', 0, 0, 20);
    const presence = countPresenceInZone(zone, [
      tank('alpha', 1, 1),
      tank('bravo', -4, 3),
      tank('bravo', 0, 19),
      tank('alpha', 0, 0, false), // мёртвый внутри зоны — не считается
      tank('bravo', 20.1, 0), // ровно за радиусом — не считается
      tank(null, 0, 0), // FFA — не считается
    ]);
    expect(presence).toEqual({ alpha: 1, bravo: 2 });
  });

  it('танк ровно на границе радиуса засчитывается', () => {
    const zone = createZone('A', 0, 0, 20);
    expect(countPresenceInZone(zone, [tank('alpha', 0, 20)])).toEqual({
      alpha: 1,
      bravo: 0,
    });
  });
});

describe('stepCaptureZoneInto: инвариант шкалы 0..1', () => {
  it('чинит progress вне 0..1 из сетевого снапшота', () => {
    const high = stepCaptureZone({ ...createZone('A', 0, 0), progress: 5 }, { alpha: 1, bravo: 0 }, 0);
    // progress > 1 не должен сразу ронять владельца того, кто его туда записал.
    expect(high.owner).toBe(null);
    expect(high.progress).toBeLessThan(1);

    const low = stepCaptureZone({ ...createZone('A', 0, 0), progress: -3 }, { alpha: 1, bravo: 0 }, 0);
    expect(low.progress).toBe(0);
  });

  it('NaN в progress не переворачивает владельца того же тика', () => {
    const z = stepCaptureZone(
      { ...createZone('A', 0, 0), owner: 'alpha', progress: Number.NaN },
      { alpha: 0, bravo: 1 },
      1 / 60,
    );
    expect(z.owner).toBe('alpha');
    expect(z.progress).toBeCloseTo(1 / 60 / CAPTURE.captureSec, 5);
  });

  it('нефинитный и отрицательный dt не ломают шкалу', () => {
    const base = { ...createZone('A', 0, 0), progress: 0.5, actor: 'alpha' as const };
    for (const dt of [Number.NaN, Infinity, -1]) {
      const z = stepCaptureZoneInto({ ...base }, { alpha: 1, bravo: 0 }, dt);
      expect(z.progress).toBeGreaterThanOrEqual(0);
      expect(z.progress).toBeLessThanOrEqual(1);
      expect(Number.isFinite(z.progress)).toBe(true);
      // Негативный шаг не откатывает шкалу назад.
      expect(z.progress).toBeGreaterThanOrEqual(base.progress);
    }
    // Положительный dt по-прежнему идёт вперёд.
    const grown = stepCaptureZoneInto({ ...base }, { alpha: 1, bravo: 0 }, 1);
    expect(grown.progress).toBeCloseTo(0.5 + 1 / CAPTURE.captureSec, 5);
  });

  it('смена актора по-прежнему обнуляет шкалу, а тот же актор — продолжает', () => {
    let z = createZone('A', 0, 0);
    z = stepCaptureZone(z, { alpha: 1, bravo: 0 }, 4);
    expect(z.progress).toBeCloseTo(0.5, 5);
    // Тот же актор после заморозки — продолжает с текущего значения.
    z = stepCaptureZone(z, { alpha: 1, bravo: 1 }, 1);
    z = stepCaptureZone(z, { alpha: 1, bravo: 0 }, 1);
    expect(z.progress).toBeCloseTo(0.5 + 1 / CAPTURE.captureSec, 5);
    // Другой актор — рестарт с нуля.
    z = stepCaptureZone(z, { alpha: 0, bravo: 1 }, 1);
    expect(z.progress).toBeCloseTo(1 / CAPTURE.captureSec, 5);
  });
});