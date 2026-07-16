import type { ParticleSystem } from './ParticleSystem';
import { SparkPool } from './SparkPool';

export class SparkSystem implements ParticleSystem {
  constructor(private pool: SparkPool) {}

  get poolRef() { return this.pool; }

  update(_dt: number) {
    this.pool.update(_dt);
  }

  dispose() {
    this.pool.dispose();
  }
}
