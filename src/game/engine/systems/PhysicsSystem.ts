// ===== Физическая система: выталкивание танков из стен и разведение танков друг от друга =====
import { resolveCircle } from '../physics';
import type { Collider } from '../physics';
import type { PhysicsBody } from '../../tank/simPorts';
import { separateTankPair, type TankXZ } from '../tankSeparation';
import { solidColliders } from '../solidColliderCache';

/** Re-export: Arena.rebuild calls the leaf module; keep path for tests/docs. */
export { invalidateSolidColliderCache } from '../solidColliderCache';


const _pa: TankXZ = { x: 0, z: 0 };
const _pb: TankXZ = { x: 0, z: 0 };

function resolveWalls(tanks: PhysicsBody[], colliders: Collider[]) {
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
      if (impact > 0.01) t.speed *= 0.86;
    }
  }
}

export const PhysicsSystem = {
  resolveCollisions(tanks: PhysicsBody[], colliders: Collider[]) {
    resolveWalls(tanks, colliders);

    for (let i = 0; i < tanks.length; i++) {
      const a = tanks[i];
      if (!a.alive) continue;
      const ax = a.position.x;
      const az = a.position.z;
      const ar = a.radius;
      for (let j = i + 1; j < tanks.length; j++) {
        const b = tanks[j];
        if (!b.alive) continue;
        // Broad-phase: skip if bounding circles cannot overlap (avoids function call overhead).
        const rr = ar + b.radius;
        const ddx = b.position.x - ax;
        const ddz = b.position.z - az;
        if (ddx * ddx + ddz * ddz >= rr * rr) continue;
        _pa.x = ax;
        _pa.z = az;
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
    resolveWalls(tanks, colliders);
  },
};
