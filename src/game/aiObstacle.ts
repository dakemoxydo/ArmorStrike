// ===== ИИ: избегание препятствий (чистая логика без смены чисел) =====
import { pointInCollider } from './engine/physics';
import type { Collider } from './engine/physics';
import type { AIBody } from './AI';

export interface AvoidState {
  avoidT: number;
  avoidDir: number;
}

export function dirFree(t: AIBody, a: number, colliders: Collider[]): boolean {
  const px = t.position.x + Math.sin(a) * 5;
  const pz = t.position.z + Math.cos(a) * 5;
  for (const c of colliders) {
    if (c.active && c.kind !== 'ramp' && pointInCollider(px, pz, c, 1.4)) return false;
  }
  return true;
}

/** Шаг 6: избегание препятствий. Мутирует avoid-state. */
export function computeObstacleAvoidance(
  state: AvoidState,
  dt: number,
  t: AIBody,
  colliders: Collider[],
): { steerOverride: number | null; throttleOverride: number | null } {
  const fx = Math.sin(t.yaw);
  const fz = Math.cos(t.yaw);
  const probeX = t.position.x + fx * 4.2;
  const probeZ = t.position.z + fz * 4.2;
  let blocked = false;
  for (const c of colliders) {
    if (!c.active || c.kind === 'ramp') continue; // M12: ramps not solid for hull/AI
    if (pointInCollider(probeX, probeZ, c, 1.4)) { blocked = true; break; }
  }
  if (state.avoidT > 0) {
    state.avoidT -= dt;
    return { steerOverride: state.avoidDir, throttleOverride: 0.7 };
  } else if (blocked) {
    const la = t.yaw + Math.PI / 3;
    const ra = t.yaw - Math.PI / 3;
    const lFree = dirFree(t, la, colliders);
    const rFree = dirFree(t, ra, colliders);
    state.avoidDir = lFree && !rFree ? 1 : !lFree && rFree ? -1 : Math.random() > 0.5 ? 1 : -1;
    state.avoidT = 0.6;
  }
  return { steerOverride: null, throttleOverride: null };
}
