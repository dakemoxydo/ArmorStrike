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
  /** Local event bus — safe to use before async bootstrap finishes. */
  private readonly listeners = new Set<(e: GameEvent) => void>();

  private ctx: GameContext | null = null;
  private sim: GameSimulation | null = null;
  private quality: QualityController | null = null;
  private modes: GameModeController | null = null;
  private garage: GarageBinding | null = null;

  private hudCallback: ((hud: HudSnapshot) => void) | null = null;
  private hud: HudSnapshot | null = null;
  private disposed = false;
  private readonly ready: Promise<void>;

  constructor(private canvas: HTMLCanvasElement) {
    this.ready = this.boot();
  }

  /**
   * Prefer this from UI: returns only after bootstrap (meshes, event bus, loop).
   */
  static async create(canvas: HTMLCanvasElement): Promise<Game> {
    const game = new Game(canvas);
    await game.ready;
    if (game.disposed) {
      throw new Error('Game was disposed during bootstrap');
    }
    return game;
  }

  private async boot(): Promise<void> {
    const ctx = await bootstrapGame(this.canvas);
    if (this.disposed) {
      this.teardownContext(ctx);
      return;
    }

    this.ctx = ctx;
    this.sim = ctx.sim;

    this.quality = new QualityController(ctx.renderWorld, ctx.audio);
    this.modes = new GameModeController({
      sim: ctx.sim,
      scene: ctx.scene,
      cameraRig: ctx.cameraRig,
      renderWorld: ctx.renderWorld,
      previewController: ctx.previewController,
      canvas: this.canvas,
      weaponDeps: ctx.weaponDeps,
      timeScale: ctx.gameLoop.timeScale,
      emit: ctx.emitEvent,
      onArenaRebuilt: () => {
        const c = this.ctx;
        if (c) c.sim.hudModel.rebuildMinimap(c.sim.arena);
      },
    });
    this.garage = new GarageBinding({
      sim: ctx.sim,
      previewController: ctx.previewController,
      emit: ctx.emitEvent,
    });

    // Same object GameLoop mutates every frame (pause menu / getHud stay live).
    this.hud = ctx.hud;
    ctx.hudSink.current = (hud) => this.hudCallback?.(hud);

    // Flush listeners registered before ctx was ready
    for (const fn of this.listeners) {
      ctx.addListener(fn);
    }

    ctx.gameLoop.start();
  }

  addListener(fn: (e: GameEvent) => void) {
    this.listeners.add(fn);
    this.ctx?.addListener(fn);
  }

  removeListener(fn: (e: GameEvent) => void) {
    this.listeners.delete(fn);
    this.ctx?.removeListener(fn);
  }

  /** Единый источник обновлений HUD: вызывается из игрового цикла (GameLoop). */
  setHudCallback(fn: ((hud: HudSnapshot) => void) | null) { this.hudCallback = fn; }

  get currentHull() { return this.requireSim().run.currentHull; }
  get currentTurret() { return this.requireSim().run.currentTurret; }
  get currentMapId(): MapId { return this.requireSim().arena.mapId; }
  get currentMatchMode(): MatchModeId { return this.requireModes().matchMode; }
  get previewVisual(): TankVisual | null {
    return this.ctx?.previewController.previewVisual ?? null;
  }

  setGarageSelection(hullId: HullId, turretId: TurretId) {
    this.requireGarage().setSelection(hullId, turretId);
  }

  setMode(mode: GameMode) { this.requireModes().setMode(mode); }
  setMatchMode(mode: MatchModeId) { this.requireModes().setMatchMode(mode); }
  startRound(mapId: MapId = DEFAULT_MAP_ID, matchMode?: MatchModeId): Promise<void> {
    return this.requireModes().startRound(mapId, matchMode);
  }
  togglePause() { this.requireModes().togglePause(); }

  toggleMute(): boolean {
    const sim = this.requireSim();
    sim.audio.setMuted(!sim.audio.muted);
    return sim.audio.muted;
  }

  getQuality(): QualityLevel { return this.requireQuality().getQuality(); }
  cycleQuality(): QualityLevel { return this.requireQuality().cycleQuality(); }
  setQuality(level: QualityLevel): QualityLevel { return this.requireQuality().setQuality(level); }

  getHud(): HudSnapshot {
    if (!this.hud) throw new Error('Game not ready yet — use Game.create()');
    return this.hud;
  }
  getMinimapStatic(): MinimapStatic[] { return this.requireSim().hudModel.getStatic(); }

  fillMinimapDynamics(out: MinimapDynamic[]): MinimapDynamic[] {
    const sim = this.requireSim();
    return sim.hudModel.fillDynamics(sim.tanks, out);
  }

  /** Reusable CP minimap snapshot buffer (no per-frame object churn). */
  private _cpMinimapBuf: CaptureHudPoint[] = [];

  getCaptureMinimap(): CaptureHudPoint[] {
    const sim = this.requireSim();
    if (sim.match.mode !== 'capture_point') return [];
    const out = this._cpMinimapBuf;
    out.length = 0;
    for (const z of sim.match.getCaptureZones()) {
      out.push({
        id: z.id,
        x: z.x,
        z: z.z,
        owner: z.owner,
        progress: z.progress,
        contested: z.contested,
      });
    }
    return out;
  }

  dispose() {
    this.disposed = true;
    this.listeners.clear();
    if (!this.ctx) return;
    this.teardownContext(this.ctx);
    this.ctx = null;
    this.sim = null;
    this.quality = null;
    this.modes = null;
    this.garage = null;
  }

  private teardownContext(ctx: GameContext) {
    ctx.gameLoop.stop();
    window.removeEventListener('resize', ctx.onResize);
    document.removeEventListener('visibilitychange', ctx.onVisibility);
    ctx.garageInput.detach();
    ctx.sim.input.detach();
    ctx.sim.audio.dispose();
    ctx.sim.clearTanks(ctx.scene);
    ctx.sim.projectiles.dispose();
    ctx.sim.effects.dispose();
    ctx.sim.arena.dispose(ctx.scene);
    void ctx.previewController.dispose();
    ctx.renderWorld.dispose();
    // assetManager НЕ чистим: это process-level кэш ассетов. Под StrictMode
    // teardown первого экземпляра выполняется уже после старта второго и
    // выбил бы у него геометрию/текстуры GLB (а заодно перекачал бы модели).
  }

  private requireSim(): GameSimulation {
    if (!this.sim) throw new Error('Game not ready yet — use Game.create()');
    return this.sim;
  }
  private requireModes(): GameModeController {
    if (!this.modes) throw new Error('Game not ready yet — use Game.create()');
    return this.modes;
  }
  private requireGarage(): GarageBinding {
    if (!this.garage) throw new Error('Game not ready yet — use Game.create()');
    return this.garage;
  }
  private requireQuality(): QualityController {
    if (!this.quality) throw new Error('Game not ready yet — use Game.create()');
    return this.quality;
  }
}
