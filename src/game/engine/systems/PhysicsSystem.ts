// ===== Физическая система: выталкивание танков из стен и разведение танков друг от друга =====
import { resolveCircle } from '../physics';
import type { Collider } from '../physics';
import type { PhysicsBody } from '../../tank/simPorts';
import { separateTankPair, type TankXZ } from '../tankSeparation';
import { solidColliders } from '../solidColliderCache';


const _pa: TankXZ = { x: 0, z: 0 };
const _pb: TankXZ = { x: 0, z: 0 };

/**
 * F4: стеновое трение — экспоненциальный затухание за секунду, а не фиксированный
 * множитель на тик. K = −ln(0.86)·60 ≈ 9.05 сохраняет прежнее поведение
 * на 60 fps (×0.86 за кадр) и делает его одинаковым на любом FPS
 * (30 fps: было ×0.74/сек вместо ×0.86 — drift из-за клампнутого dt).
 */
const WALL_FRICTION_K = 9.05;

function resolveWalls(tanks: PhysicsBody[], colliders: Collider[], dt: number, friction: boolean) {
  // M12: ramps are visual wedges; solid AABB footprints blocked climb and felt like invisible walls.
  // Tanks ignore ramp kind for hull collision (shots already pass via blocksShots:false).
  const solid = solidColliders(colliders);
  for (const t of tanks) {
    if (!t.alive) continue;
    const res = resolveCircle(t.position.x, t.position.z, t.radius, solid);
    if (res.hit) {
      const impact = Math.hypot(res.x - t.position.x, res.z - t.position.z);
      t.position.x = res.x;
      t.position.z = res.z;
      // F4: friction — только первым проходом; второй pass — чистая
      // позиционная коррекция после разведения танков, не «ещё одно касание».
      if (friction && impact > 0.01) t.speed *= Math.exp(-WALL_FRICTION_K * dt);
    }
  }
}

export const PhysicsSystem = {
  resolveCollisions(tanks: PhysicsBody[], colliders: Collider[], dt = 1 / 60) {
    resolveWalls(tanks, colliders, dt, true);

    for (let i = 0; i < tanks.length; i++) {
      const a = tanks[i];
      if (!a.alive) continue;
      const ar = a.radius;
      for (let j = i + 1; j < tanks.length; j++) {
        const b = tanks[j];
        if (!b.alive) continue;
        // Broad-phase: skip if bounding circles cannot overlap (avoids function call overhead).
        const rr = ar + b.radius;
        const ddx = b.position.x - a.position.x;
        const ddz = b.position.z - a.position.z;
        if (ddx * ddx + ddz * ddz >= rr * rr) continue;
        _pa.x = a.position.x;
        _pa.z = a.position.z;
        _pb.x = b.position.x;
        _pb.z = b.position.z;
        if (separateTankPair(_pa, _pb, ar, b.radius)) {
          a.position.x = _pa.x;
          a.position.z = _pa.z;
          b.position.x = _pb.x;
          b.position.z = _pb.z;
        }
      }
    }

    // M10: re-resolve walls after tank–tank so pairs cannot push hulls into colliders.
    resolveWalls(tanks, colliders, dt, false);
  },
};
