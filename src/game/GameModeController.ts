// ===== Контроллер игровых режимов (menu/garage/playing/over + пауза) =====
import type * as THREE from 'three';
import type { GameSimulation } from './engine/GameSimulation';
import type { CameraRig } from './CameraRig';
import type { RenderWorld } from './RenderWorld';
import type { PreviewController } from './PreviewController';
import type { GameMode, GameEvent } from './types';
import type { WeaponFactoryDeps } from './PlayerFactory';
import { buildPlayerTank, createWeapon } from './PlayerFactory';
import { TURRETS } from '../core/catalog';

export interface GameModeControllerDeps {
  sim: GameSimulation;
  scene: THREE.Scene;
  cameraRig: CameraRig;
  renderWorld: RenderWorld;
  previewController: PreviewController;
  canvas: HTMLCanvasElement;
  weaponDeps: WeaponFactoryDeps;
  emit: (e: GameEvent) => void;
}

/**
 * Инкапсулирует переходы между режимами, старт раунда и паузу.
 * Ранее жило в Game (setMode/startRound/togglePause).
 */
export class GameModeController {
  constructor(private d: GameModeControllerDeps) {}

  setMode(mode: GameMode) {
    const { sim, cameraRig, previewController, canvas, emit } = this.d;
    const wasPlaying = sim.run.mode === 'playing' || sim.run.mode === 'over';
    if (wasPlaying && (mode === 'menu' || mode === 'garage')) {
      sim.clearTanks(this.d.scene);
      sim.projectiles.clear();
      sim.deathT = -1;
      sim.run.paused = false;
      sim.input.releaseLock();
      sim.input.enabled = false;
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

  startRound() {
    const { sim, scene, previewController, cameraRig, weaponDeps, emit } = this.d;
    sim.audio.ensure();
    sim.audio.stopEngine();
    sim.clearTanks(scene);
    sim.projectiles.clear();
    previewController.setVisible(false);

    sim.run.resetRun();
    sim.deathT = -1;
    sim.prevReloading = false;

    const player = buildPlayerTank(sim.run.currentHull, sim.run.currentTurret);
    player.weapon = createWeapon(player, TURRETS[sim.run.currentTurret].weaponType, weaponDeps);

    sim.player = player;
    sim.tanks.push(player);
    scene.add(player.visual.group);

    sim.run.mode = 'playing';
    sim.run.paused = false;
    sim.input.enabled = true;
    sim.input.look.reset(player.yaw);
    cameraRig.snap(player, sim.input.look.yaw, sim.input.look.pitch);
    sim.waves.begin(sim.tanks, sim.nameplates);
    sim.audio.startEngine();
    sim.input.requestLock();
    emit({ type: 'modeChanged', mode: 'playing' });
  }

  togglePause() {
    const { sim, emit } = this.d;
    if (sim.run.mode !== 'playing' || sim.deathT >= 0) return;
    sim.run.paused = !sim.run.paused;
    if (!sim.run.paused) sim.input.requestLock();
    emit({ type: 'pauseChanged', value: sim.run.paused });
  }
}
