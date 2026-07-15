// ===== Ядро игры: рендер, гараж, предпросмотр, камера, интеграция всех оружий =====
import * as THREE from 'three';
import { COLORS, HULLS, TURRETS } from './constants';
import type { HullId, TurretId } from './constants';
import { Arena } from './Arena';
import { TankSystem } from './systems/TankSystem';
import { WeaponSystem } from './systems/WeaponSystem';
import { TankFxSystem } from './systems/TankFxSystem';
import { NameplateSystem } from './systems/NameplateSystem';
import { PhysicsSystem } from './systems/PhysicsSystem';
import { MinimapSystem } from './systems/MinimapSystem';
import { TankEntity, buildTankMesh } from './Tank';
import type { TankParams, TankStyle, TankVisual } from './Tank';
import { ProjectileManager, type WeaponType } from './Projectile';
import { PlayerController } from './PlayerController';
import { Effects } from './effects';
import { Nameplate } from './nameplate';
import { AudioFX } from './audio';
import { RailgunWeapon } from './weapons/RailgunWeapon';
import { FlamethrowerWeapon } from './weapons/FlamethrowerWeapon';
import { CannonWeapon } from './weapons/CannonWeapon';
import type { Weapon, WeaponDeps } from './weapons/types';
import { CameraRig, PREVIEW_POS } from './CameraRig';
import { CombatSystem } from './CombatSystem';
import { HudModel } from './HudModel';
import { RenderWorld } from './RenderWorld';
import { RunState } from './RunState';
import { WaveManager } from './WaveManager';

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
export interface ScoreRow { name: string; hull: string; turret: string; weapon: string; hpFrac: number; isPlayer: boolean; alive: boolean }

const tmpV = new THREE.Vector3();
const tmpV2 = new THREE.Vector3();

export class Game {
  private renderWorld: RenderWorld;
  private scene: THREE.Scene;
  private cameraRig: CameraRig;
  private arena: Arena;
  private effects: Effects;
  private projectiles: ProjectileManager;
  private input = new PlayerController();
  private audio = new AudioFX();
  private run = new RunState();
  private waves: WaveManager;
  private combat: CombatSystem;
  private hudModel: HudModel;

  private player: TankEntity | null = null;
  private tanks: TankEntity[] = [];

  private previewGroup: THREE.Group | null = null;
  private previewVisual: TankVisual | null = null;

  private nameplates = new Map<number, { plate: Nameplate; color: number }>();
  private deathT = -1;
  private prevReloading = false;

  private listeners = new Set<(e: GameEvent) => void>();
  private hud: HudSnapshot;
  private elapsed = 0;
  private raf = 0;
  private lastTs = 0;
  private disposed = false;

  constructor(private canvas: HTMLCanvasElement) {
    this.renderWorld = new RenderWorld(canvas);
    this.scene = this.renderWorld.scene;
    this.cameraRig = this.renderWorld.cameraRig;

    this.arena = new Arena(this.scene);
    this.effects = new Effects(this.scene);
    this.projectiles = new ProjectileManager(this.scene);
    this.input.attach(canvas);
    this.input.onLockLost = () => {
      if (this.run.mode === 'playing' && !this.run.paused) this.togglePause();
    };
    this.run.load();

    this.combat = new CombatSystem({
      arena: this.arena,
      effects: this.effects,
      audio: this.audio,
      run: this.run,
      emit: (e) => this.emit(e),
      onPlayerDeath: () => { this.input.releaseLock(); this.deathT = 0; },
    });

    this.waves = new WaveManager({
      scene: this.scene,
      arena: this.arena,
      effects: this.effects,
      audio: this.audio,
      run: this.run,
      createWeapon: this.createWeapon,
      emit: (e) => this.emit(e),
    });

    this.hudModel = new HudModel({ run: this.run, audio: this.audio, waves: this.waves, input: this.input });
    this.hudModel.buildMinimap(this.arena);

    this.hud = this.hudModel.getHud(this.player, this.tanks);
    this.update3DPreview();

    this.onResize();
    window.addEventListener('resize', this.onResize);
    document.addEventListener('visibilitychange', this.onVisibility);
    this.raf = requestAnimationFrame(this.tick);
  }

  addListener(fn: (e: GameEvent) => void) { this.listeners.add(fn); }
  removeListener(fn: (e: GameEvent) => void) { this.listeners.delete(fn); }
  private emit(e: GameEvent) { for (const fn of this.listeners) fn(e); }

