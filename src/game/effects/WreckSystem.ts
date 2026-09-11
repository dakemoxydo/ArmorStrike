// ===== WreckSystem: горящие обломки на месте гибели танка =====
// Спавнит затемнённый "остов" + дым на 5 секунд.
//
// Perf: все слоты обломков (группа, меши и материал тлеющих элементов)
// преаллоцированы в конструкторе и живут в сцене с visible=false. Смерть только
// переставляет/перекрашивает их — ни одной аллокации в бою. Это важно не только
// из-за GC: `material.dispose()` снимает ссылку на шейдер-программу
// (three: WebGLRenderer.releaseProgram), и когда счётчик доходит до нуля,
// программа уничтожается — следующая смерть компилировала её заново.
import * as THREE from 'three';
import { smokeTexture } from '../textures';

interface WreckSlot {
  group: THREE.Group;
  hull: THREE.Mesh;
  turret: THREE.Mesh;
  tracks: THREE.Mesh[];
  embers: THREE.Mesh[];
  /** Material per slot (not per wreck): recoloured on spawn, never disposed. */
  emberMat: THREE.MeshBasicMaterial;
  smokeTimer: number;
  life: number;
  active: boolean;
}

const WRECK_LIFE = 5.0; // секунд
const SMOKE_INTERVAL = 0.18; // интервал спавна дыма
const MAX_WRECKS = 6;
/** Ember meshes per slot — extra ones are hidden (count is random 2..3). */
const MAX_EMBERS = 3;

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
  private readonly slots: WreckSlot[] = [];
  private readonly scene: THREE.Scene;
  private readonly smokeTex: THREE.Texture;
  private readonly smokePool: THREE.Sprite[] = [];
  private readonly smokeLife: number[] = [];
  private readonly smokeMaxLife: number[] = [];
  private readonly smokeCap = 32;
  /** Accumulated time for ember flicker (avoids performance.now() per frame). */
  private elapsed = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.smokeTex = smokeTexture();

    // Pre-allocated wreck slots — see the file header for why.
    for (let i = 0; i < MAX_WRECKS; i++) this.slots.push(this.buildSlot());

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

  /** Build one hidden wreck slot with its own ember material. */
  private buildSlot(): WreckSlot {
    const group = new THREE.Group();

    const hull = new THREE.Mesh(HULL_GEO, CHAR_MAT);
    hull.position.y = 0.5;
    hull.castShadow = true;
    group.add(hull);

    const turret = new THREE.Mesh(TURRET_GEO, CHAR_MAT);
    turret.position.y = 1.1;
    turret.castShadow = true;
    group.add(turret);

    const tracks: THREE.Mesh[] = [];
    for (let i = 0; i < 2; i++) {
      const track = new THREE.Mesh(TRACK_GEO, CHAR_MAT);
      track.position.set(i === 0 ? -1.4 : 1.4, 0.25, 0);
      track.castShadow = true;
      group.add(track);
      tracks.push(track);
    }

    const emberMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
    });
    const embers: THREE.Mesh[] = [];
    for (let i = 0; i < MAX_EMBERS; i++) {
      const ember = new THREE.Mesh(EMBER_GEO, emberMat);
      // Embers never cast shadows: 3 tiny spheres per wreck would only add
      // draws to the shadow pass with nothing visible to show for it.
      ember.castShadow = false;
      group.add(ember);
      embers.push(ember);
    }

    group.visible = false;
    this.scene.add(group);
    return { group, hull, turret, tracks, embers, emberMat, smokeTimer: 0, life: 0, active: false };
  }

  /**
   * Спавнит обломки на позиции гибели.
   * @param pos Позиция танка
   * @param yaw Ориентация танка
   * @param color Цвет акцента танка (для тлеющих элементов)
   */
  spawn(pos: THREE.Vector3, yaw: number, color: number) {
    // Free slot, else steal the one with the least life left.
    let slot = this.slots.find((w) => !w.active);
    if (!slot) {
      slot = this.slots.reduce((a, b) => (a.life < b.life ? a : b));
    }

    // Основной корпус (деформированный)
    slot.hull.rotation.set(
      (Math.random() - 0.5) * 0.15,
      0,
      (Math.random() - 0.5) * 0.12,
    );

    // Башня (сорванная/повёрнутая)
    slot.turret.position.set(
      (Math.random() - 0.5) * 0.6,
      1.1,
      (Math.random() - 0.5) * 0.4,
    );
    slot.turret.rotation.set(
      Math.random() * 0.3,
      Math.random() * Math.PI * 2,
      Math.random() * 0.25,
    );

    // Обломки гусениц
    for (let i = 0; i < slot.tracks.length; i++) {
      const track = slot.tracks[i];
      track.position.set(
        (i === 0 ? -1.4 : 1.4) + (Math.random() - 0.5) * 0.3,
        0.25,
        (Math.random() - 0.5) * 0.8,
      );
      track.rotation.y = (Math.random() - 0.5) * 0.4;
    }

    // Тлеющие элементы (2-3 штуки) — цвет задаётся на общем материале слота
    slot.emberMat.color.setHex(color);
    slot.emberMat.opacity = 0.6;
    const emberCount = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < slot.embers.length; i++) {
      const ember = slot.embers[i];
      ember.visible = i < emberCount;
      if (!ember.visible) continue;
      ember.position.set(
        (Math.random() - 0.5) * 1.8,
        0.6 + Math.random() * 0.5,
        (Math.random() - 0.5) * 2.4,
      );
    }

    slot.group.position.copy(pos);
    slot.group.position.y = 0;
    slot.group.rotation.y = yaw;
    slot.group.visible = true;

    slot.active = true;
    slot.life = WRECK_LIFE;
    slot.smokeTimer = 0;
  }

  update(dt: number) {
    this.elapsed += dt;

    // Обновляем обломки
    for (const w of this.slots) {
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

      // Мерцание тлеющих элементов (один материал на слот — без traverse)
      const flicker = 0.4 + Math.sin(this.elapsed * 10 + w.life * 10) * 0.3;
      w.emberMat.opacity = flicker * Math.min(1, w.life / 1.5);
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

  /** Hide a slot. Nothing to free — the slot is reused by the next death. */
  private removeWreck(w: WreckSlot) {
    w.active = false;
    w.group.visible = false;
    w.emberMat.opacity = 0;
  }

  dispose() {
    for (const w of this.slots) {
      this.removeWreck(w);
      this.scene.remove(w.group);
      // Per-slot ember materials are owned by this system (created in
      // buildSlot) — releasing them here is safe: nothing else uses them.
      w.emberMat.dispose();
    }
    this.slots.length = 0;
    for (const s of this.smokePool) {
      this.scene.remove(s);
      (s.material as THREE.Material).dispose();
    }
    this.smokePool.length = 0;
    // HULL_GEO / TURRET_GEO / TRACK_GEO / EMBER_GEO / CHAR_MAT — модульные
    // синглтоны на весь процесс: их не пересоздают, и следующий WreckSystem
    // (пересоздание Game / StrictMode) работал бы на освобождённых ресурсах.
    // Освобождать их здесь нельзя — как и общий smokeTexture().
  }

  /** Hide all wrecks + smoke without freeing pools (round start, L-1). */
  clear() {
    for (const w of this.slots) {
      if (w.active) this.removeWreck(w);
    }
    for (let i = 0; i < this.smokePool.length; i++) {
      this.smokeLife[i] = 0;
      this.smokeMaxLife[i] = 1;
      const s = this.smokePool[i];
      s.visible = false;
      (s.material as THREE.SpriteMaterial).opacity = 0;
    }
  }
}
