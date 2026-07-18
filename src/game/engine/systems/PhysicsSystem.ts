// ===== Физическая система: выталкивание танков из стен и разведение танков друг от друга =====
import { resolveCircle } from '../physics';
import type { Collider } from '../physics';
import type { PhysicsBody } from '../../tank/simPorts';
import { separateTankPair, type TankXZ } from '../tankSeparation';

/** Cached non-ramp colliders (arena collider list is stable; kinds don't flip). */
let _solidSrc: Collider[] | null = null;
let _solid: Collider[] = [];

function solidColliders(colliders: Collider[]): Collider[] {
  if (colliders === _solidSrc) return _solid;
  _solidSrc = colliders;
  _solid = colliders.filter((c) => c.kind !== 'ramp');
  return _solid;
}

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
      for (let j = i + 1; j < tanks.length; j++) {
        const b = tanks[j];
        if (!b.alive) continue;
        _pa.x = a.position.x;
        _pa.z = a.position.z;
        _pb.x = b.position.x;
        _pb.z = b.position.z;
        if (separateTankPair(_pa, _pb, a.radius, b.radius)) {
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
