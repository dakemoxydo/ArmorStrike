// ===== Ядро игры: координатор подсистем, рендер-цикл, гараж, камера =====
import * as THREE from 'three';
import { TURRETS } from '../core/catalog';
import type { HullId, TurretId } from '../core/catalog';
import { Arena } from './Arena';
import type { TankVisual } from './Tank';
import { GarageInput } from '../ui/GarageInput';
import { ProjectileManager } from './engine/Projectile';
import { PlayerController } from './PlayerController';
import { Effects } from './effects';
import { AudioFX } from './audio';
import { CameraRig } from './CameraRig';
import { CombatSystem } from './CombatSystem';
import { HudModel } from './HudModel';
import { RenderWorld } from './RenderWorld';
import { RunState } from './RunState';
import { WaveManager } from './WaveManager';
import { GameSimulation } from './engine/GameSimulation';
import { createWeapon, buildPlayerTank } from './PlayerFactory';
import type { WeaponFactoryDeps } from './PlayerFactory';
import type { GameEvent, GameMode, HudSnapshot, MinimapDynamic, MinimapStatic } from './types';
import { GameLoop } from './GameLoop';
import { PreviewController } from './PreviewController';

export class Game {
  readonly sim: GameSimulation;

  private renderWorld: RenderWorld;
  private scene: THREE.Scene;
  private cameraRig: CameraRig;
  private previewController: PreviewController;
  private gameLoop: GameLoop;

  private listeners = new Set<(e: GameEvent) => void>();
  private emitEvent: (e: GameEvent) => void;
  private hudCallback: ((hud: HudSnapshot) => void) | null = null;

  private hud: HudSnapshot;

  private weaponDeps: WeaponFactoryDeps;
  private garageInput!: GarageInput;

  constructor(private canvas: HTMLCanvasElement) {
    this.renderWorld = new RenderWorld(canvas);
    this.scene = this.renderWorld.scene;
    this.cameraRig = this.renderWorld.cameraRig;

    const arena = new Arena(this.scene);
    const effects = new Effects(this.scene);
    const projectiles = new ProjectileManager(this.scene);
    const input = new PlayerController();
    const audio = new AudioFX();
    const run = new RunState();

    input.attach(canvas);
    input.onLockLost = () => {
      if (run.mode === 'playing' && !run.paused) this.togglePause();
    };
    run.load();

    this.emitEvent = (e: GameEvent) => {
      for (const fn of this.listeners) fn(e);
    };

    let sim: GameSimulation;

    const combat = new CombatSystem({
      arena, effects, audio, run,
      emit: (e) => this.emitEvent(e),
      onPlayerDeath: () => { input.releaseLock(); sim.deathT = 0; },
    });

    this.weaponDeps = {
      scene: this.scene,
      effects,
      audio,
      damageSystem: combat.damageSystem,
      projectiles,
      onShotFired: () => this.emitEvent({ type: 'shotFired' }),
    };

    sim = new GameSimulation(arena, effects, projectiles, input, audio, run);
    this.sim = sim;

    sim.combat = combat;

    const waves = new WaveManager({
      scene: this.scene, arena, effects, audio, run,
      createWeapon: (tank, type) => createWeapon(tank, type, this.weaponDeps),
      emit: (e) => this.emitEvent(e),
    });
    sim.waves = waves;

    const hudModel = new HudModel({ run, audio, waves, input });
    hudModel.buildMinimap(arena);
    sim.init({ combat, waves, hudModel });

    this.previewController = new PreviewController(this.scene, () => this.sim.run.mode);
    this.hud = hudModel.getHud(null, []);
    this.previewController.rebuild(this.sim.run.currentHull, this.sim.run.currentTurret);

    this.onResize();
    window.addEventListener('resize', this.onResize);
    document.addEventListener('visibilitychange', this.onVisibility);

    this.garageInput = new GarageInput({
      canvas: this.canvas,
      isInteractive: () => this.sim.run.mode === 'garage',
      cameraRig: this.cameraRig,
    });
    this.garageInput.attach();

    this.gameLoop = new GameLoop({
      sim: this.sim,
      cameraRig: this.cameraRig,
      renderWorld: this.renderWorld,
      hudModel,
      hud: this.hud,
      emit: this.emitEvent,
      getPreviewVisual: () => this.previewController.previewVisual,
      onHud: (hud) => this.hudCallback?.(hud),
    });
    this.gameLoop.start();
  }

