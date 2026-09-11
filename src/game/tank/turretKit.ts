// ===== Turret kit: turret material slots + builder bound to them =====
//
// Mirror of `hullKit.ts`. The bucketing/merge machinery lives in `partKit.ts`;
// this file only declares the turret slot set and the `TurretBuilder` alias, so
// turret authors keep a typed `b.box(..., 'metal', ...)` API.
//
// Two differences from the hull:
//  * `lamp` — emissive optics (rangefinder lenses, igniter pilots). Basic
//    material, never lit, so it reads as "switched on" against dark recesses.
//  * `rail` — the railgun's energy rails and capacitor strips. These need a
//    material whose `emissiveIntensity` is animated per tank (charge FX), so
//    the slot's geometry is still shared but its material is per-tank.
import type * as THREE from 'three';
import { PartBuilder } from './partKit';

export { slope } from './partKit';

/** Turret material slots — one merged mesh each. */
export const TURRET_SLOTS = ['body', 'metal', 'dark', 'lamp', 'rail'] as const;
export type TurretSlot = (typeof TURRET_SLOTS)[number];

export type TurretSlotSet = Partial<Record<TurretSlot, THREE.BufferGeometry>>;

/** Turret authoring builder — `PartBuilder` bound to `TURRET_SLOTS`. */
export class TurretBuilder extends PartBuilder<TurretSlot> {
  constructor() {
    super(TURRET_SLOTS);
  }
}
