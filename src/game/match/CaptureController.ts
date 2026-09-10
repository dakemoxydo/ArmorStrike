// ===== Контроллер захвата точек: зоны, маркеры, скоринг =====
// Извлечено из MatchRuntime для разделения ответственности (SRP).
// MatchRuntime делегирует сюда capture-логику; поведение идентично.
import type * as THREE from 'three';
import type { TankEntity } from '../Tank';
import type { MapId } from '../maps/mapCatalog';
import { zonesForMap } from './captureAnchors';
import {
  countPresenceInZone,
  scoreDeltaFromZones,
  stepCaptureZoneInto,
  type CaptureZoneState,
} from './captureLogic';
import { CaptureMarkers } from './CaptureMarkers';

export class CaptureController {
  zones: CaptureZoneState[] = [];
  private markers: CaptureMarkers | null = null;
  /**
   * Pooled step targets — stepCaptureZoneInto mutates them in place each tick
   * (was: fresh array of fresh spread-copies per zone per frame). Rebuilt when
   * the anchor set changes (map switch / reset creates a new zones array).
   */
  private _pool: CaptureZoneState[] = [];

  /** Snapshot for HUD/minimap (read-only view). */
  getCaptureZones(): readonly CaptureZoneState[] {
    return this.zones;
  }

  /** Инициализация зон и маркеров при старте CP-матча. */
  reset(mapId: MapId, scene: THREE.Scene) {
    this.dispose();
    this.zones = zonesForMap(mapId);
    this.markers = new CaptureMarkers(scene);
    this.markers.mount(this.zones);
  }

  /** Очистка визуалов (при смене матча / dispose). */
  dispose() {
    this.disposeMarkers();
    this.zones = [];
    this._pool = [];
  }

  /** Drop markers only, keep zone data (L-4: clearTanks path). */
  disposeMarkers() {
    this.markers?.dispose();
    this.markers = null;
  }

  /** Drop zone data (leaving CP); markers already gone. */
  clearZones() {
    this.zones = [];
    this._pool = [];
  }

  /**
   * Per-frame: step zones in place + scoring.
   * Возвращает дельту очков { alpha, bravo } для teamScore.
   */
  update(dt: number, tanks: TankEntity[]): { alpha: number; bravo: number } {
    if (this.zones.length === 0) return { alpha: 0, bravo: 0 };

    // Seed the pooled step targets only when the anchor set changed (reset()
    // assigns a fresh zones array). In steady state zones IS the pool: each
    // tick mutates the previous tick's output — same semantics as the old
    // per-frame copy chain, minus the allocations.
    if (this._pool !== this.zones || this._pool.length !== this.zones.length) {
      this._pool = this.zones.map((z) => ({ ...z }));
    }

    const next: CaptureZoneState[] = this._pool;
    for (let i = 0; i < this.zones.length; i++) {
      const presence = countPresenceInZone(this.zones[i], tanks);
      next[i] = stepCaptureZoneInto(next[i], presence, dt);
    }
    this.zones = next;

    const delta = scoreDeltaFromZones(this.zones, dt);
    this.markers?.sync(this.zones);
    return delta;
  }
}
