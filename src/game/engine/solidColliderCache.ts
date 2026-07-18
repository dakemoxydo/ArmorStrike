// ===== Cache of non-ramp colliders for hull physics (shared, no Arena import) =====
// Extracted from PhysicsSystem so Arena.rebuild can invalidate without a cycle:
// Arena ↛ PhysicsSystem ↛ simPorts ↛ weapons ↛ Arena.
import type { Collider } from './physics';

let _solidSrc: Collider[] | null = null;
let _solid: Collider[] = [];

/** Call after arena rebuild (same array ref, new contents). */
export function invalidateSolidColliderCache() {
  _solidSrc = null;
  _solid = [];
}

/** Non-ramp colliders used for tank hull resolve (ramps are visual wedges). */
export function solidColliders(colliders: Collider[]): Collider[] {
  if (colliders === _solidSrc) return _solid;
  _solidSrc = colliders;
  _solid = colliders.filter((c) => c.kind !== 'ramp');
  return _solid;
}
