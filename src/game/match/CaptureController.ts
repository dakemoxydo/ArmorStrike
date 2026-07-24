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
  stepCaptureZone,
  type CaptureZoneState,
} from './captureLogic';
import { CaptureMarkers } from './CaptureMarkers';

export class CaptureController {
  zones: CaptureZoneState[] = [];
  private markers: CaptureMarkers | null = null;

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
    this.markers?.dispose();
    this.markers = null;
    this.zones = [];
  }

  /**
   * Per-frame: шаг зон + скоринг.
   * Возвращает дельту очков { alpha, bravo } для teamScore.
   */
  update(dt: number, tanks: TankEntity[]): { alpha: number; bravo: number } {
    if (this.zones.length === 0) return { alpha: 0, bravo: 0 };

    const next: CaptureZoneState[] = [];
    for (const z of this.zones) {
      const presence = countPresenceInZone(z, tanks);
      next.push(stepCaptureZone(z, presence, dt));
    }
    this.zones = next;

    const delta = scoreDeltaFromZones(this.zones, dt);
    this.markers?.sync(this.zones);
    return delta;
  }
}
