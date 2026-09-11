// ===== Hull kit: hull material slots + builder bound to them =====
//
// The bucketing/merge machinery lives in `partKit.ts` and is shared with the
// turret kit. This file only declares the hull slot set and the `HullBuilder`
// alias, so hull authors keep a typed `b.box(..., 'body', ...)` API.
import type * as THREE from 'three';
import { PartBuilder } from './partKit';

export { slope } from './partKit';

/** Hull material slots — one merged mesh each. */
export const HULL_SLOTS = ['body', 'metal', 'dark', 'track', 'lamp'] as const;
export type HullSlot = (typeof HULL_SLOTS)[number];

export type HullGeometrySet = Partial<Record<HullSlot, THREE.BufferGeometry>>;

/** Hull authoring builder — `PartBuilder` bound to `HULL_SLOTS`. */
export class HullBuilder extends PartBuilder<HullSlot> {
  constructor() {
    super(HULL_SLOTS);
  }
}