  /** Фабрика оружия по типу — единая точка создания для игрока и ботов. */
  private createWeapon = (tank: TankEntity, type: WeaponType): Weapon => {
    const deps: WeaponDeps = {
      scene: this.scene,
      effects: this.effects,
      audio: this.audio,
      damageSystem: this.combat.damageSystem,
      projectiles: this.projectiles,
      onShotFired: () => this.emit({ type: 'shotFired' }),
    };
    if (type === 'railgun') return new RailgunWeapon(tank, deps);
    if (type === 'flamethrower') return new FlamethrowerWeapon(tank, deps);
    return new CannonWeapon(tank, deps);
  };

  get currentHull() { return this.run.currentHull; }
  get currentTurret() { return this.run.currentTurret; }

  setGarageSelection(hullId: HullId, turretId: TurretId) {
    this.run.currentHull = hullId;
    this.run.currentTurret = turretId;
    this.update3DPreview();
    this.audio.click();
    this.run.save();
    this.emit({ type: 'garageChanged' });
  }

  setMode(mode: GameMode) {
    const wasPlaying = this.run.mode === 'playing' || this.run.mode === 'over';
    if (wasPlaying && (mode === 'menu' || mode === 'garage')) {
      this.clearTanks();
      this.projectiles.clear();
      this.deathT = -1;
      this.run.paused = false;
      this.input.releaseLock();
      this.input.enabled = false;
      this.cameraRig.resetFov();
    }
    this.run.mode = mode;
    this.audio.click();
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
      this.previewGroup.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          for (const m of mats) m.dispose();
        }
      });
      this.previewGroup = null;
      this.previewVisual = null;
    }

    const style: TankStyle = {
      body: '#2fae8f', dark: '#1a6e5b', light: '#5fd8b8',
      glow: COLORS.player, accent: 0x274a58, antenna: true,
    };
    const visual = buildTankMesh(style, this.run.currentHull, this.run.currentTurret);
    visual.group.position.copy(PREVIEW_POS);
    this.scene.add(visual.group);
    this.previewGroup = visual.group;
    this.previewVisual = visual;
    this.previewGroup.visible = (this.run.mode === 'menu' || this.run.mode === 'garage');
  }

  startRound() {
    this.audio.ensure();
    this.audio.stopEngine();
    this.clearTanks();
    this.projectiles.clear();
    if (this.previewGroup) this.previewGroup.visible = false;

    this.run.resetRun();
    this.deathT = -1;
    this.prevReloading = false;

    const hull = HULLS[this.run.currentHull];
    const turret = TURRETS[this.run.currentTurret];
    const style: TankStyle = {
      body: '#2fae8f', dark: '#1a6e5b', light: '#5fd8b8',
      glow: COLORS.player, accent: 0x274a58, antenna: true,
    };

    const params: TankParams = {
      maxHealth: hull.maxHealth, speed: hull.speed, reverseSpeed: hull.reverseSpeed,
      turnSpeed: hull.turnSpeed, turretSpeed: turret.turretSpeed,
      damage: turret.damage, shotCooldown: turret.shotCooldown,
      weaponType: turret.weaponType, range: turret.range,
    };

    const visual = buildTankMesh(style, this.run.currentHull, this.run.currentTurret);
    this.player = new TankEntity('ВЫ', true, params, visual);
    this.player.hullId = this.run.currentHull;
    this.player.turretId = this.run.currentTurret;
    this.player.ammo = turret.magazine;
    this.player.magazine = turret.magazine;
    this.player.fullReloadTime = turret.fullReload;
    this.player.visual.group.position.set(0, 0, -58);
    this.player.yaw = 0;
    this.player.aimYaw = 0;
    this.scene.add(this.player.visual.group);
    this.tanks.push(this.player);

    // Привязываем нужное оружие игроку (единый контракт)
    this.player.weapon = this.createWeapon(this.player, turret.weaponType);

    this.run.mode = 'playing';
    this.run.paused = false;
    this.input.enabled = true;
    this.input.camYaw = this.player.yaw;
    this.input.camPitch = 0.34;
    this.cameraRig.snap(this.player, this.input.camYaw, this.input.camPitch);
    this.waves.begin(this.tanks, this.nameplates);
    this.audio.startEngine();
    this.input.requestLock();
  }

  togglePause() {
    if (this.run.mode !== 'playing' || this.deathT >= 0) return;
    this.run.paused = !this.run.paused;
    if (!this.run.paused) this.input.requestLock();
    this.emit({ type: 'pauseChanged', value: this.run.paused });
  }

  toggleMute(): boolean {
    this.audio.setMuted(!this.audio.muted);
    return this.audio.muted;
  }

  getHud(): HudSnapshot { return this.hud; }
  getMinimapStatic(): MinimapStatic[] { return this.hudModel.getStatic(); }

  fillMinimapDynamics(out: MinimapDynamic[]): MinimapDynamic[] {
    return this.hudModel.fillDynamics(this.tanks, out);
  }

  private clearTanks() {
    for (const t of this.tanks) t.weapon?.dispose();
    for (const np of this.nameplates.values()) np.plate.dispose(this.scene);
    this.nameplates.clear();
    for (const t of this.tanks) t.dispose(this.scene);
    this.tanks = [];
    this.waves.reset();
    this.player = null;
  }

  private step(dt: number) {
    const p = this.player;
    if (!p) return;
    this.run.matchTime += dt;

    // --- Управление игроком ---
    if (p.alive) {
      const wantsFire = this.input.update(p);
      p.weapon?.setFire(wantsFire);

      // Звук ручной/авто перезарядки (по фронту fullReloading)
      if (p.fullReloading && !this.prevReloading) this.audio.reload();
      this.prevReloading = p.fullReloading;
    } else {
      this.prevReloading = false;
    }

    // --- Управление ИИ ботами ---
    const bounds = this.arena.half - 6;
    const others = this.tanks.filter((t) => !t.isPlayer);
    for (const b of this.waves.bots) {
      b.ai.update(dt, {
        player: p, bots: others,
        colliders: this.arena.colliders, bounds,
      });
      b.tank.weapon?.setFire(b.ai.wantsFire);
    }

    // --- Специальные системы оружия (рельсотрон заряд/луч, огнемёт частицы) ---
    WeaponSystem.update(this.tanks, this.arena, dt);

    // --- Обновление самих танков (движение, физика корпуса) ---
    TankSystem.update(this.tanks, dt);

    // --- Дым повреждений и пыль из-под гусениц ---
    TankFxSystem.update(this.tanks, this.effects, dt);

    if (p) this.effects.setAmbientCenter(p.position.x, p.position.z);

    // --- Именные таблички ботов ---
    NameplateSystem.update(this.waves.bots, this.nameplates);

    // --- Коллизии: стены и другие танки ---
    PhysicsSystem.resolveCollisions(this.tanks, this.arena.colliders);

    // --- Снаряды ---
    this.projectiles.update(dt, {
      colliders: this.arena.colliders,
      tanks: this.tanks,
      arena: this.arena,
      effects: this.effects,
      onTankHit: (target, dmg, owner) => this.combat.onTankHit(target, dmg, owner),
      onBlockDestroyed: this.combat.onBlockDestroyed,
    });

    // --- Переход к следующей волне ---
    this.waves.update(dt, this.tanks, this.nameplates);

    if (this.deathT >= 0) {
      this.deathT += dt;
      if (this.deathT > 2.0) {
        this.deathT = -1;
        this.run.mode = 'over';
        this.emit({ type: 'gameOver', score: this.run.score, kills: this.run.kills, wave: this.waves.wave });
      }
    }

    // Реактивная струя нитро из кормы
    if (p.alive && p.boostActive) {
      const back = p.yaw + Math.PI;
      tmpV.set(
        p.position.x + Math.sin(back) * 2.4,
        0.75,
        p.position.z + Math.cos(back) * 2.4,
      );
      tmpV2.set(Math.sin(back), 0.05, Math.cos(back)).normalize();
      this.effects.boostJet(tmpV, tmpV2, COLORS.player);
    }

    this.audio.setEngine(
      p.alive ? Math.min(1, Math.abs(p.speed) / p.params.speed) : 0,
      p.alive && p.boostActive,
    );

    // Синхронизация состояния блоков на миникарте
    MinimapSystem.sync(this.arena, this.hudModel.getByIdMap());
  }

  private tick = (ts: number) => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.tick);
    const dt = Math.min(0.05, this.lastTs ? (ts - this.lastTs) / 1000 : 0.016);
    this.lastTs = ts;
    this.elapsed += dt;

    if (this.run.mode === 'playing' && !this.run.paused) this.step(dt);
    if (this.run.mode !== 'playing' || this.run.paused) {
      for (const t of this.tanks) if (!t.alive) t.update(dt);
    }
    this.arena.update(dt, this.elapsed);
    this.effects.update(dt);
    this.cameraRig.update(dt, {
      mode: this.run.mode, elapsed: this.elapsed, input: this.input,
      player: this.player, previewVisual: this.previewVisual,
      colliders: this.arena.colliders, effects: this.effects,
    });
    if (this.run.paused) this.audio.setEngine(0);
    Object.assign(this.hud, this.hudModel.getHud(this.player, this.tanks));
    this.renderWorld.render();
  };

  private onResize = () => {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.renderWorld.resize(w, h);
  };

  private onVisibility = () => {
    if (document.hidden && this.run.mode === 'playing' && !this.run.paused) {
      this.run.paused = true;
      this.emit({ type: 'pauseChanged', value: true });
    }
  };

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.onResize);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.input.detach();
    this.audio.stopEngine();
    this.clearTanks();
    if (this.previewGroup) this.scene.remove(this.previewGroup);
    this.renderWorld.dispose();
  }
}
