// ===== Порт VFX: combat/weapons/systems не зависят от concrete Effects class =====
import type * as THREE from 'three';

/**
 * Публичный контракт фасада эффектов.
 * `Effects` реализует порт; вызовы остаются побайтно теми же методами.
 */
export interface EffectsPort {
  muzzle(p: THREE.Vector3, color: number): void;
  railgunMuzzle(p: THREE.Vector3): void;
  impact(p: THREE.Vector3, color: number): void;
  railgunImpact(p: THREE.Vector3, color: number, heavy?: boolean): void;
  explosion(p: THREE.Vector3, color: number, scale?: number): void;
  spawnSmoke(p: THREE.Vector3, n: number, size?: number, dark?: boolean): void;
  trailPuff(p: THREE.Vector3, color: THREE.Color): void;
  boostJet(p: THREE.Vector3, dir: THREE.Vector3, color: number): void;
  tankSmoke(p: THREE.Vector3): void;
  tankDust(p: THREE.Vector3): void;
  debris(p: THREE.Vector3, color: number, n?: number): void;

  addShake(amount: number): void;
  getShake(out: THREE.Vector3, elapsed: number): number;

  addFovPunch(degrees: number): void;
  setFovTighten(degrees: number): void;
  getFovBias(): number;

  setAmbientCenter(x: number, z: number): void;
  /** Спавнит горящие обломки на месте гибели танка. */
  spawnWreck(p: THREE.Vector3, yaw: number, color: number): void;
  update(dt: number): void;
}
