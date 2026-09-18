import { HULLS, TURRETS, type HullId, type TurretId } from '../core/catalog';
import type { TankVisual } from './Tank';
import { bootstrapGame, type GameContext } from './GameBootstrap';
import { QualityController } from './QualityController';
import { GameModeController } from './GameModeController';
import { GarageBinding } from './GarageBinding';
import type {
  CaptureHudPoint,
  GameEvent,
  GameMode,
  GarageViewportInset,
  HudSnapshot,
  MatchModeId,
  TeamId,
  MinimapDynamic,
  MinimapStatic,
} from './types';
import type { QualityLevel } from './graphicsQuality';
import type { GameSimulation } from './engine/GameSimulation';
import type { GameApi } from './GameApi';
import type { MapId } from './maps/mapCatalog';
import { DEFAULT_MAP_ID } from './maps/mapCatalog';
import { ECONOMY_PRICES } from './economy/matchRewards';
import type { QuestProgress } from './economy/questCatalog';
import { CloudSaveService } from './auth/cloudSaveService';
import { MultiplayerService } from './network/multiplayerService';
import { RemotePlayerManager } from './network/RemotePlayerManager';
import type {
  RoomData,
  TankDamagePacket,
  TankTransformPacket,
  WeaponFirePacket,
} from './network/types';

export class Game implements GameApi {
  /** Local event bus — safe to use before async bootstrap finishes. */
  private readonly listeners = new Set<(e: GameEvent) => void>();

  private ctx: GameContext | null = null;
  private sim: GameSimulation | null = null;
  private quality: QualityController | null = null;
  private modes: GameModeController | null = null;
  private garage: GarageBinding | null = null;

  private multiplayerService: MultiplayerService | null = null;
  private currentRoom: RoomData | null = null;
  private isHostFlag = false;

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
      floats: ctx.floats,
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
  get unlockedHulls(): readonly HullId[] { return this.requireSim().run.unlockedHulls; }
  get unlockedTurrets(): readonly TurretId[] { return this.requireSim().run.unlockedTurrets; }
  get starterPackClaimed(): boolean { return this.requireSim().run.starterPackClaimed; }
  get credits(): number { return this.requireSim().run.credits; }
  get quests(): readonly QuestProgress[] { return this.requireSim().run.quests; }
  get username(): string { return this.requireSim().run.username; }
  get isGuest(): boolean { return this.requireSim().run.isGuest; }
  get userId(): string | null { return this.requireSim().run.userId; }
  get syncStatus(): 'idle' | 'saving' | 'synced' | 'error' { return this.requireSim().run.syncStatus; }

  setAuthUser(user: { id: string; username: string } | null): void {
    const run = this.requireSim().run;
    if (user) {
      run.userId = user.id;
      run.username = user.username;
      run.isGuest = false;
    } else {
      run.userId = null;
      run.username = 'Гость';
      run.isGuest = true;
    }
    run.save();
    this.ctx?.emitEvent({ type: 'garageChanged' });
  }

  async loadCloudProfile(userId: string): Promise<boolean> {
    const sim = this.requireSim();
    const profile = await CloudSaveService.loadProfile(userId);
    if (!profile) return false;
    CloudSaveService.applyProfileToRunState(profile, sim.run);
    this.ctx?.emitEvent({ type: 'garageChanged' });
    return true;
  }
  get previewVisual(): TankVisual | null {
    return this.ctx?.previewController.previewVisual ?? null;
  }

  claimStarterPack(hullId: HullId, turretId: TurretId): Promise<void> {
    return this.requireGarage().claimStarterPack(hullId, turretId);
  }

  claimQuest(questId: string): number {
    const sim = this.requireSim();
    const reward = sim.run.claimQuest(questId);
    if (reward > 0) {
      sim.audio.click();
      this.ctx?.emitEvent({ type: 'garageChanged' });
    }
    return reward;
  }

  purchaseCrate(type: 'hull' | 'turret', chosenId?: HullId | TurretId): boolean {
    const sim = this.requireSim();
    const cost = ECONOMY_PRICES.crate;
    if (sim.run.credits < cost) return false;

    if (chosenId) {
      let unlocked = false;
      if (type === 'hull' && Object.prototype.hasOwnProperty.call(HULLS, chosenId)) {
        unlocked = sim.run.unlockHull(chosenId as HullId);
      } else if (type === 'turret' && Object.prototype.hasOwnProperty.call(TURRETS, chosenId)) {
        unlocked = sim.run.unlockTurret(chosenId as TurretId);
      }
      if (unlocked) {
        sim.run.spendCredits(cost);
        sim.audio.click();
        this.ctx?.emitEvent({ type: 'garageChanged' });
        return true;
      }
      return false;
    }

    if (sim.run.spendCredits(cost)) {
      sim.audio.click();
      this.ctx?.emitEvent({ type: 'garageChanged' });
      return true;
    }
    return false;
  }

