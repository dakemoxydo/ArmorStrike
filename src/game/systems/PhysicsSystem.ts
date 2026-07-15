// ===== Физическая система: выталкивание танков из стен и разведение танков друг от друга =====
import { resolveCircle } from '../physics';
import type { Collider } from '../physics';
import type { TankEntity } from '../Tank';

export const PhysicsSystem = {
  resolveCollisions(tanks: TankEntity[], colliders: Collider[]) {
    // Столкновение с препятствиями арены
    for (const t of tanks) {
      if (!t.alive) continue;
      const res = resolveCircle(t.position.x, t.position.z, t.radius, colliders);
      if (res.hit) {
        const impact = Math.hypot(res.x - t.position.x, res.z - t.position.z);
        t.position.x = res.x;
        t.position.z = res.z;
        if (impact > 0.01) t.speed *= 0.86;
      }
    }

    // Межтанковые столкновения (попарно)
    for (let i = 0; i < tanks.length; i++) {
      const a = tanks[i];
      if (!a.alive) continue;
      for (let j = i + 1; j < tanks.length; j++) {
        const b = tanks[j];
        if (!b.alive) continue;
        const dx = b.position.x - a.position.x;
        const dz = b.position.z - a.position.z;
        const rr = a.radius + b.radius;
        const d2 = dx * dx + dz * dz;
        if (d2 >= rr * rr || d2 < 1e-6) continue;
        const d = Math.sqrt(d2);
        const push = (rr - d) / d / 2;
        a.position.x -= dx * push;
        a.position.z -= dz * push;
        b.position.x += dx * push;
        b.position.z += dz * push;
      }
    }
  },
};
