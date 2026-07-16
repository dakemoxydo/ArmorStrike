// ===== Ядро игры: рендер, гараж, предпросмотр, камера, интеграция всех оружий =====
import * as THREE from 'three';
import { TURRETS } from './constants';
import type { HullId, TurretId } from './constants';
import { Arena } from './Arena';
import { TankAnimationSystem } from './systems/TankAnimationSystem';
import { buildTankMesh } from './Tank';
import type { TankVisual } from './Tank';
import { buildPlayerStyle } from '../core/TankCatalog';
import { disposeObject3D } from './resources/disposeObject3D';
import { GarageInput } from '../ui/GarageInput';
import { ProjectileManager } from './Projectile';
import { PlayerController } from './PlayerController';
import { Effects } from './effects';
import { AudioFX } from './audio';
import { CameraRig, PREVIEW_POS } from './CameraRig';
import { CombatSystem } from './CombatSystem';
import { HudModel } from './HudModel';
import { RenderWorld } from './RenderWorld';
import { RunState } from './RunState';
import { WaveManager } from './WaveManager';
import { GameSimulation } from './GameSimulation';
import { createWeapon, buildPlayerTank } from './PlayerFactory';
import type { WeaponFactoryDeps } from './PlayerFactory';

export type GameMode = 'menu' | 'garage' | 'playing' | 'over';

export interface HudSnapshot {
  mode: GameMode;
  paused: boolean;
  health: number;
  maxHealth: number;
  ammo: number;
  magazine: number;
  reloading: boolean;
  reloadProgress: number;
  isCharging?: boolean;
  boost: number;
  score: number;
  kills: number;
  wave: number;
  botsAlive: number;
  alive: boolean;
  timeSec: number;
  muted: boolean;
  hullId: HullId;
  turretId: TurretId;
  weaponName: string;
  weaponLabel: string;
  weaponColor: string;
  weaponAccentClass: string;
  showScore: boolean;
  scoreboard: ScoreRow[];
}

export type GameEvent =
  | { type: 'playerHit'; dir: number }
  | { type: 'enemyHit'; killed: boolean }
  | { type: 'kill'; victim: string; byPlayer: boolean }
  | { type: 'wave'; n: number }
  | { type: 'shotFired' }
  | { type: 'gameOver'; score: number; kills: number; wave: number }
  | { type: 'pauseChanged'; value: boolean }
  | { type: 'garageChanged' };

export interface MinimapStatic { id: number; x: number; z: number; w: number; d: number; kind: string; alive: boolean }
export interface MinimapDynamic { x: number; z: number; yaw: number; turret: number; isPlayer: boolean }
export interface ScoreRow { name: string; hull: string; turret: string; weapon: string; weaponName: string; hpFrac: number; isPlayer: boolean; alive: boolean }

export class Game {
  readonly sim: GameSimulation;

  private renderWorld: RenderWorld;
  private scene: THREE.Scene;
  private cameraRig: CameraRig;

  private previewGroup: THREE.Group | null = null;
  private previewVisual: TankVisual | null = null;

  private listeners = new Set<(e: GameEvent) => void>();
  private emitEvent: (e: GameEvent) => void;

  private hud: HudSnapshot;
  private elapsed = 0;
  private raf = 0;
  private lastTs = 0;
  private disposed = false;

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

    this.weaponDeps = {
      scene: this.scene,
      effects,
      audio,
      damageSystem: null as unknown as WeaponFactoryDeps['damageSystem'],
      projectiles,
      onShotFired: () => this.emitEvent({ type: 'shotFired' }),
    };

    const sim = new GameSimulation(arena, effects, projectiles, input, audio, run);
    this.sim = sim;

    const combat = new CombatSystem({
      arena, effects, audio, run,
      emit: (e) => this.emitEvent(e),
      onPlayerDeath: () => { input.releaseLock(); sim.deathT = 0; },
    });
    sim.combat = combat;
    this.weaponDeps.damageSystem = combat.damageSystem;

