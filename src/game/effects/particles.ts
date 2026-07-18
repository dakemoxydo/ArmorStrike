// ===== Визуальные частицы: искры, дым, вспышки, кольца, ядра, подпалины, дульные спрайты =====
// Facade: делегирует каждой категории частиц в свой ParticleSystem.
import * as THREE from 'three';
import type { ParticleSystem } from './ParticleSystem';
import { SparkPool } from './SparkPool';
import { SparkSystem } from './SparkSystem';
import { SmokeSystem } from './SmokeSystem';
import { FlashSystem } from './FlashSystem';
import { RingSystem } from './RingSystem';
import { CoreSystem } from './CoreSystem';
import { ScorchSystem } from './ScorchSystem';
import { MuzzleSystem } from './MuzzleSystem';

export class ParticleEffects {
  private systems: ParticleSystem[];
  private sparks: SparkSystem;
  private smoke: SmokeSystem;
  private flash: FlashSystem;
  private ring: RingSystem;
  private core: CoreSystem;
  private scorch_: ScorchSystem;
  private muzzle_: MuzzleSystem;

  private tmpCol = new THREE.Color();

  constructor(scene: THREE.Scene) {
    const sparkPool = new SparkPool(scene);
    this.sparks = new SparkSystem(sparkPool);

    const sphereGeo = new THREE.SphereGeometry(1, 20, 14);
    const ringGeo = new THREE.RingGeometry(0.55, 1, 40);
    const circleGeo = new THREE.CircleGeometry(1, 28);

    this.smoke = new SmokeSystem(scene);
    this.flash = new FlashSystem(scene);
    this.ring = new RingSystem(scene, ringGeo);
    this.core = new CoreSystem(scene, sphereGeo);
    this.scorch_ = new ScorchSystem(scene, circleGeo);
    this.muzzle_ = new MuzzleSystem(scene);

    this.systems = [
      this.sparks,
      this.smoke,
      this.flash,
      this.ring,
      this.core,
      this.muzzle_,
      this.scorch_,
    ];
  }

  muzzle(p: THREE.Vector3, color: number) {
    this.muzzle_.flash(p, color);
    this.flash.flash(p, color, 60, 0.09);
    this.sparks.poolRef.burst(p, new THREE.Color(color), 6, { speed: 12, up: 1, life: 0.22, gravity: 2 });
  }

  private static readonly _cWhite = new THREE.Color(0xffffff);
  private static readonly _cCyan = new THREE.Color(0x8fffe8);
  private static readonly _cTmp = new THREE.Color();

  /**
   * Railgun muzzle punch — kept light: 1 sprite + 1 point-flash + modest sparks.
   * (Previous multi-flash/light stack caused visible frame hitches.)
   */
  railgunMuzzle(p: THREE.Vector3) {
    this.muzzle_.flash(p, 0x8fffe8);
    this.flash.flash(p, 0xffffff, 48, 0.08);
    this.sparks.poolRef.burst(p, ParticleEffects._cWhite, 8, {
      speed: 18, up: 2, life: 0.14, gravity: 1,
    });
    this.sparks.poolRef.burst(p, ParticleEffects._cCyan, 12, {
      speed: 14, up: 3, life: 0.22, gravity: 4,
    });
  }

  impact(p: THREE.Vector3, color: number) {
    this.sparks.poolRef.burst(p, new THREE.Color(color), 16, { speed: 10, up: 5, life: 0.5 });
    this.flash.flash(p, color, 18, 0.12);
  }

  /**
   * Rail impact. Avoids ring mesh alloc + second flash light on every pierce.
   * heavy = first tank / wall terminus only.
   */
  railgunImpact(p: THREE.Vector3, color: number, heavy = false) {
    const col = ParticleEffects._cTmp.setHex(color);
    const n = heavy ? 14 : 8;
    this.sparks.poolRef.burst(p, col, n, {
      speed: heavy ? 14 : 11, up: heavy ? 6 : 4, life: 0.4, gravity: 10,
    });
    if (heavy) {
      this.sparks.poolRef.burst(p, ParticleEffects._cWhite, 5, {
        speed: 16, up: 3, life: 0.14, gravity: 2,
      });
      // One flash light only on heavy hits — lights are the main lag source.
      this.flash.flash(p, color, 28, 0.1);
    }
  }

  explosion(p: THREE.Vector3, color: number, scale = 1) {
    this.core.spawn(p, 2.6 * scale);
    this.ring.spawn(p, color, 9 * scale);
    this.sparks.poolRef.burst(p, new THREE.Color(color), Math.round(40 * scale), {
      speed: 15 * scale, up: 9, life: 0.9, gravity: 16,
    });
    this.spawnSmoke(p, 7, 1.6 * scale, true);
    this.flash.flash(p, color, 160 * scale, 0.35);
    this.scorch_.addScorch(p, 2.4 * scale);
  }

  spawnSmoke(p: THREE.Vector3, n: number, size = 1.2, dark = false) {
    this.smoke.spawn(p, n, size, dark);
  }

  trailPuff(p: THREE.Vector3, color: THREE.Color) {
    this.sparks.poolRef.burst(p, color, 1, { speed: 0.3, up: 0.1, life: 0.16, gravity: 0 });
  }

  boostJet(p: THREE.Vector3, dir: THREE.Vector3, color: number) {
    this.sparks.poolRef.jet(p, dir, this.tmpCol.setHex(color), 2, 13);
  }

  tankSmoke(p: THREE.Vector3) {
    this.smoke.spawn(p, 1, 1.0, true);
  }

  tankDust(p: THREE.Vector3) {
    this.smoke.spawn(p, 1, 0.7, false);
  }

  debris(p: THREE.Vector3, color: number, n = 14) {
    this.sparks.poolRef.burst(p, new THREE.Color(color), n, { speed: 13, up: 10, life: 1.1, gravity: 26 });
    this.smoke.spawn(p, 5, 1.4, true);
  }

  update(dt: number) {
    for (const sys of this.systems) sys.update(dt);
  }

  dispose() {
    for (const sys of this.systems) sys.dispose();
  }
}
