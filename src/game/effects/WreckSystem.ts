// ===== WreckSystem: горящие обломки на месте гибели танка =====
// Спавнит остов «того же корпуса» (п.13 Visual_Coherence_Pass): слитый
// силуэт hullGeometry(hullId) + сбитая башня turretGeometry(turretId) в
// графитном cel-материале, 2–3 ember-плашки и столб дыма на 5 секунд.
//
// Perf: все слоты обломков (группы, меши и материал тлеющих элементов)
// преаллоцированы в конструкторе и живут в сцене с visible=false. Смерть только
// переставляет меши (geometry свапится из process-кэша) и перекрашивает эмберы —
// ни одной аллокации геометрии в бою. Это важно не только из-за GC:
// `material.dispose()` снимает ссылку на шейдер-программу
// (three: WebGLRenderer.releaseProgram), и когда счётчик доходит до нуля,
// программа уничтожается — следующая смерть компилировала её заново.
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { smokeTexture } from '../textures';
import { hullGeometry } from '../tank/hull';
import { HULL_SLOTS } from '../tank/hullKit';
import { turretGeometry } from '../tank/turret';
import { TURRET_SLOTS } from '../tank/turretKit';
import { HULL_TURRET_Y } from '../tank/TankConfig';
import { BARREL_REST_Z } from '../tuning';
import { applyCelShading } from '../shaders/celShading';
import { markShared } from '../resources/sharedResources';
import type { HullId, TurretId } from '../../core/catalog';

interface WreckSlot {
  group: THREE.Group;
  hull: THREE.Mesh;
  turret: THREE.Mesh;
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
/** Ember patches per slot — extra ones are hidden (count is random 2..3). */
const MAX_EMBERS = 3;
/** Fallback silhouette when a cross-slot merge fails (never expected). */
const FALLBACK_HULL_ID: HullId = 'hunter';

// Shared ember patch geometry — created once, reused across all wrecks.
const EMBER_GEO = new THREE.CircleGeometry(0.18, 6);

// Shared char material (does not change per-wreck): графитный тон + cel-ступени,
// чтобы остов говорил на языке танков, а не «другого движка».
const CHAR_MAT = new THREE.MeshStandardMaterial({
  color: 0x35353d,
  roughness: 0.95,
  metalness: 0.3,
});
applyCelShading(CHAR_MAT);

// Process-lifetime wreck silhouette caches (не диспозятся — конвенция модульных
// синглтонов, как HULL_GEO/CHAR_MAT раньше): key = hullId / turretId.
const hullSilhouetteCache = new Map<HullId, THREE.BufferGeometry>();
const turretSilhouetteCache = new Map<TurretId, THREE.BufferGeometry>();

/**
 * Слить слоты hullGeometry в один «остовный» силуэт. Атрибуты слотов
 * контрактно идентичны (`normal/position/uv`, см. hullGeometry.test), но
 * неиндексированный одиночный слот приводится к индексу через mergeVertices.
 * Экспорт — для пинов кэша/markShared в wreckSilhouette.test.
 */
export function hullSilhouette(hullId: HullId): THREE.BufferGeometry {
  const cached = hullSilhouetteCache.get(hullId);
  if (cached) return cached;
  const set = hullGeometry(hullId);
  const parts: THREE.BufferGeometry[] = [];
  const temps: THREE.BufferGeometry[] = [];
  for (const slot of HULL_SLOTS) {
    const g = set[slot];
    if (!g) continue;
    if (g.index) {
      parts.push(g);
    } else {
      const indexed = mergeVertices(g);
      parts.push(indexed);
      temps.push(indexed);
    }
  }
  if (parts.length === 0) throw new Error(`wreck: empty hull geometry ${hullId}`);
  // mergeGeometries создаёт новый объект; одиночный слот берём как есть.
  const merged = parts.length === 1 ? parts[0] : mergeGeometries(parts, false);
  // Никогда не должно случиться (атрибуты слотов контрактно идентичны,
  // см. hullGeometry.test) — но падать на смерти танка нельзя.
  const result = merged ?? parts[0];
  for (const t of temps) {
    if (t !== result) t.dispose();
  }
  if (!merged) {
    // Деградация до body-слота: всё равно силуэт корпуса, не бокс 2.2×0.8×3.4.
    const shared = markShared(result);
    hullSilhouetteCache.set(hullId, shared);
    return shared;
  }
  result.computeBoundingSphere();
  const shared = markShared(result);
  hullSilhouetteCache.set(hullId, shared);
  return shared;
}

/** Слить shell + barrel (в покойном положении) башни в один силуэт. Экспорт — для тестов. */
export function turretSilhouette(turretId: TurretId): THREE.BufferGeometry {
  const cached = turretSilhouetteCache.get(turretId);
  if (cached) return cached;
  const { shell, barrel, layout } = turretGeometry(turretId);
  const parts: THREE.BufferGeometry[] = [];
  const temps: THREE.BufferGeometry[] = [];
  const push = (g: THREE.BufferGeometry | undefined) => {
    if (!g) return;
    if (g.index) {
      parts.push(g);
    } else {
      const indexed = mergeVertices(g);
      parts.push(indexed);
      temps.push(indexed);
    }
  };
  for (const slot of TURRET_SLOTS) push(shell[slot]);
  for (const slot of TURRET_SLOTS) {
    const g = barrel[slot];
    if (!g) continue;
    const moved = g.clone();
    moved.translate(0, layout.barrelY, BARREL_REST_Z);
    parts.push(moved);
    temps.push(moved);
  }
  const merged = parts.length === 0 ? null : (parts.length === 1 ? parts[0] : mergeGeometries(parts, false));
  if (!merged) {
    for (const t of temps) t.dispose();
    // Коническая заглушка прежнего остова — деградация без краша.
    const fb = markShared(new THREE.CylinderGeometry(0.9, 1.1, 0.5, 8));
    turretSilhouetteCache.set(turretId, fb);
    return fb;
  }
  for (const t of temps) {
    if (t !== merged) t.dispose();
  }
  merged.computeBoundingSphere();
  const shared = markShared(merged);
  turretSilhouetteCache.set(turretId, shared);
  return shared;
}

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