  purchaseDirectUnlock(id: HullId | TurretId): boolean {
    const sim = this.requireSim();
    const cost = ECONOMY_PRICES.directUnlock;
    if (sim.run.credits < cost) return false;

    let unlocked = false;
    if (Object.prototype.hasOwnProperty.call(HULLS, id)) {
      unlocked = sim.run.unlockHull(id as HullId);
    } else if (Object.prototype.hasOwnProperty.call(TURRETS, id)) {
      unlocked = sim.run.unlockTurret(id as TurretId);
    }
    if (unlocked) {
      sim.run.spendCredits(cost);
      sim.audio.click();
      this.ctx?.emitEvent({ type: 'garageChanged' });
      return true;
    }
    return false;
  }

  setGarageSelection(hullId: HullId, turretId: TurretId): Promise<void> {
    // Promise flows through: Garage awaits/reverts on rejection (the old
    // `void` contract hid the async rebuild and swallowed its failures).
    return this.requireGarage().setSelection(hullId, turretId);
  }

  /** UI footprint → camera rig; no-op before bootstrap (garage is not rendered yet). */
  setGarageViewportInset(inset: GarageViewportInset | null) {
    this.ctx?.cameraRig.setGarageInset(inset);
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

  get isMultiplayer(): boolean { return this.currentRoom !== null; }
  get activeRoom(): RoomData | null { return this.currentRoom; }
  get isMultiplayerHost(): boolean { return this.isHostFlag; }

  async startMultiplayerRound(room: RoomData, isHost: boolean, team?: TeamId): Promise<void> {
    const sim = this.requireSim();
    const ctx = this.ctx;
    if (!ctx) throw new Error('Game context not initialized');

    // Очищаем предыдущую сетевую сессию при наличии
    await this.leaveMultiplayer();

    this.currentRoom = room;
    this.isHostFlag = isHost;

    const mp = new MultiplayerService();
    this.multiplayerService = mp;

    const userId = sim.run.userId || ('usr_' + Math.random().toString(36).slice(2, 9));
    const profile = {
      userId,
      username: sim.run.username,
      hullId: sim.run.currentHull,
      turretId: sim.run.currentTurret,
    };

    const remotePlayers = new RemotePlayerManager(ctx.scene, ctx.weaponDeps, sim.tanks, sim.nameplates);
    sim.remotePlayers = remotePlayers;
    sim.networkSync.setServices(mp, remotePlayers, userId);

    mp.connectToRoom(room.id, profile, (event, payload) => {
      if (event === 'tank_transform') {
        remotePlayers.handleTransform(payload as TankTransformPacket);
      } else if (event === 'weapon_fire') {
        remotePlayers.handleFire(payload as WeaponFirePacket);
      } else if (event === 'tank_damage') {
        remotePlayers.handleDamage(payload as TankDamagePacket);
      } else if (event === 'presence_sync') {
        if (payload && typeof payload === 'object') {
          const dict = payload as Record<string, unknown>;
          for (const key of Object.keys(dict)) {
            const presences = dict[key];
            if (Array.isArray(presences)) {
              for (const p of presences as Array<{ userId?: string; username?: string; hullId?: HullId; turretId?: TurretId }>) {
                if (p.userId && p.userId !== userId) {
                  const peerTeam: TeamId = room.mode === 'deathmatch'
                    ? null
                    : (team === 'alpha' ? 'bravo' : 'alpha');
                  void remotePlayers.spawnPeer(
                    p.userId,
                    p.username || 'Боец',
                    p.hullId || 'hunter',
                    p.turretId || 'railgun',
                    peerTeam,
                  );
                }
              }
            }
          }
        }
      } else if (event === 'player_left') {
        if (Array.isArray(payload)) {
          for (const p of payload as Array<{ userId?: string }>) {
            if (p.userId) remotePlayers.removePeer(p.userId);
          }
        }
      }
    });

    // Запуск раунда с сетевыми настройками
    await this.requireModes().startRound(room.map_id, room.mode, {
      botsEnabled: room.bots_enabled,
      playerTeam: team,
    });
  }

  async leaveMultiplayer(): Promise<void> {
    if (this.currentRoom && this.multiplayerService) {
      const sim = this.sim;
      const userId = sim?.run.userId || 'unknown';
      await MultiplayerService.leaveRoom(this.currentRoom.id, userId);
      this.multiplayerService.disconnect();
      this.multiplayerService = null;
      sim?.remotePlayers?.clear();
      if (sim) sim.remotePlayers = null;
      sim?.networkSync.setServices(null, null, userId);
      this.currentRoom = null;
      this.isHostFlag = false;
    }
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
