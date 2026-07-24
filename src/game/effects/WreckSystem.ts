// ===== WreckSystem: горящие обломки на месте гибели танка =====
// Спавнит затемнённый "остов" + дым на 5 секунд.
import * as THREE from 'three';
import { smokeTexture } from '../textures';

interface Wreck {
  group: THREE.Group;
  smokeTimer: number;
  life: number;
  active: boolean;
  /** Cached ember materials for flicker without traverse. */
  emberMats: THREE.MeshBasicMaterial[];
}

const WRECK_LIFE = 5.0; // секунд
const SMOKE_INTERVAL = 0.18; // интервал спавна дыма
const MAX_WRECKS = 6;

// Shared geometries — created once, reused across all wrecks.
const HULL_GEO = new THREE.BoxGeometry(2.2, 0.8, 3.4);
const TURRET_GEO = new THREE.CylinderGeometry(0.9, 1.1, 0.5, 8);
const TRACK_GEO = new THREE.BoxGeometry(0.7, 0.5, 2.8);
const EMBER_GEO = new THREE.SphereGeometry(0.16, 6, 6);

// Shared char material (does not change per-wreck).
const CHAR_MAT = new THREE.MeshStandardMaterial({
  color: 0x1a1a1e,
  roughness: 0.95,
  metalness: 0.3,
});

export class WreckSystem {
  private pool: Wreck[] = [];
  private scene: THREE.Scene;
  private smokeTex: THREE.Texture;
  private smokePool: THREE.Sprite[] = [];
  private smokeLife: number[] = [];
  private smokeMaxLife: number[] = [];
  private readonly smokeCap = 32;
  /** Accumulated time for ember flicker (avoids performance.now() per frame). */
  private elapsed = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.smokeTex = smokeTexture();