    const waves = new WaveManager({
      scene: this.scene, arena, effects, audio, run,
      createWeapon: (tank, type) => createWeapon(tank, type, this.weaponDeps),
      emit: (e) => this.emitEvent(e),
    });
    sim.waves = waves;

    const hudModel = new HudModel({ run, audio, waves, input });
    hudModel.buildMinimap(arena);
    sim.hudModel = hudModel;

    this.hud = hudModel.getHud(null, []);
    this.update3DPreview();

    this.onResize();
    window.addEventListener('resize', this.onResize);
    document.addEventListener('visibilitychange', this.onVisibility);

    this.garageInput = new GarageInput({
      canvas: this.canvas,
      isInteractive: () => this.sim.run.mode === 'garage',
      cameraRig: this.cameraRig,
    });
    this.garageInput.attach();

    this.raf = requestAnimationFrame(this.tick);
  }

  addListener(fn: (e: GameEvent) => void) { this.listeners.add(fn); }
  removeListener(fn: (e: GameEvent) => void) { this.listeners.delete(fn); }

  get currentHull() { return this.sim.run.currentHull; }
  get currentTurret() { return this.sim.run.currentTurret; }

  setGarageSelection(hullId: HullId, turretId: TurretId) {
    this.sim.run.currentHull = hullId;
    this.sim.run.currentTurret = turretId;
    this.update3DPreview();
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
      if (!this.previewGroup) this.update3DPreview();
      if (this.previewGroup) this.previewGroup.visible = true;
    } else {
      if (this.previewGroup) this.previewGroup.visible = false;
    }
  }

  private update3DPreview() {
    if (this.previewGroup) {
      this.scene.remove(this.previewGroup);
      disposeObject3D(this.previewGroup);
      this.previewGroup = null;
      this.previewVisual = null;
    }

    const style = buildPlayerStyle();
    const visual = buildTankMesh(style, this.sim.run.currentHull, this.sim.run.currentTurret);
    visual.group.position.copy(PREVIEW_POS);
    this.scene.add(visual.group);
    this.previewGroup = visual.group;
    this.previewVisual = visual;
    this.previewGroup.visible = (this.sim.run.mode === 'menu' || this.sim.run.mode === 'garage');
  }

  startRound() {
    this.sim.audio.ensure();
    this.sim.audio.stopEngine();
    this.sim.clearTanks(this.scene);
    this.sim.projectiles.clear();
    if (this.previewGroup) this.previewGroup.visible = false;

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

  private tick = (ts: number) => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.tick);
    const dt = Math.min(0.05, this.lastTs ? (ts - this.lastTs) / 1000 : 0.016);
    this.lastTs = ts;
    this.elapsed += dt;

    if (this.sim.run.mode === 'playing' && !this.sim.run.paused) {
      this.sim.step(dt, this.emitEvent);
    } else if (this.sim.tanks.length > 0) {
      TankAnimationSystem.update(this.sim.tanks.filter((t) => !t.alive), dt);
    }

    this.sim.arena.update(dt, this.elapsed);
    this.sim.effects.update(dt);
    this.cameraRig.update(dt, {
      mode: this.sim.run.mode, elapsed: this.elapsed, input: this.sim.input,
      player: this.sim.player, previewVisual: this.previewVisual,
      colliders: this.sim.arena.colliders, effects: this.sim.effects,
    });

    if (this.sim.run.paused) this.sim.audio.setEngine(0);
    const showScoreboard = this.sim.run.mode === 'playing' && this.sim.input.scoreHeld && !this.sim.run.paused;
    Object.assign(this.hud, this.sim.hudModel.getHud(this.sim.player, this.sim.tanks, showScoreboard));
    this.renderWorld.render();
  };

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
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.onResize);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.garageInput.detach();
    this.sim.input.detach();
    this.sim.audio.stopEngine();
    this.sim.clearTanks(this.scene);
    if (this.previewGroup) this.scene.remove(this.previewGroup);
    this.renderWorld.dispose();
  }
}
