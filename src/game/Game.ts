// ===== Ядро игры: рендер, гараж, предпросмотр, камера, интеграция всех оружий =====
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { COLORS, HULLS, SCORE, TURRETS } from './constants';
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
import type { DamageSystem, Weapon, WeaponDeps } from './weapons/types';
import { CameraRig, PREVIEW_POS } from './CameraRig';
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
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private cameraRig: CameraRig;
  private arena: Arena;
  private effects: Effects;
  private projectiles: ProjectileManager;
  private input = new PlayerController();
  private audio = new AudioFX();
  private run = new RunState();
  private waves: WaveManager;

  private player: TankEntity | null = null;
  private tanks: TankEntity[] = [];

  // Централизованная система урона
  public damageSystem: DamageSystem = {
    applyDamage: (target: TankEntity, dmg: number, source: TankEntity) => {
      this.onTankHit(target, dmg, source);
    },
    applyKnockback: (target: TankEntity, dir: THREE.Vector3, force: number) => {
      target.knockback.addScaledVector(dir, force);
    },
    damageBlock: (blockId: number, dmg: number, hitPos: THREE.Vector3) => {
      const res = this.arena.damageBlock(blockId, dmg);
      if (res === 'destroyed') {
        this.onBlockDestroyed(hitPos, 1.4);
      }
    },
  };

  private previewGroup: THREE.Group | null = null;
  private previewVisual: TankVisual | null = null;

  private nameplates = new Map<number, { plate: Nameplate; color: number }>();
  private deathT = -1;
  private prevReloading = false;

  private listeners = new Set<(e: GameEvent) => void>();
  private hud: HudSnapshot;
  private mmStatic: MinimapStatic[] = [];
  private mmById = new Map<number, MinimapStatic>();
  private elapsed = 0;
  private raf = 0;
  private lastTs = 0;
  private disposed = false;

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;

    this.camera = new THREE.PerspectiveCamera(58, 1, 0.1, 500);
    this.cameraRig = new CameraRig(this.camera);
    this.scene.background = new THREE.Color(0x060a12);
    this.scene.fog = new THREE.Fog(0x0a0f18, 75, 250);

    // Sky-dome шейдер (градиент неба, солнце, облака) — адаптация из game1
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(480, 32, 20),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        vertexShader: `
          varying vec3 vPos;
          void main() { vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `
          varying vec3 vPos;
          void main() {
            vec3 n = normalize(vPos);
            float h = n.y;
            vec3 zen = vec3(0.03, 0.05, 0.09);
            vec3 hor = vec3(0.10, 0.17, 0.26);
            vec3 col = mix(hor, zen, clamp(h * 1.6, 0.0, 1.0));
            vec3 sunDir = normalize(vec3(0.5, 0.6, 0.4));
            float sunDot = max(0.0, dot(n, sunDir));
            float sunDisc = smoothstep(0.9975, 0.999, sunDot);
            col += vec3(1.0, 0.85, 0.6) * sunDisc * 2.0;
            col += vec3(0.5, 0.6, 0.8) * pow(sunDot, 16.0) * 0.4;
            float cloud = sin(n.x * 10.0 + n.z * 16.0) * cos(n.z * 12.0 - n.x * 7.0);
            float puff = smoothstep(0.25, 0.7, cloud);
            if (h > 0.04) {
              col = mix(col, vec3(0.16, 0.22, 0.30), puff * 0.25 * smoothstep(0.04, 0.2, h));
            }
            gl_FragColor = vec4(col, 1.0);
          }`,
      }),
    );
    this.scene.add(sky);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.06).texture;
    pmrem.dispose();

    const hemi = new THREE.HemisphereLight(0x8fb9d8, 0x0a0e14, 0.5);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffe6c0, 2.4);
    sun.position.set(58, 78, 32);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera;
    sc.left = -88; sc.right = 88; sc.top = 88; sc.bottom = -88;
    sc.near = 10; sc.far = 220;
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.03;
    this.scene.add(sun);
    const rim = new THREE.DirectionalLight(0x2ee6c0, 0.5);
    rim.position.set(-30, 20, -40);
    this.scene.add(rim);

    this.arena = new Arena(this.scene);
    this.effects = new Effects(this.scene);
    this.projectiles = new ProjectileManager(this.scene);
    this.input.attach(canvas);
    this.input.onLockLost = () => {
      if (this.run.mode === 'playing' && !this.run.paused) this.togglePause();
    };
    this.run.load();

    for (const c of this.arena.colliders) {
      const entry: MinimapStatic = {
        id: c.id, x: (c.minX + c.maxX) / 2, z: (c.minZ + c.maxZ) / 2,
        w: c.maxX - c.minX, d: c.maxZ - c.minZ,
        kind: c.kind, alive: c.kind !== 'block',
      };
      this.mmStatic.push(entry);
      this.mmById.set(c.id, entry);
    }

    this.waves = new WaveManager({
      scene: this.scene,
      arena: this.arena,
      effects: this.effects,
      audio: this.audio,
      run: this.run,
      createWeapon: this.createWeapon,
      emit: (e) => this.emit(e),
    });

    this.hud = this.makeHudSnapshot();
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
      damageSystem: this.damageSystem,
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
  getMinimapStatic(): MinimapStatic[] { return this.mmStatic; }

  fillMinimapDynamics(out: MinimapDynamic[]): MinimapDynamic[] {
    out.length = 0;
    for (const t of this.tanks) {
      if (!t.alive) continue;
      out.push({ x: t.position.x, z: t.position.z, yaw: t.yaw, turret: t.yaw + t.turretYaw, isPlayer: t.isPlayer });
    }
    return out;
  }

  private makeHudSnapshot(): HudSnapshot {
    const p = this.player;

    // Состояние боеприпасов делегируется оружию (единый интерфейс)
    const ammoState = p?.weapon?.getAmmoState();
    const ammo = ammoState?.ammo ?? 0;
    const magazine = ammoState?.magazine ?? 0;
    const reloading = ammoState?.reloading ?? false;
    const reloadProgress = ammoState?.reloadProgress ?? 0;
    const isCharging = ammoState?.isCharging ?? false;

    const showScore = this.run.mode === 'playing' && this.input.scoreHeld && !this.run.paused;
    const board: ScoreRow[] = this.tanks
      .map((t) => ({
        name: t.name,
        hull: t.hullId ? HULLS[t.hullId].name : '-',
        turret: t.turretId ? TURRETS[t.turretId].name : '-',
        weapon: t.params.weaponType ?? '-',
        hpFrac: t.maxHealth > 0 ? t.health / t.maxHealth : 0,
        isPlayer: t.isPlayer,
        alive: t.alive,
      }))
      .sort((a, b) => (b.isPlayer ? 1 : 0) - (a.isPlayer ? 1 : 0) || b.hpFrac - a.hpFrac);

    return {
      mode: this.run.mode, paused: this.run.paused,
      health: p?.health ?? HULLS[this.run.currentHull].maxHealth,
      maxHealth: p?.maxHealth ?? HULLS[this.run.currentHull].maxHealth,
      ammo, magazine, reloading, reloadProgress, isCharging,
      boost: p?.boostEnergy ?? 1,
      score: this.run.score, kills: this.run.kills, wave: this.waves.wave,
      botsAlive: this.waves.bots.filter((b) => b.tank.alive).length,
      alive: p?.alive ?? false, timeSec: this.run.matchTime,
      muted: this.audio.muted,
      hullId: this.run.currentHull, turretId: this.run.currentTurret,
      showScore, scoreboard: board,
    };
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

  private onTankHit(target: TankEntity, dmg: number, owner: TankEntity) {
    target.takeDamage(dmg, owner.id);
    if (target.isPlayer) {
      this.audio.hitPlayer();
      this.effects.addShake(0.3);
      // направление на атакующего в системе координат экрана (0 = спереди, по часовой)
      const dx = owner.position.x - target.position.x;
      const dz = owner.position.z - target.position.z;
      const fs = Math.sin(target.yaw);
      const fc = Math.cos(target.yaw);
      const dir = (dx * dx + dz * dz) > 0.01
        ? Math.atan2(dx * fc - dz * fs, dx * fs + dz * fc)
        : 0;
      this.emit({ type: 'playerHit', dir });
    } else {
      this.audio.hitEnemy();
      if (owner.isPlayer) this.emit({ type: 'enemyHit', killed: !target.alive });
    }

    // Сокращенный лог
    if (!target.isPlayer) {

    }

    if (!target.alive) this.onTankDestroyed(target, owner);
  }

  private onTankDestroyed(target: TankEntity, owner: TankEntity | null) {
    const p = target.position.clone().setY(1.4);
    this.effects.explosion(p, target.isPlayer ? 0x2ee6c0 : 0xff7a3d, 1.9);
    this.effects.debris(p, 0xffa050, 26);
    this.audio.explosion();

    if (target.isPlayer) {
      this.audio.death();
      this.audio.stopEngine();
      this.input.releaseLock();
      this.deathT = 0;
    } else {
      const byPlayer = owner?.isPlayer ?? false;
      if (byPlayer) { this.run.score += SCORE.kill; this.run.kills += 1; }
      this.emit({ type: 'kill', victim: target.name, byPlayer });
    }
  }

  private onBlockDestroyed = (pos: THREE.Vector3, size: number) => {
    this.effects.explosion(pos, 0xffb02e, size);
    this.effects.debris(pos, 0x6b7688, 18);
    this.audio.explosion();
  };

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
      onTankHit: (target, dmg, owner) => this.onTankHit(target, dmg, owner),
      onBlockDestroyed: this.onBlockDestroyed,
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
    MinimapSystem.sync(this.arena, this.mmById);
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
    Object.assign(this.hud, this.makeHudSnapshot());
    this.renderer.render(this.scene, this.camera);
  };

  private onResize = () => {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
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
    this.renderer.dispose();
  }
}
