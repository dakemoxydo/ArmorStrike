// ===== Тряска камеры: trauma-модель затухания =====
import * as THREE from 'three';

export class CameraShake {
  trauma = 0;

  add(amount: number) {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  /** Записывает смещение (x,y,z) и возвращает крен (roll) камеры. */
  getShake(out: THREE.Vector3, elapsed: number): number {
    const t2 = this.trauma * this.trauma;
    const f = 26;
    out.set(
      (Math.sin(elapsed * f * 1.3) + Math.sin(elapsed * f * 2.9) * 0.5) * t2 * 0.5,
      (Math.sin(elapsed * f * 1.7 + 4) + Math.sin(elapsed * f * 3.3) * 0.5) * t2 * 0.35,
      (Math.sin(elapsed * f * 1.1 + 8) + Math.sin(elapsed * f * 2.3) * 0.5) * t2 * 0.5,
    );
    return Math.sin(elapsed * f * 1.9 + 2) * t2 * 0.02; // крен камеры
  }

  update(dt: number) {
    this.trauma = Math.max(0, this.trauma - dt * 1.6);
  }
}