    // Geometry подменяется в spawn() из process-кэша силуэтов.
    const hull = new THREE.Mesh(hullSilhouette(FALLBACK_HULL_ID), CHAR_MAT);
    hull.castShadow = true;
    group.add(hull);

    const turret = new THREE.Mesh(turretSilhouette('cannon'), CHAR_MAT);
    turret.castShadow = true;
    group.add(turret);

    const emberMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    });
    const embers: THREE.Mesh[] = [];
    for (let i = 0; i < MAX_EMBERS; i++) {
      const ember = new THREE.Mesh(EMBER_GEO, emberMat);
      // Embers never cast shadows: tiny patches per wreck would only add
      // draws to the shadow pass with nothing visible to show for it.
      ember.castShadow = false;
      group.add(ember);
      embers.push(ember);
    }

    group.visible = false;
    this.scene.add(group);
    return { group, hull, turret, embers, emberMat, smokeTimer: 0, life: 0, active: false };
  }

  /**
   * Спавнит обломки на позиции гибели.
   * @param pos Позиция танка
   * @param yaw Ориентация танка
   * @param color Цвет акцента танка (для тлеющих элементов)
   * @param hullId Корпус погибшего — силуэт остова «тот же корпус» (п.13)
   * @param turretId Башня погибшего — сбитая башня на остове
   */
  spawn(
    pos: THREE.Vector3,
    yaw: number,
    color: number,
    hullId: HullId = FALLBACK_HULL_ID,
    turretId: TurretId = 'cannon',
  ) {
    // Free slot, else steal the one with the least life left.
    let slot = this.slots.find((w) => !w.active);
    if (!slot) {
      slot = this.slots.reduce((a, b) => (a.life < b.life ? a : b));
    }

    // Силуэт «того же корпуса» + сбитая башня (swap ссылки, не аллокация)
    slot.hull.geometry = hullSilhouette(hullId);
    slot.turret.geometry = turretSilhouette(turretId);

    // Корпус (лёгкий крен от взрыва)
    slot.hull.rotation.set(
      (Math.random() - 0.5) * 0.15,
      0,
      (Math.random() - 0.5) * 0.12,
    );
    slot.hull.position.y = 0;

    // Башня (сорванная/повёрнутая) на высоте палубы своего корпуса
    const turretY = HULL_TURRET_Y[hullId] + 0.15;
    slot.turret.position.set(
      (Math.random() - 0.5) * 0.6,
      turretY,
      (Math.random() - 0.5) * 0.4,
    );
    slot.turret.rotation.set(
      Math.random() * 0.3,
      Math.random() * Math.PI * 2,
      Math.random() * 0.25,
    );

    // Тлеющие плашки (2-3 штуки) — цвет задаётся на общем материале слота
    slot.emberMat.color.setHex(color);
    slot.emberMat.opacity = 0.6;
    const emberCount = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < slot.embers.length; i++) {
      const ember = slot.embers[i];
      ember.visible = i < emberCount;
      if (!ember.visible) continue;
      ember.position.set(
        (Math.random() - 0.5) * 2.2,
        0.5 + Math.random() * (turretY - 0.3),
        (Math.random() - 0.5) * 3.0,
      );
      ember.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI,
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
    // hullSilhouetteCache / turretSilhouetteCache / EMBER_GEO / CHAR_MAT —
    // модульные синглтоны на весь процесс: их не пересоздают, и следующий
    // WreckSystem (пересоздание Game / StrictMode) работал бы на
    // освобождённых ресурсах. Освобождать их здесь нельзя — как и общий
    // smokeTexture() и markShared-геометрии hullGeometry/turretGeometry.
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
