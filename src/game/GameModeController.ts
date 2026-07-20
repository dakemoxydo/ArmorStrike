// ===== Контроллер игровых режимов (menu/garage/playing/over + пауза) =====
import type * as THREE from 'three';
import type { GameSimulation } from './engine/GameSimulation';
import type { CameraRig } from './CameraRig';
import type { RenderWorld } from './RenderWorld';
import type { PreviewController } from './PreviewController';
import type { GameMode, GameEvent } from './types';
import type { WeaponFactoryDeps } from './PlayerFactory';
import type { MapId } from './maps/mapCatalog';
import { DEFAULT_MAP_ID, isMapId } from './maps/mapCatalog';
import { spawnMatchRoster } from './match/rosterSpawn';
import { DEFAULT_MATCH_MODE } from './match/matchConfig';
import type { MatchModeId } from './match/matchTypes';

export interface GameModeControllerDeps {
  sim: GameSimulation;
  scene: THREE.Scene;
  cameraRig: CameraRig;
  renderWorld: RenderWorld;
  previewController: PreviewController;
  canvas: HTMLCanvasElement;
  weaponDeps: WeaponFactoryDeps;
  emit: (e: GameEvent) => void;
  /** Rebuild minimap static layer after arena map switch. */
  onArenaRebuilt?: () => void;
}

/**
 * Инкапсулирует переходы между режимами, старт раунда и паузу.
 */
export class GameModeController {
  /** Last selected match mode (ModeSelect UI → setMatchMode). */
  matchMode: MatchModeId = DEFAULT_MATCH_MODE;

  constructor(private d: GameModeControllerDeps) {}

  setMode(mode: GameMode) {
    const { sim, cameraRig, previewController, canvas, emit } = this.d;
    const wasPlaying = sim.run.mode === 'playing' || sim.run.mode === 'over';
    if (wasPlaying && (mode === 'menu' || mode === 'garage')) {
      sim.clearTanks(this.d.scene);
      sim.projectiles.clear();
      sim.deathT = -1;
      sim.run.paused = false;
      sim.input.enabled = false;
      sim.input.releaseLock();
      cameraRig.resetFov();
    }
    sim.run.mode = mode;
    sim.audio.click();
    if (mode === 'garage') {
      cameraRig.resetGarage();
      canvas.style.cursor = 'grab';
    } else {
      canvas.style.cursor = '';
    }
    if (mode === 'menu' || mode === 'garage') {
      previewController.setVisible(true);
    } else {
      previewController.setVisible(false);
    }
    emit({ type: 'modeChanged', mode });
  }

  setMatchMode(mode: MatchModeId) {
    this.matchMode = mode;
  }

  startRound(mapId: MapId = DEFAULT_MAP_ID, matchMode?: MatchModeId) {
    const { sim, scene, previewController, cameraRig, weaponDeps, emit, onArenaRebuilt } = this.d;
    const mode = matchMode ?? this.matchMode;

    sim.audio.ensure();
    sim.audio.stopEngine();
    sim.clearTanks(scene);
    sim.projectiles.clear();
    previewController.setVisible(false);

    const id = isMapId(mapId) ? mapId : DEFAULT_MAP_ID;
    sim.arena.rebuild(id);
    onArenaRebuilt?.();

    sim.run.resetRun();
    sim.deathT = -1;
    sim.prevReloading = false;
    sim.match.reset(mode, { mapId: id, scene });

    const { player, bots } = spawnMatchRoster(sim.match.config, {
      scene,
      weaponDeps,
      tanks: sim.tanks,
      nameplates: sim.nameplates,
      hullId: sim.run.currentHull,
      turretId: sim.run.currentTurret,
    });

    sim.player = player;
    sim.bots.bots = bots;

    sim.run.mode = 'playing';
    sim.run.paused = false;
    sim.input.enabled = true;
    sim.input.look.reset(player.yaw);
    cameraRig.snap(player, sim.input.look.yaw, sim.input.look.pitch);
    sim.audio.startEngine();
    sim.input.requestLock();
    emit({ type: 'modeChanged', mode: 'playing' });
  }

  togglePause() {
    const { sim, emit } = this.d;
    if (sim.run.mode !== 'playing' || sim.deathT >= 0) return;
    sim.run.paused = !sim.run.paused;
    if (sim.run.paused) {
      sim.input.releaseLock();
    } else {
      sim.input.requestLock();
    }
    emit({ type: 'pauseChanged', value: sim.run.paused });
  }
}
