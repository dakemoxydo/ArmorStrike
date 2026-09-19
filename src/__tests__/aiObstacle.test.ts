import { describe, it, expect } from 'vitest';
import { computeObstacleAvoidance } from '../game/aiObstacle';
import type { Collider } from '../game/engine/physics';
import type { AIBody } from '../game/AI';

function wall(
  id: number,
  minX: number,
  maxX: number,
  minZ: number,
  maxZ: number,
  kind: Collider['kind'] = 'block',
): Collider {
  return {
    id,
    minX,
    maxX,
    minZ,
    maxZ,
    height: 3,
    blocksShots: true,
    blocksSight: true,
    destructible: false,
    active: true,
    kind,
  };
}

/** Бот в начале координат, курс +Z (yaw 0): проба — (0, 4.2). */
function body(): AIBody {
  return { position: { x: 0, z: 0 }, yaw: 0 } as unknown as AIBody;
}

describe('aiObstacle — избегание препятствий', () => {
  it('стена по курсу включает avoid (steer + полгаза на втором тике)', () => {
    // Левая проба (±60°, 5 м) свободна, правая завалена → детерминированный уход влево.
    const colliders = [
      wall(1, -1.5, 1.5, 3, 6), // проба (0, 4.2) внутри; боковые пробы (±4.33, 2.5) — снаружи
      wall(2, -6, -3, 1, 4), // правая проба (−4.33, 2.5) внутри
    ];
    const state = { avoidT: 0, avoidDir: 1 };
    const t = body();
    const first = computeObstacleAvoidance(state, 1 / 60, t, colliders);
    expect(first.steerOverride).toBeNull();
    expect(first.throttleOverride).toBeNull();
    const second = computeObstacleAvoidance(state, 1 / 60, t, colliders);
    expect(second.steerOverride).toBe(1);
    expect(second.throttleOverride).toBe(0.7);
  });

  it('MED-1: грань в 1.6 м от пробы — уже препятствие (старый клиренс 1.4 пропускал)', () => {
    // Проба (0, 4.2), грань стены в 1.6 м левее: зазор 1.4–1.8 м, где корпус
    // r=1.8 цеплял стену. Новый клиренс 2.2 обязан триггерить avoid.
    const colliders = [wall(1, 1.6, 5, 3, 6)];
    const state = { avoidT: 0, avoidDir: 1 };
    const t = body();
    computeObstacleAvoidance(state, 1 / 60, t, colliders);
    const second = computeObstacleAvoidance(state, 1 / 60, t, colliders);
    expect(second.steerOverride).not.toBeNull();
    expect(second.throttleOverride).toBe(0.7);
  });

  it('далёкая стена и ramp не триггерят avoid', () => {
    const far = computeObstacleAvoidance(
      { avoidT: 0, avoidDir: 1 },
      1 / 60,
      body(),
      [wall(1, -3, 3, 10, 12)],
    );
    expect(far.steerOverride).toBeNull();
    expect(far.throttleOverride).toBeNull();
    // M12: ramp не solid для корпуса — проба его игнорирует.
    const ramp = computeObstacleAvoidance(
      { avoidT: 0, avoidDir: 1 },
      1 / 60,
      body(),
      [wall(1, -3, 3, 3, 6, 'ramp')],
    );
    expect(ramp.steerOverride).toBeNull();
    expect(ramp.throttleOverride).toBeNull();
  });
});
