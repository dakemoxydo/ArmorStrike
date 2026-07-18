// ===== Эффекты: фасад над подсистемами частиц/тряски/пыли =====
// Делегирует реализацию модулям в ./effects/*, сохраняя единый публичный
// интерфейс для вызывающих (Game, GameSimulation, CombatSystem, weapons, systems).
import * as THREE from 'three';
import { ParticleEffects } from './effects/particles';
import { CameraShake } from './effects/CameraShake';
import { AmbientDust } from './effects/AmbientDust';
import type { EffectsPort } from './ports/EffectsPort';

export type { EffectsPort } from './ports/EffectsPort';

export class Effects implements EffectsPort {
  private particles: ParticleEffects;
  private shake: CameraShake;
  private dust: AmbientDust;
  /** Degrees added to FOV (fire punch), damps toward 0. */
  private fovPunch = 0;
  /** Degrees subtracted from FOV (charge zoom), set explicitly. */
  private fovTighten = 0;

  constructor(scene: THREE.Scene) {
    this.particles = new ParticleEffects(scene);
    this.shake = new CameraShake();
    this.dust = new AmbientDust(scene);
  }

  muzzle(p: THREE.Vector3, color: number) { this.particles.muzzle(p, color); }
  railgunMuzzle(p: THREE.Vector3) { this.particles.railgunMuzzle(p); }
  impact(p: THREE.Vector3, color: number) { this.particles.impact(p, color); }
  railgunImpact(p: THREE.Vector3, color: number, heavy = false) {
    this.particles.railgunImpact(p, color, heavy);
  }
  explosion(p: THREE.Vector3, color: number, scale = 1) { this.particles.explosion(p, color, scale); }
  spawnSmoke(p: THREE.Vector3, n: number, size = 1.2, dark = false) { this.particles.spawnSmoke(p, n, size, dark); }
  trailPuff(p: THREE.Vector3, color: THREE.Color) { this.particles.trailPuff(p, color); }
  boostJet(p: THREE.Vector3, dir: THREE.Vector3, color: number) { this.particles.boostJet(p, dir, color); }
  tankSmoke(p: THREE.Vector3) { this.particles.tankSmoke(p); }
  tankDust(p: THREE.Vector3) { this.particles.tankDust(p); }
  debris(p: THREE.Vector3, color: number, n = 14) { this.particles.debris(p, color, n); }

  addShake(amount: number) { this.shake.add(amount); }
  getShake(out: THREE.Vector3, elapsed: number): number { return this.shake.getShake(out, elapsed); }

  /** Instant FOV widen (railgun fire punch). */
  addFovPunch(degrees: number) {
    this.fovPunch = Math.min(10, this.fovPunch + degrees);
  }

  /** Charge zoom-in amount (0 = none). Cleared on fire / idle. */
  setFovTighten(degrees: number) {
    this.fovTighten = Math.max(0, degrees);
  }

  /** Net FOV bias for camera: +wider / −narrower. */
  getFovBias(): number {
    return this.fovPunch - this.fovTighten;
  }

  setAmbientCenter(x: number, z: number) { this.dust.setCenter(x, z); }

  update(dt: number) {
    this.shake.update(dt);
    this.dust.update(dt);
    this.particles.update(dt);
    // Fast settle so punch feels snappy
    this.fovPunch = Math.max(0, this.fovPunch - dt * 22);
  }
}
