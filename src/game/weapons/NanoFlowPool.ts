// ===== «Изида»: поток нанороботов вдоль луча (подпись оружия) =====
// Направление частиц читает режим: ремонт — наниты летят ОТ стрелка К союзнику
// (мятный «состав» доезжает до корпуса), вампиризм — поток РАЗВОРАЧИВАЕТСЯ и
// бежит ОТ цели к стрелку (высосанное сырьё возвращается в генератор).
// Инстанс-пул светящихся motes по спиральной траектории вокруг оси луча
// (паттерн FlameParticlePool: InstancedMesh + instanceColor, аддитивно, без
// огней и без аллокаций на кадр).
import * as THREE from 'three';

const tmpMatrix = new THREE.Matrix4();
const tmpScale = new THREE.Vector3();
const tmpPos = new THREE.Vector3();
const tmpDir = new THREE.Vector3();
const tmpPerpX = new THREE.Vector3();
const tmpPerpY = new THREE.Vector3();
const tmpQuat = new THREE.Quaternion();
const UP = new THREE.Vector3(0, 1, 0);
const tmpColor = new THREE.Color();

interface NanoMote {
  active: boolean;
  /** Прогресс вдоль луча 0…1; направление движения задаёт reverse. */
  t: number;
  speed: number;
  /** Фаза спирали вокруг оси и радиус витка. */
  phase: number;
  radius: number;
  size: number;
}

/** Спавнов в секунду: весь пул проворачивается за ~0.5 с непрерывного луча. */
const SPAWN_RATE = 96;
/** Скорость mote (долей длины луча/с): полёт ~0.6–1.1 с. */
const SPEED_MIN = 0.9;
const SPEED_MAX = 1.7;

export class NanoFlowPool {
  private mesh: THREE.InstancedMesh;
  private mat: THREE.MeshBasicMaterial;
  private motes: NanoMote[] = [];
  private spawnAcc = 0;
  /** Круговой курсор: O(1) выбор свободного слота (паттерн FlameParticlePool). */
  private cursor = 0;
  private time = 0;
  /** Кэш цвета: instanceColor перезаписываем только при смене режима. */
  private lastColorHex = -1;

  constructor(private scene: THREE.Scene, count: number) {
    const geo = new THREE.IcosahedronGeometry(0.11, 0);
    this.mat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.mesh = new THREE.InstancedMesh(geo, this.mat, count);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(count * 3), 3,
    );
    this.mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    for (let i = 0; i < count; i++) {
      this.motes.push({ active: false, t: 0, speed: 1, phase: 0, radius: 0, size: 1 });
      tmpMatrix.makeScale(0, 0, 0);
      this.mesh.setMatrixAt(i, tmpMatrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    scene.add(this.mesh);
  }

  /**
   * Кадр активного/затухающего потока: from — срез выемки (середина между
   * рожками), to — точка на цели. active=false: новых motes нет, живые
   * доживают траекторию и гаснут.
   */
  update(
    dt: number,
    active: boolean,
    from: THREE.Vector3,
    to: THREE.Vector3,
    reverse: boolean,
    colorHex: number,
  ): void {
    this.time += dt;
    if (colorHex !== this.lastColorHex) {
      this.lastColorHex = colorHex;
      for (let i = 0; i < this.motes.length; i++) {
        // Лёгкая вариация яркости по инстансам: поток не выглядит клонированным.
        const v = 0.6 + 0.4 * ((i * 37) % 11) / 10;
        this.mesh.setColorAt(i, tmpColor.setHex(colorHex).multiplyScalar(v));
      }
      if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    }

    tmpDir.subVectors(to, from);
    const len = tmpDir.length();
    if (len > 1e-4) tmpDir.multiplyScalar(1 / len);
    // Стабильный перпендикулярный базис вокруг оси луча (виток motes).
    tmpPerpX.crossVectors(UP, tmpDir);
    if (tmpPerpX.lengthSq() < 1e-6) tmpPerpX.set(1, 0, 0);
    tmpPerpX.normalize();
    tmpPerpY.crossVectors(tmpDir, tmpPerpX).normalize();

    if (active) {
      this.spawnAcc += dt * SPAWN_RATE;
      while (this.spawnAcc >= 1) {
        this.spawnAcc -= 1;
        this.spawn();
      }
    } else {
      this.spawnAcc = 0;
    }

    for (let i = 0; i < this.motes.length; i++) {
      const m = this.motes[i];
      if (!m.active) {
        tmpMatrix.makeScale(0, 0, 0);
        this.mesh.setMatrixAt(i, tmpMatrix);
        continue;
      }
      m.t += m.speed * dt;
      if (m.t >= 1) {
        m.active = false;
        tmpMatrix.makeScale(0, 0, 0);
        this.mesh.setMatrixAt(i, tmpMatrix);
        continue;
      }
      const p = reverse ? 1 - m.t : m.t;
      // Огибающая: у дула виток широкий, в цели сходится в точку.
      const envelope = Math.sin(p * Math.PI);
      const angle = m.phase + this.time * 6.5;
      const r = m.radius * envelope;
      tmpPos
        .copy(from)
        .addScaledVector(tmpDir, p * len)
        .addScaledVector(tmpPerpX, Math.cos(angle) * r)
        .addScaledVector(tmpPerpY, Math.sin(angle) * r);
      const s = m.size * (0.35 + 0.65 * envelope);
      tmpScale.setScalar(s);
      tmpMatrix.compose(tmpPos, tmpQuat.identity(), tmpScale);
      this.mesh.setMatrixAt(i, tmpMatrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  private spawn(): void {
    for (let tries = 0; tries < this.motes.length; tries++) {
      this.cursor = (this.cursor + 1) % this.motes.length;
      const m = this.motes[this.cursor];
      if (m.active) continue;
      m.active = true;
      m.t = 0;
      m.speed = SPEED_MIN + Math.random() * (SPEED_MAX - SPEED_MIN);
      m.phase = Math.random() * Math.PI * 2;
      m.radius = 0.06 + Math.random() * 0.14;
      m.size = 0.7 + Math.random() * 0.6;
      return;
    }
  }

  onOwnerDeath(): void {
    for (const m of this.motes) m.active = false;
    for (let i = 0; i < this.motes.length; i++) {
      tmpMatrix.makeScale(0, 0, 0);
      this.mesh.setMatrixAt(i, tmpMatrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    this.onOwnerDeath();
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mesh.dispose();
    this.mat.dispose();
  }
}