    // Преаллокация спрайтов дыма
    for (let i = 0; i < this.smokeCap; i++) {
      const mat = new THREE.SpriteMaterial({
        map: this.smokeTex,
        transparent: true,
        depthWrite: false,
        color: 0x1a1a1e,
        opacity: 0,
      });
      const s = new THREE.Sprite(mat);
      s.visible = false;
      scene.add(s);
      this.smokePool.push(s);
      this.smokeLife.push(0);
      this.smokeMaxLife.push(1);
    }
  }

  /**
   * Спавнит обломки на позиции гибели.
   * @param pos Позиция танка
   * @param yaw Ориентация танка
   * @param color Цвет акцента танка (для тлеющих элементов)
   */
  spawn(pos: THREE.Vector3, yaw: number, color: number) {
    // Ищем свободный слот или самый старый
    let slot = this.pool.find((w) => !w.active);
    if (!slot) {
      if (this.pool.length >= MAX_WRECKS) {
        // Удаляем самый старый
        const oldest = this.pool.reduce((a, b) => (a.life < b.life ? a : b));
        this.removeWreck(oldest);
        slot = oldest;
      } else {
        slot = { group: new THREE.Group(), smokeTimer: 0, life: 0, active: false, emberMats: [] };
        this.pool.push(slot);
      }
    }

    // Очищаем старую группу
    this.clearGroup(slot.group);
    slot.emberMats.length = 0;

    // Ember material (unique color per wreck, shared across embers within one wreck).
    const emberMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.6,
    });

    // Основной корпус (деформированный)
    const hull = new THREE.Mesh(HULL_GEO, CHAR_MAT);
    hull.position.y = 0.5;
    hull.rotation.set(
      (Math.random() - 0.5) * 0.15,
      0,
      (Math.random() - 0.5) * 0.12,
    );
    hull.castShadow = true;
    slot.group.add(hull);

    // Башня (сорванная/повёрнутая)
    const turret = new THREE.Mesh(TURRET_GEO, CHAR_MAT);
    turret.position.set(
      (Math.random() - 0.5) * 0.6,
      1.1,
      (Math.random() - 0.5) * 0.4,
    );
    turret.rotation.set(
      Math.random() * 0.3,
      Math.random() * Math.PI * 2,
      Math.random() * 0.25,
    );
    turret.castShadow = true;
    slot.group.add(turret);

    // Обломки гусениц
    for (let i = 0; i < 2; i++) {
      const track = new THREE.Mesh(TRACK_GEO, CHAR_MAT);
      track.position.set(
        (i === 0 ? -1.4 : 1.4) + (Math.random() - 0.5) * 0.3,
        0.25,
        (Math.random() - 0.5) * 0.8,
      );
      track.rotation.y = (Math.random() - 0.5) * 0.4;
      track.castShadow = true;
      slot.group.add(track);
    }

    // Тлеющие элементы (2-3 штуки)
    const emberCount = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < emberCount; i++) {
      const ember = new THREE.Mesh(EMBER_GEO, emberMat);
      ember.position.set(
        (Math.random() - 0.5) * 1.8,
        0.6 + Math.random() * 0.5,
        (Math.random() - 0.5) * 2.4,
      );
      slot.group.add(ember);
    }
    slot.emberMats.push(emberMat);

    slot.group.position.copy(pos);
    slot.group.position.y = 0;
    slot.group.rotation.y = yaw;
    slot.group.visible = true;
    this.scene.add(slot.group);

    slot.active = true;
    slot.life = WRECK_LIFE;
    slot.smokeTimer = 0;
  }

  update(dt: number) {
    this.elapsed += dt;

    // Обновляем обломки
    for (const w of this.pool) {
      if (!w.active) continue;
      w.life -= dt;
      if (w.life <= 0) {
        this.removeWreck(w);
        continue;
      }

      // Спавним дым
      w.smokeTimer -= dt;
      if (w.smokeTimer <= 0) {
        w.smokeTimer = SMOKE_INTERVAL;
        this.spawnSmoke(w.group.position);
      }

      // Мерцание тлеющих элементов (без traverse — кэшированные материалы)
      const flicker = 0.4 + Math.sin(this.elapsed * 10 + w.life * 10) * 0.3;
      const opacity = flicker * Math.min(1, w.life / 1.5);
      for (const m of w.emberMats) {
        m.opacity = opacity;
      }
    }

    // Обновляем дым
    for (let i = 0; i < this.smokeCap; i++) {
      if (this.smokeLife[i] <= 0) continue;
      this.smokeLife[i] -= dt;
      const s = this.smokePool[i];
      const mat = s.material as THREE.SpriteMaterial;
      if (this.smokeLife[i] <= 0) {
        s.visible = false;
        mat.opacity = 0;
        continue;
      }
      const k = this.smokeLife[i] / this.smokeMaxLife[i];
      mat.opacity = 0.45 * k;
      mat.rotation += dt * 0.5;
      s.position.y += dt * 2.2;
      s.scale.setScalar(s.scale.x + dt * 2.8);
    }
  }

  private spawnSmoke(basePos: THREE.Vector3) {
    const idx = this.smokeLife.findIndex((l) => l <= 0);
    if (idx < 0) return;
    const s = this.smokePool[idx];
    s.position.set(
      basePos.x + (Math.random() - 0.5) * 1.4,
      basePos.y + 0.8 + Math.random() * 0.6,
      basePos.z + (Math.random() - 0.5) * 1.4,
    );
    s.scale.setScalar(1.2 + Math.random() * 0.8);
    (s.material as THREE.SpriteMaterial).rotation = Math.random() * Math.PI * 2;
    s.visible = true;
    this.smokeLife[idx] = this.smokeMaxLife[idx] = 1.4 + Math.random() * 0.8;
  }

  private removeWreck(w: Wreck) {
    w.active = false;
    w.group.visible = false;
    this.scene.remove(w.group);
    this.clearGroup(w.group);
    // Dispose per-wreck ember materials (shared geo/char mat are NOT disposed).
    for (const m of w.emberMats) m.dispose();
    w.emberMats.length = 0;
  }

  private clearGroup(group: THREE.Group) {
    // Remove children without disposing shared geometries / CHAR_MAT.
    for (const child of [...group.children]) {
      group.remove(child);
    }
  }

  dispose() {
    for (const w of this.pool) {
      this.removeWreck(w);
    }
    this.pool.length = 0;
    for (const s of this.smokePool) {
      this.scene.remove(s);
      (s.material as THREE.Material).dispose();
    }
    this.smokePool.length = 0;
    // Dispose shared geometries on system teardown.
    HULL_GEO.dispose();
    TURRET_GEO.dispose();
    TRACK_GEO.dispose();
    EMBER_GEO.dispose();
    CHAR_MAT.dispose();
  }
}
