// ===== Порт VFX: combat/weapons/systems не зависят от concrete Effects class =====
import type * as THREE from 'three';
import type { HullId, TurretId } from '../../core/catalog';

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
  tankDust(p: THREE.Vector3, vel?: THREE.Vector3, scale?: number): void;
  trackMark(p: THREE.Vector3, yaw: number, width?: number, length?: number, intensity?: number): void;
  debris(p: THREE.Vector3, color: number, n?: number): void;

  addShake(amount: number): void;
  getShake(out: THREE.Vector3, elapsed: number): number;

  addFovPunch(degrees: number): void;
  setFovTighten(degrees: number): void;
  getFovBias(): number;

  setAmbientCenter(x: number, z: number): void;
  /**
   * Спавнит горящие обломки на месте гибели танка.
   * `hullId`/`turretId` — силуэт остова «того же корпуса» (п.13);
   * без них деградирует до hunter/cannon.
   */
  spawnWreck(
    p: THREE.Vector3,
    yaw: number,
    color: number,
    hullId?: HullId,
    turretId?: TurretId,
  ): void;
  update(dt: number): void;
  /** Clear round transients (smoke/scorch/wrecks/shake/FOV) at round start. */
  clearTransients(): void;
  /** Full teardown (game dispose / HMR). */
  dispose(): void;
}
