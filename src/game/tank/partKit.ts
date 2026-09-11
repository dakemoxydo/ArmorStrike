// ===== Procedural part kit: detail primitives -> one merged geometry per slot =====
//
// A model (hull or turret) is authored from dozens of primitives — armour plates,
// road wheels, hatches, louvers, rivets — but the scene must not receive dozens
// of meshes: every mesh is a draw call, and up to 10 tanks share the field. So
// parts are bucketed by material slot and fused with `mergeGeometries` into one
// geometry per slot.
//
// Geometry depends only on the model id (never on style), so callers cache the
// result for the whole process and `markShared` it: per-tank cost is materials
// only (needed because FX tint `bodyMats` per tank).
//
// `HullBuilder` (hullKit.ts) and `TurretBuilder` (turretKit.ts) are thin
// subclasses that bind their own slot set.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { markShared } from '../resources/sharedResources';

// Scratch objects — `add` runs hundreds of times per model build.
const _mat = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _euler = new THREE.Euler();
const _pos = new THREE.Vector3();
const _scale = new THREE.Vector3();

/** Bucketed geometry accumulator, generic over the slot-name union. */
export class PartBuilder<S extends string> {
  private readonly slots: readonly S[];
  private readonly buckets: Record<string, THREE.BufferGeometry[]>;

  constructor(slots: readonly S[]) {
    this.slots = slots;
    const buckets: Record<string, THREE.BufferGeometry[]> = {};
    for (const slot of slots) buckets[slot] = [];
    this.buckets = buckets;
  }

  /** Push a geometry with an optional translate/rotate/scale. */
  add(
    geo: THREE.BufferGeometry,
    slot: S,
    x = 0, y = 0, z = 0,
    rx = 0, ry = 0, rz = 0,
    sx = 1, sy = 1, sz = 1,
  ): this {
    if (x || y || z || rx || ry || rz || sx !== 1 || sy !== 1 || sz !== 1) {
      _euler.set(rx, ry, rz);
      _quat.setFromEuler(_euler);
      _mat.compose(_pos.set(x, y, z), _quat, _scale.set(sx, sy, sz));
      geo.applyMatrix4(_mat);
    }
    this.buckets[slot].push(geo);
    return this;
  }

  /** Axis-aligned slab. */
  box(
    w: number, h: number, d: number,
    slot: S,
    x = 0, y = 0, z = 0,
    rx = 0, ry = 0, rz = 0,
  ): this {
    return this.add(new THREE.BoxGeometry(w, h, d), slot, x, y, z, rx, ry, rz);
  }

  /** Cylinder, Y axis by default. */
  cyl(
    rTop: number, rBot: number, h: number, seg: number,
    slot: S,
    x = 0, y = 0, z = 0,
    rx = 0, ry = 0, rz = 0,
  ): this {
    return this.add(new THREE.CylinderGeometry(rTop, rBot, h, seg), slot, x, y, z, rx, ry, rz);
  }

  /** Road wheel / sprocket / idler: cylinder with its axis along X. */
  wheel(r: number, w: number, seg: number, slot: S, x = 0, y = 0, z = 0): this {
    return this.cyl(r, r, w, seg, slot, x, y, z, 0, 0, Math.PI / 2);
  }

  /** Barrel / pipe running along Z (turret guns, exhaust runs). */
  pipe(
    rTop: number, rBot: number, len: number, seg: number,
    slot: S,
    x = 0, y = 0, z = 0,
    ry = 0, rz = 0,
  ): this {
    return this.cyl(rTop, rBot, len, seg, slot, x, y, z, Math.PI / 2, ry, rz);
  }

  sphere(r: number, slot: S, x = 0, y = 0, z = 0, wSeg = 8, hSeg = 6): this {
    return this.add(new THREE.SphereGeometry(r, wSeg, hSeg), slot, x, y, z);
  }

  /** Row of rivets/bolts along (dx, dy, dz), centred on (x, y, z). */
  rivets(
    count: number, r: number, slot: S,
    x: number, y: number, z: number,
    dx = 0, dy = 0, dz = 0,
  ): this {
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0 : i / (count - 1) - 0.5;
      this.sphere(r, slot, x + dx * t, y + dy * t, z + dz * t, 6, 4);
    }
    return this;
  }

  /** Ring of rivets/bolts on a circle of radius `ringR` around (x, z), at height y. */
  rivetRing(
    count: number, r: number, slot: S,
    x: number, y: number, z: number, ringR: number,
  ): this {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      this.sphere(r, slot, x + Math.sin(a) * ringR, y, z + Math.cos(a) * ringR, 6, 4);
    }
    return this;
  }

  /** Louvered grille: `count` thin tilted slats stepped along Z. */
  louvers(
    count: number, w: number, h: number, step: number,
    slot: S, x: number, y: number, z: number, rx = 0,
  ): this {
    for (let i = 0; i < count; i++) {
      this.box(w, h, step * 0.5, slot, x, y, z + step * i, rx, 0, 0);
    }
    return this;
  }

  /**
   * Fuse every bucket into one geometry per slot. Single-part buckets are kept
   * as-is; merged inputs are disposed. Results are `markShared` — they outlive
   * any one tank, so `disposeObject3D` must skip them.
   */
  build(): Partial<Record<S, THREE.BufferGeometry>> {
    const out: Partial<Record<S, THREE.BufferGeometry>> = {};
    for (const slot of this.slots) {
      const parts = this.buckets[slot];
      if (parts.length === 0) continue;

      let merged: THREE.BufferGeometry;
      if (parts.length === 1) {
        merged = parts[0];
      } else {
        const fused = mergeGeometries(parts, false);
        if (!fused) {
          // Attribute mismatch would silently drop the slot — fail loudly instead.
          throw new Error(`partKit: merge failed for slot "${slot}"`);
        }
        for (const p of parts) p.dispose();
        merged = fused;
      }
      merged.computeBoundingSphere();
      out[slot] = markShared(merged);
      parts.length = 0;
    }
    return out;
  }
}

/**
 * Frame of a sloped armour plate. `u` runs along width (X), `v` along the plate
 * (towards the front), `n` along the plate normal — so details can be placed
 * "on the glacis" without re-deriving trigonometry per part.
 */
export function slope(
  cx: number, cy: number, cz: number, rotX: number,
): (u: number, v: number, n?: number) => [number, number, number] {
  const sin = Math.sin(rotX);
  const cos = Math.cos(rotX);
  return (u, v, n = 0) => [cx + u, cy - v * sin + n * cos, cz + v * cos + n * sin];
}