  addListener(fn: (e: GameEvent) => void) { this.listeners.add(fn); }
  removeListener(fn: (e: GameEvent) => void) { this.listeners.delete(fn); }

  /** Единый источник обновлений HUD: вызывается из игрового цикла (GameLoop). */
  setHudCallback(fn: ((hud: HudSnapshot) => void) | null) { this.hudCallback = fn; }

  get currentHull() { return this.sim.run.currentHull; }
  get currentTurret() { return this.sim.run.currentTurret; }
  get previewVisual(): TankVisual | null { return this.previewController.previewVisual; }

  setGarageSelection(hullId: HullId, turretId: TurretId) {
    this.sim.run.currentHull = hullId;
    this.sim.run.currentTurret = turretId;
    this.previewController.rebuild(hullId, turretId);
    this.sim.audio.click();
    this.sim.run.save();
    this.emitEvent({ type: 'garageChanged' });
  }

  setMode(mode: GameMode) {
    const wasPlaying = this.sim.run.mode === 'playing' || this.sim.run.mode === 'over';
    if (wasPlaying && (mode === 'menu' || mode === 'garage')) {
      this.sim.clearTanks(this.scene);
      this.sim.projectiles.clear();
      this.sim.deathT = -1;
      this.sim.run.paused = false;
      this.sim.input.releaseLock();
      this.sim.input.enabled = false;
      this.cameraRig.resetFov();
    }
    this.sim.run.mode = mode;
    this.sim.audio.click();
    if (mode === 'garage') {
      this.cameraRig.resetGarage();
      this.canvas.style.cursor = 'grab';
    } else {
      this.canvas.style.cursor = '';
    }
    if (mode === 'menu' || mode === 'garage') {
      this.previewController.setVisible(true);
    } else {
      this.previewController.setVisible(false);
    }
  }

  startRound() {
    this.sim.audio.ensure();
    this.sim.audio.stopEngine();
    this.sim.clearTanks(this.scene);
    this.sim.projectiles.clear();
    this.previewController.setVisible(false);

    this.sim.run.resetRun();
    this.sim.deathT = -1;
    this.sim.prevReloading = false;

    const player = buildPlayerTank(this.sim.run.currentHull, this.sim.run.currentTurret);
    player.weapon = createWeapon(player, TURRETS[this.sim.run.currentTurret].weaponType, this.weaponDeps);

    this.sim.player = player;
    this.sim.tanks.push(player);
    this.scene.add(player.visual.group);

    this.sim.run.mode = 'playing';
    this.sim.run.paused = false;
    this.sim.input.enabled = true;
    this.sim.input.camYaw = player.yaw;
    this.sim.input.camPitch = 0.34;
    this.cameraRig.snap(player, this.sim.input.camYaw, this.sim.input.camPitch);
    this.sim.waves.begin(this.sim.tanks, this.sim.nameplates);
    this.sim.audio.startEngine();
    this.sim.input.requestLock();
  }

  togglePause() {
    if (this.sim.run.mode !== 'playing' || this.sim.deathT >= 0) return;
    this.sim.run.paused = !this.sim.run.paused;
    if (!this.sim.run.paused) this.sim.input.requestLock();
    this.emitEvent({ type: 'pauseChanged', value: this.sim.run.paused });
  }

  toggleMute(): boolean {
    this.sim.audio.setMuted(!this.sim.audio.muted);
    return this.sim.audio.muted;
  }

  getHud(): HudSnapshot { return this.hud; }
  getMinimapStatic(): MinimapStatic[] { return this.sim.hudModel.getStatic(); }

  fillMinimapDynamics(out: MinimapDynamic[]): MinimapDynamic[] {
    return this.sim.hudModel.fillDynamics(this.sim.tanks, out);
  }

  private onResize = () => {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.renderWorld.resize(w, h);
  };

  private onVisibility = () => {
    if (document.hidden && this.sim.run.mode === 'playing' && !this.sim.run.paused) {
      this.sim.run.paused = true;
      this.emitEvent({ type: 'pauseChanged', value: true });
    }
  };

  dispose() {
    this.gameLoop.stop();
    window.removeEventListener('resize', this.onResize);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.garageInput.detach();
    this.sim.input.detach();
    this.sim.audio.stopEngine();
    this.sim.clearTanks(this.scene);
    this.previewController.dispose();
    this.renderWorld.dispose();
  }
}
