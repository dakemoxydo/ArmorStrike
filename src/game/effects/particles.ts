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
import { TrackMarkPool } from './TrackMarkPool';
import { DriveDustPool } from './DriveDustPool';
import type { LightRig } from './LightRig';

export class ParticleEffects {
  private systems: ParticleSystem[];
  private sparks: SparkSystem;
  private smoke: SmokeSystem;
  private flash: FlashSystem;
  private ring: RingSystem;
  private core: CoreSystem;
  private scorch_: ScorchSystem;
  private muzzle_: MuzzleSystem;
  private trackMarks: TrackMarkPool;
  private driveDust: DriveDustPool;

  private tmpCol = new THREE.Color();
  /** Reusable color for burst calls (avoids per-call new THREE.Color()). */
  private burstCol = new THREE.Color();
  /** B9: общие геометрии систем — владеет facade, фасад и диспозит. */
  private readonly sharedGeos: THREE.BufferGeometry[];

  constructor(scene: THREE.Scene, rig: LightRig) {
    const sparkPool = new SparkPool(scene);
    this.sparks = new SparkSystem(sparkPool);

    const sphereGeo = new THREE.SphereGeometry(1, 20, 14);
    const ringGeo = new THREE.RingGeometry(0.55, 1, 40);
    const circleGeo = new THREE.CircleGeometry(1, 28);
    this.sharedGeos = [sphereGeo, ringGeo, circleGeo];

    this.smoke = new SmokeSystem(scene);
    this.flash = new FlashSystem(rig);
    this.ring = new RingSystem(scene, ringGeo);
    this.core = new CoreSystem(scene, sphereGeo);
    this.scorch_ = new ScorchSystem(scene, circleGeo);
    this.muzzle_ = new MuzzleSystem(scene);
    this.trackMarks = new TrackMarkPool(scene);
    this.driveDust = new DriveDustPool(scene);

    this.systems = [
      this.sparks,
      this.smoke,
      this.flash,
      this.ring,
      this.core,
      this.muzzle_,
      this.scorch_,
      this.trackMarks,
      this.driveDust,
    ];
  }

  muzzle(p: THREE.Vector3, color: number) {
    this.muzzle_.flash(p, color);
    this.flash.flash(p, color, 60, 0.09);
    this.sparks.poolRef.burst(p, this.burstCol.setHex(color), 6, { speed: 12, up: 1, life: 0.22, gravity: 2 });
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
    this.ring.spawn(p, 0x8fffe8, 2.8);
    this.sparks.poolRef.burst(p, ParticleEffects._cWhite, 10, {
      speed: 18, up: 2, life: 0.14, gravity: 1,
    });
    this.sparks.poolRef.burst(p, ParticleEffects._cCyan, 14, {
      speed: 14, up: 3, life: 0.22, gravity: 4,
    });
  }

  impact(p: THREE.Vector3, color: number) {
    this.sparks.poolRef.burst(p, this.burstCol.setHex(color), 16, { speed: 10, up: 5, life: 0.5 });
    this.flash.flash(p, color, 18, 0.12);
  }

  /**
   * Rail impact. Avoids ring mesh alloc + second flash light on every pierce.
   * heavy = first tank / wall terminus only.
   */
  railgunImpact(p: THREE.Vector3, color: number, heavy = false) {
    const col = ParticleEffects._cTmp.setHex(color);
    const n = heavy ? 16 : 9;
    this.sparks.poolRef.burst(p, col, n, {
      speed: heavy ? 14 : 11, up: heavy ? 6 : 4, life: 0.45, gravity: 10,
    });
    if (heavy) {
      this.sparks.poolRef.burst(p, ParticleEffects._cWhite, 6, {
        speed: 16, up: 3, life: 0.15, gravity: 2,
      });
      this.ring.spawn(p, color, 1.8);
      // One flash light only on heavy hits — lights are the main lag source.
      this.flash.flash(p, color, 28, 0.1);
    }
  }

  explosion(p: THREE.Vector3, color: number, scale = 1) {
    this.core.spawn(p, 2.6 * scale);
    this.ring.spawn(p, color, 9 * scale);
    this.sparks.poolRef.burst(p, this.burstCol.setHex(color), Math.round(40 * scale), {
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
    this.sparks.poolRef.burst(p, color, 3, { speed: 0.8, up: 0.4, life: 0.65, gravity: -0.5 });
    this.smoke.spawn(p, 1, 0.75, false);
  }

  boostJet(p: THREE.Vector3, dir: THREE.Vector3, color: number) {
    this.sparks.poolRef.jet(p, dir, this.tmpCol.setHex(color), 2, 13);
  }

  tankSmoke(p: THREE.Vector3) {
    this.smoke.spawn(p, 1, 1.0, true);
  }

  private static readonly _defaultDustVel = new THREE.Vector3(0, 0.9, 0);

  tankDust(p: THREE.Vector3, vel?: THREE.Vector3, scale?: number) {
    this.driveDust.spawn(p, vel ?? ParticleEffects._defaultDustVel, scale ?? 0.5);
  }

  trackMark(p: THREE.Vector3, yaw: number, width?: number, length?: number, intensity?: number) {
    this.trackMarks.spawn(p, yaw, width, length, intensity);
  }

  debris(p: THREE.Vector3, color: number, n = 14) {
    this.sparks.poolRef.burst(p, this.burstCol.setHex(color), n, { speed: 13, up: 10, life: 1.1, gravity: 26 });
    this.smoke.spawn(p, 5, 1.4, true);
  }

  update(dt: number) {
    for (const sys of this.systems) sys.update(dt);
  }

  /** Hide smoke/scorch/flash/marks without freeing pools (round start, L-1). */
  clearTransients() {
    this.smoke.clear();
    this.scorch_.clear();
    this.flash.clear();
    this.trackMarks.clear();
    this.driveDust.clear();
  }

  dispose() {
    for (const sys of this.systems) sys.dispose();
    // B9: системы снимают свои материалы, геометрии принадлежат фасаду.
    for (const g of this.sharedGeos) g.dispose();
  }
}
