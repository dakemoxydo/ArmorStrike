export interface ParticleSystem {
  update(dt: number): void;
  dispose(): void;
}
