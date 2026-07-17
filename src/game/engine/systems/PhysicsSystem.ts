// ===== Физическая система: выталкивание танков из стен и разведение танков друг от друга =====
import { resolveCircle } from '../physics';
import type { Collider } from '../physics';
import type { TankEntity } from '../../Tank';
import { separateTankPair, type TankXZ } from '../tankSeparation';

function resolveWalls(tanks: TankEntity[], colliders: Collider[]) {
  // M12: ramps are visual wedges; solid AABB footprints blocked climb and felt like invisible walls.
  // Tanks ignore ramp kind for hull collision (shots already pass via blocksShots:false).
  const solid = colliders.filter((c) => c.kind !== 'ramp');
  // TEMP DEBUG [BUGFIX-M12]
  if (colliders.length !== solid.length) {
    console.debug('[BUGFIX-M12] hull skips ramp colliders', {
      total: colliders.length, solid: solid.length,
    });
  }
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
  resolveCollisions(tanks: TankEntity[], colliders: Collider[]) {
    // Walls first
    resolveWalls(tanks, colliders);

    // Межтанковые столкновения (попарно) — M10: clamped separation
    for (let i = 0; i < tanks.length; i++) {
      const a = tanks[i];
      if (!a.alive) continue;
      for (let j = i + 1; j < tanks.length; j++) {
        const b = tanks[j];
        if (!b.alive) continue;
        const pa: TankXZ = { x: a.position.x, z: a.position.z };
        const pb: TankXZ = { x: b.position.x, z: b.position.z };
        if (separateTankPair(pa, pb, a.radius, b.radius)) {
          a.position.x = pa.x;
          a.position.z = pa.z;
          b.position.x = pb.x;
          b.position.z = pb.z;
        }
      }
    }

    // M10: re-resolve walls after tank–tank so pairs cannot push hulls into colliders.
    resolveWalls(tanks, colliders);
  },
};
