// ===== Ядро игры: координатор подсистем, рендер-цикл, гараж, камера =====
import type { HullId, TurretId } from '../core/catalog';
import type { TankVisual } from './Tank';
import { bootstrapGame, type GameContext } from './GameBootstrap';
import { QualityController } from './QualityController';
import { GameModeController } from './GameModeController';
import { GarageBinding } from './GarageBinding';
import type {
  CaptureHudPoint,
  GameEvent,
  GameMode,
  HudSnapshot,
  MatchModeId,
  MinimapDynamic,
  MinimapStatic,
} from './types';
import type { QualityLevel } from './graphicsQuality';
import type { GameSimulation } from './engine/GameSimulation';
import type { GameApi } from './GameApi';
import type { MapId } from './maps/mapCatalog';
import { DEFAULT_MAP_ID } from './maps/mapCatalog';

export class Game implements GameApi {
  /** Внутренний доступ к симуляции — не часть GameApi (UI не видит). */
  private readonly sim: GameSimulation;

  private ctx: GameContext;
  private quality: QualityController;
  private modes: GameModeController;
  private garage: GarageBinding;

  private hudCallback: ((hud: HudSnapshot) => void) | null = null;
  private hud: HudSnapshot;

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = bootstrapGame(canvas);
    this.sim = this.ctx.sim;

    this.quality = new QualityController(this.ctx.renderWorld, this.ctx.audio);
    this.modes = new GameModeController({
      sim: this.ctx.sim,
      scene: this.ctx.scene,
      cameraRig: this.ctx.cameraRig,
      renderWorld: this.ctx.renderWorld,
      previewController: this.ctx.previewController,
      canvas: this.canvas,
      weaponDeps: this.ctx.weaponDeps,
      emit: this.ctx.emitEvent,
      onArenaRebuilt: () => this.ctx.sim.hudModel.rebuildMinimap(this.ctx.sim.arena),
    });
    this.garage = new GarageBinding({
      sim: this.ctx.sim,
      previewController: this.ctx.previewController,
      emit: this.ctx.emitEvent,
    });

    this.hud = this.ctx.sim.hudModel.getHud(null, []);
    this.ctx.hudSink.current = (hud) => this.hudCallback?.(hud);
    this.ctx.gameLoop.start();
  }

  addListener(fn: (e: GameEvent) => void) { this.ctx.addListener(fn); }
  removeListener(fn: (e: GameEvent) => void) { this.ctx.removeListener(fn); }

  /** Единый источник обновлений HUD: вызывается из игрового цикла (GameLoop). */
  setHudCallback(fn: ((hud: HudSnapshot) => void) | null) { this.hudCallback = fn; }

  get currentHull() { return this.sim.run.currentHull; }
  get currentTurret() { return this.sim.run.currentTurret; }
  get currentMapId(): MapId { return this.sim.arena.mapId; }
  get currentMatchMode(): MatchModeId { return this.modes.matchMode; }
  get previewVisual(): TankVisual | null { return this.ctx.previewController.previewVisual; }

  setGarageSelection(hullId: HullId, turretId: TurretId) {
    this.garage.setSelection(hullId, turretId);
  }

  setMode(mode: GameMode) { this.modes.setMode(mode); }
  setMatchMode(mode: MatchModeId) { this.modes.setMatchMode(mode); }
  startRound(mapId: MapId = DEFAULT_MAP_ID, matchMode?: MatchModeId) {
    this.modes.startRound(mapId, matchMode);
  }
  togglePause() { this.modes.togglePause(); }

  toggleMute(): boolean {
    this.sim.audio.setMuted(!this.sim.audio.muted);
    return this.sim.audio.muted;
  }

  getQuality(): QualityLevel { return this.quality.getQuality(); }
  cycleQuality(): QualityLevel { return this.quality.cycleQuality(); }
  setQuality(level: QualityLevel): QualityLevel { return this.quality.setQuality(level); }

  getHud(): HudSnapshot { return this.hud; }
  getMinimapStatic(): MinimapStatic[] { return this.sim.hudModel.getStatic(); }

  fillMinimapDynamics(out: MinimapDynamic[]): MinimapDynamic[] {
    return this.sim.hudModel.fillDynamics(this.sim.tanks, out);
  }

  getCaptureMinimap(): CaptureHudPoint[] {
    if (this.sim.match.mode !== 'capture_point') return [];
    return this.sim.match.getCaptureZones().map((z) => ({
      id: z.id,
      x: z.x,
      z: z.z,
      owner: z.owner,
      progress: z.progress,
      contested: z.contested,
    }));
  }

  dispose() {
    this.ctx.gameLoop.stop();
    window.removeEventListener('resize', this.ctx.onResize);
    document.removeEventListener('visibilitychange', this.ctx.onVisibility);
    this.ctx.garageInput.detach();
    this.sim.input.detach();
    this.sim.audio.stopEngine();
    this.sim.clearTanks(this.ctx.scene);
    this.ctx.previewController.dispose();
    this.ctx.renderWorld.dispose();
  }
}
