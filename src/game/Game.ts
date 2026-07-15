// ===== Ядро игры: рендер, гараж, предпросмотр, камера, интеграция всех оружий =====
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { COLORS, FLAMETHROWER_CONFIG, HULLS, SCORE, TURRETS, botStatsForWave, botsForWave } from './constants';
import type { HullId, TurretId } from './constants';
import { resolveCircle } from './physics';
import { Arena } from './Arena';
import { TankEntity, buildTankMesh } from './Tank';
import type { TankParams, TankStyle, TankVisual } from './Tank';
import { ProjectileManager } from './Projectile';
import { PlayerController } from './PlayerController';
import { AIController, randomPersona } from './AI';
import { Effects } from './effects';
import { Nameplate } from './nameplate';
import { AudioFX } from './audio';
import { RailgunWeapon } from './weapons/RailgunWeapon';
import type { DamageSystem } from './weapons/RailgunWeapon';
import { FlamethrowerWeapon } from './weapons/FlamethrowerWeapon';

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

export interface MinimapStatic { x: number; z: number; w: number; d: number; kind: string; alive: boolean }
export interface MinimapDynamic { x: number; z: number; yaw: number; turret: number; isPlayer: boolean }
export interface ScoreRow { name: string; hull: string; turret: string; weapon: string; hpFrac: number; isPlayer: boolean; alive: boolean }

const SPAWN_POINTS: [number, number][] = [
  [64, 64], [-64, 64], [64, -64], [-64, -64],
  [0, -66], [67, 0], [-67.5, 18],
];

const PREVIEW_POS = new THREE.Vector3(0, 21, 0);

/** 2D slab raycast сегмента (ox,oz)->(ox+dx,oz+dz) по AABB с отступом. Возвращает t в [0,1] или -1. */
function rayAABB(
  ox: number, oz: number, dx: number, dz: number,
  minX: number, maxX: number, minZ: number, maxZ: number, inflate: number,
): number {
  const bMinX = minX - inflate, bMaxX = maxX + inflate;
  const bMinZ = minZ - inflate, bMaxZ = maxZ + inflate;
  let tmin = 0, tmax = 1;
  if (Math.abs(dx) < 1e-9) {
    if (ox < bMinX || ox > bMaxX) return -1;
  } else {
    let t1 = (bMinX - ox) / dx, t2 = (bMaxX - ox) / dx;
    if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
    tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
    if (tmin > tmax) return -1;
  }
  if (Math.abs(dz) < 1e-9) {
    if (oz < bMinZ || oz > bMaxZ) return -1;
  } else {
    let t1 = (bMinZ - oz) / dz, t2 = (bMaxZ - oz) / dz;
    if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
    tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
    if (tmin > tmax) return -1;
  }
  return tmin;
}

const tmpV = new THREE.Vector3();
const tmpV2 = new THREE.Vector3();

export class Game {
  mode: GameMode = 'menu';
  paused = false;

  currentHull: HullId = 'hunter';
  currentTurret: TurretId = 'railgun';

  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private arena: Arena;
  private effects: Effects;
  private projectiles: ProjectileManager;
  private input = new PlayerController();
  private audio = new AudioFX();

  private player: TankEntity | null = null;
  private bots: { tank: TankEntity; ai: AIController }[] = [];
  private tanks: TankEntity[] = [];

  // Инстансы специального оружия
  private railguns = new Map<number, RailgunWeapon>();
  private flamethrowers = new Map<number, FlamethrowerWeapon>();

  // Централизованная система урона
  public damageSystem: DamageSystem = {
    applyDamage: (target: TankEntity, dmg: number, source: TankEntity, weaponType: string) => {
      this.onTankHit(target, dmg, source, weaponType);
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

  private score = 0;
  private kills = 0;
  private wave = 0;
  private nameplates = new Map<number, { plate: Nameplate; color: number }>();
  private matchTime = 0;
  private nextWaveT = -1;
  private deathT = -1;
  private prevReloading = false;

  private listeners = new Set<(e: GameEvent) => void>();
  private hud: HudSnapshot;
  private mmStatic: MinimapStatic[] = [];
  private elapsed = 0;
  private raf = 0;
  private lastTs = 0;
  private disposed = false;
  private menuAngle = 0.6;
  private camPos = new THREE.Vector3(0, 20, 12);
  private camLook = new THREE.Vector3(0, 16, 0);
  private camFov = 58;
  private shakeV = new THREE.Vector3();

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;

    this.camera = new THREE.PerspectiveCamera(58, 1, 0.1, 500);
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
      if (this.mode === 'playing' && !this.paused) this.togglePause();
    };
    this.loadLoadout();

    for (const c of this.arena.colliders) {
      this.mmStatic.push({
        x: (c.minX + c.maxX) / 2, z: (c.minZ + c.maxZ) / 2,
        w: c.maxX - c.minX, d: c.maxZ - c.minZ,
        kind: c.kind, alive: c.kind !== 'block',
      });
    }

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

  // ===== Сохранение выбора корпуса/башни между сессиями =====
  private static LS_KEY = 'as2_loadout';
  private loadLoadout() {
    try {
      const raw = localStorage.getItem(Game.LS_KEY);
      if (raw) {
        const o = JSON.parse(raw);
        if (o && HULLS[o.hullId as HullId] && TURRETS[o.turretId as TurretId]) {
          this.currentHull = o.hullId;
          this.currentTurret = o.turretId;
        }
      }
    } catch { /* ignore */ }
  }
  private saveLoadout() {
    try {
      localStorage.setItem(Game.LS_KEY, JSON.stringify({ hullId: this.currentHull, turretId: this.currentTurret }));
    } catch { /* ignore */ }
  }

  setGarageSelection(hullId: HullId, turretId: TurretId) {
    this.currentHull = hullId;
    this.currentTurret = turretId;
    this.update3DPreview();
    this.audio.click();
    this.saveLoadout();
    this.emit({ type: 'garageChanged' });
  }

  setMode(mode: GameMode) {
    const wasPlaying = this.mode === 'playing' || this.mode === 'over';
    if (wasPlaying && (mode === 'menu' || mode === 'garage')) {
      this.clearTanks();
      this.projectiles.clear();
      this.deathT = -1;
      this.paused = false;
      this.input.releaseLock();
      this.input.enabled = false;
      this.resetFov();
    }
    this.mode = mode;
    this.audio.click();
    if (mode === 'menu' || mode === 'garage') {
      if (!this.previewGroup) this.update3DPreview();
      if (this.previewGroup) this.previewGroup.visible = true;
    } else {
      if (this.previewGroup) this.previewGroup.visible = false;
    }
  }

  private resetFov() {
    this.camFov = 58;
    if (Math.abs(this.camera.fov - 58) > 0.05) {
      this.camera.fov = 58;
      this.camera.updateProjectionMatrix();
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
    const visual = buildTankMesh(style, this.currentHull, this.currentTurret);
    visual.group.position.copy(PREVIEW_POS);
    this.scene.add(visual.group);
    this.previewGroup = visual.group;
    this.previewVisual = visual;
    this.previewGroup.visible = (this.mode === 'menu' || this.mode === 'garage');
  }

  startRound() {
    this.audio.ensure();
    this.audio.stopEngine();
    this.clearTanks();
    this.projectiles.clear();
    if (this.previewGroup) this.previewGroup.visible = false;

    this.score = 0;
    this.kills = 0;
    this.wave = 0;
    this.matchTime = 0;
    this.nextWaveT = -1;
    this.deathT = -1;
    this.prevReloading = false;

    const hull = HULLS[this.currentHull];
    const turret = TURRETS[this.currentTurret];
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

    const visual = buildTankMesh(style, this.currentHull, this.currentTurret);
    this.player = new TankEntity('ВЫ', true, params, visual);
    this.player.hullId = this.currentHull;
    this.player.turretId = this.currentTurret;
    this.player.ammo = turret.magazine;
    this.player.magazine = turret.magazine;
    this.player.fullReloadTime = turret.fullReload;
    this.player.visual.group.position.set(0, 0, -58);
    this.player.yaw = 0;
    this.player.aimYaw = 0;
    this.scene.add(this.player.visual.group);
    this.tanks.push(this.player);

    // Привязываем нужное оружие игроку
    if (turret.weaponType === 'railgun') {
      this.railguns.set(this.player.id, new RailgunWeapon(this.player, this.scene, this.effects, this.audio, this.damageSystem));
    } else if (turret.weaponType === 'flamethrower') {
      this.flamethrowers.set(this.player.id, new FlamethrowerWeapon(this.player, this.scene, this.effects, this.audio, this.damageSystem));
    }

    this.mode = 'playing';
    this.paused = false;
    this.input.enabled = true;
    this.input.camYaw = this.player.yaw;
    this.input.camPitch = 0.34;
    this.snapCamera();
    this.nextWave();
    this.audio.startEngine();
    this.input.requestLock();
  }

  private nextWave() {
    this.wave += 1;
    if (this.wave > 1) {
      this.score += SCORE.waveBonus(this.wave - 1);
      this.audio.waveHorn();
    }
    this.emit({ type: 'wave', n: this.wave });

    const stats = botStatsForWave(this.wave);
    const count = botsForWave(this.wave);
    const used = new Set<number>();
    const botHulls: HullId[] = ['hunter', 'viking', 'mammoth'];
    const botTurrets: TurretId[] = ['railgun', 'flamethrower', 'cannon'];

    for (let i = 0; i < count; i++) {
      let idx = Math.floor(Math.random() * SPAWN_POINTS.length);
      let guard = 0;
      while (used.has(idx) && guard++ < 20) idx = Math.floor(Math.random() * SPAWN_POINTS.length);
      used.add(idx);
      const [x, z] = SPAWN_POINTS[idx];
      const yaw = Math.atan2(-x, -z);
      const colorHex = COLORS.bots[i % COLORS.bots.length];
      const c = new THREE.Color(colorHex);

      const bHull = botHulls[i % botHulls.length];
      const bTurret = botTurrets[(i + this.wave) % botTurrets.length];
      const hDef = HULLS[bHull];
      const tDef = TURRETS[bTurret];

      const style: TankStyle = {
        body: `#${c.clone().multiplyScalar(0.55).getHexString()}`,
        dark: '#3a1512',
        light: `#${c.clone().multiplyScalar(0.8).getHexString()}`,
        glow: colorHex, accent: 0x2b2f36, antenna: false,
      };

      const params: TankParams = {
        maxHealth: Math.round(hDef.maxHealth * (0.8 + this.wave * 0.1)),
        speed: stats.speed, reverseSpeed: stats.reverseSpeed,
        turnSpeed: stats.turnSpeed, turretSpeed: stats.turretSpeed,
        damage: Math.round(tDef.damage * (0.7 + this.wave * 0.08)),
        shotCooldown: tDef.shotCooldown * 1.3,
        weaponType: tDef.weaponType, range: tDef.range,
      };

      const bot = new TankEntity(`БОТ-${this.wave}${i + 1}`, false, params, buildTankMesh(style, bHull, bTurret));
      bot.hullId = bHull;
      bot.turretId = bTurret;
      bot.visual.group.position.set(x, 0, z);
      const plate = new Nameplate(bot.name, colorHex);
      this.scene.add(plate.sprite);
      this.nameplates.set(bot.id, { plate, color: colorHex });
      bot.yaw = yaw;
      bot.aimYaw = yaw;
      this.scene.add(bot.visual.group);
      this.tanks.push(bot);

      // Оружие бота
      if (tDef.weaponType === 'railgun') {
        this.railguns.set(bot.id, new RailgunWeapon(bot, this.scene, this.effects, this.audio, this.damageSystem));
      } else if (tDef.weaponType === 'flamethrower') {
        this.flamethrowers.set(bot.id, new FlamethrowerWeapon(bot, this.scene, this.effects, this.audio, this.damageSystem));
      }

      this.bots.push({ tank: bot, ai: new AIController(bot, stats.sightRange, tDef.range, stats.aimError, randomPersona(this.wave)) });
    }
  }

  togglePause() {
    if (this.mode !== 'playing' || this.deathT >= 0) return;
    this.paused = !this.paused;
    if (!this.paused) this.input.requestLock();
    this.emit({ type: 'pauseChanged', value: this.paused });
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
    const turretDef = TURRETS[this.currentTurret];

    let ammo = p?.ammo ?? turretDef.magazine;
    let magazine = p?.magazine ?? turretDef.magazine;
    let reloading = p?.fullReloading ?? false;
    let reloadProgress = p?.fullReloading ? 1 - p.reloadTimer / p.fullReloadTime : 0;
    let isCharging = false;

    if (p) {
      const pRailgun = this.railguns.get(p.id);
      const pFlamethrower = this.flamethrowers.get(p.id);

      if (pRailgun) {
        magazine = 1;
        isCharging = pRailgun.isCharging;
        reloading = pRailgun.isCharging || pRailgun.isCooldown;
        reloadProgress = pRailgun.reloadProgress;
        ammo = reloading ? 0 : 1;
      } else if (pFlamethrower) {
        magazine = Math.round(FLAMETHROWER_CONFIG.energyMax);
        ammo = Math.round(pFlamethrower.energy);
        reloading = pFlamethrower.energy < 10;
        reloadProgress = pFlamethrower.energyRatio;
      }
    }

    const showScore = this.mode === 'playing' && this.input.scoreHeld && !this.paused;
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
      mode: this.mode, paused: this.paused,
      health: p?.health ?? HULLS[this.currentHull].maxHealth,
      maxHealth: p?.maxHealth ?? HULLS[this.currentHull].maxHealth,
      ammo, magazine, reloading, reloadProgress, isCharging,
      boost: p?.boostEnergy ?? 1,
      score: this.score, kills: this.kills, wave: this.wave,
      botsAlive: this.bots.filter((b) => b.tank.alive).length,
      alive: p?.alive ?? false, timeSec: this.matchTime,
      muted: this.audio.muted,
      hullId: this.currentHull, turretId: this.currentTurret,
      showScore, scoreboard: board,
    };
  }

  private clearTanks() {
    for (const rg of this.railguns.values()) rg.dispose();
    for (const ft of this.flamethrowers.values()) ft.dispose();
    this.railguns.clear();
    this.flamethrowers.clear();

    for (const np of this.nameplates.values()) np.plate.dispose(this.scene);
    this.nameplates.clear();

    for (const t of this.tanks) t.dispose(this.scene);
    this.tanks = [];
    this.bots = [];
    this.player = null;
  }

  /** Выстрел обычной Пушки "Смоки" через ProjectileManager */
  private tryFire(t: TankEntity) {
    if (!t.canFire()) return;
    const muzzle = t.muzzleWorld(tmpV);
    const dir = t.aimDir(tmpV2);
    const recoil = t.isPlayer ? (TURRETS[this.currentTurret]?.recoil ?? 8) : 4;
    const range = t.params.range ?? 75;

    t.onFired(recoil);
    this.projectiles.fire(t, muzzle, dir, t.params.damage, 'cannon', range);

    this.effects.muzzle(muzzle, 0xffcc44);
    this.effects.addShake(0.08);
    this.audio.shoot('cannon');
    if (t.isPlayer) this.emit({ type: 'shotFired' });
  }

  /** Централизованная обработка урона */
  private onTankHit(target: TankEntity, dmg: number, owner: TankEntity, weaponType = 'Cannon') {
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
      console.log(`[DAMAGE] ${target.name} hit by ${owner.name} (${weaponType})! Damage: ${dmg}, HP: ${target.health}/${target.maxHealth}`);
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
      if (byPlayer) { this.score += SCORE.kill; this.kills += 1; }
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
    this.matchTime += dt;

    // --- Управление игроком ---
    if (p.alive) {
      const wantsFire = this.input.update(p);
      const pRailgun = this.railguns.get(p.id);
      const pFlamethrower = this.flamethrowers.get(p.id);

      if (pRailgun) {
        if (wantsFire) pRailgun.triggerFire();
      } else if (pFlamethrower) {
        pFlamethrower.setTrigger(wantsFire);
      } else {
        if (wantsFire) this.tryFire(p);
      }

      // Звук ручной/авто перезарядки (по фронту fullReloading)
      if (p.fullReloading && !this.prevReloading) this.audio.reload();
      this.prevReloading = p.fullReloading;
    } else {
      this.prevReloading = false;
    }

    // --- Управление ИИ ботами ---
    const bounds = this.arena.half - 6;
    for (const b of this.bots) {
      b.ai.update(dt, {
        player: p, bots: this.tanks.filter((t) => !t.isPlayer),
        colliders: this.arena.colliders, bounds,
      });

      const bRailgun = this.railguns.get(b.tank.id);
      const bFlamethrower = this.flamethrowers.get(b.tank.id);

      if (bRailgun) {
        if (b.ai.wantsFire) bRailgun.triggerFire();
      } else if (bFlamethrower) {
        bFlamethrower.setTrigger(b.ai.wantsFire);
      } else {
        if (b.ai.wantsFire) this.tryFire(b.tank);
      }
    }

    // Обновление специальных систем оружия
    for (const rg of this.railguns.values()) {
      rg.update(dt, this.tanks, this.arena);
    }
    for (const ft of this.flamethrowers.values()) {
      ft.update(dt, this.tanks);
    }

    for (const t of this.tanks) t.update(dt);

    // Дым повреждений и пыль из-под гусениц
    for (const t of this.tanks) {
      if (!t.alive) continue;
      if (t.health < t.maxHealth * 0.32) {
        t.smokeAcc += dt;
        if (t.smokeAcc > 0.11) {
          t.smokeAcc = 0;
          tmpV.set(t.position.x, 1.6, t.position.z);
          this.effects.tankSmoke(tmpV);
        }
      }
      if (Math.abs(t.speed) > 8) {
        t.dustAcc += dt * (Math.abs(t.speed) / Math.max(1, t.params.speed));
        if (t.dustAcc > 0.1) {
          t.dustAcc = 0;
          const back = t.yaw + Math.PI;
          tmpV.set(
            t.position.x + Math.sin(back) * 2.4 + (Math.random() - 0.5) * 1.2,
            0.35,
            t.position.z + Math.cos(back) * 2.4 + (Math.random() - 0.5) * 1.2,
          );
          this.effects.tankDust(tmpV);
        }
      }
    }

    if (p) this.effects.setAmbientCenter(p.position.x, p.position.z);

    // Именные таблички ботов
    for (const b of this.bots) {
      const np = this.nameplates.get(b.tank.id);
      if (!np) continue;
      if (b.tank.alive) {
        np.plate.sprite.visible = true;
        np.plate.setPosition(b.tank.position.x, 3.6, b.tank.position.z);
        np.plate.update(b.tank.health / b.tank.maxHealth, np.color);
      } else {
        np.plate.sprite.visible = false;
      }
    }

    for (const t of this.tanks) {
      if (!t.alive) continue;
      const res = resolveCircle(t.position.x, t.position.z, t.radius, this.arena.colliders);
      if (res.hit) {
        const impact = Math.hypot(res.x - t.position.x, res.z - t.position.z);
        t.position.x = res.x;
        t.position.z = res.z;
        if (impact > 0.01) t.speed *= 0.86;
      }
    }

    for (let i = 0; i < this.tanks.length; i++) {
      const a = this.tanks[i];
      if (!a.alive) continue;
      for (let j = i + 1; j < this.tanks.length; j++) {
        const b = this.tanks[j];
        if (!b.alive) continue;
        const dx = b.position.x - a.position.x;
        const dz = b.position.z - a.position.z;
        const rr = a.radius + b.radius;
        const d2 = dx * dx + dz * dz;
        if (d2 >= rr * rr || d2 < 1e-6) continue;
        const d = Math.sqrt(d2);
        const push = (rr - d) / d / 2;
        a.position.x -= dx * push;
        a.position.z -= dz * push;
        b.position.x += dx * push;
        b.position.z += dz * push;
      }
    }

    // Для Пушки "Смоки"
    this.projectiles.update(dt, {
      colliders: this.arena.colliders,
      tanks: this.tanks,
      arena: this.arena,
      effects: this.effects,
      onTankHit: (target, dmg, owner) => this.onTankHit(target, dmg, owner, 'Cannon'),
      onBlockDestroyed: this.onBlockDestroyed,
    });

    if (this.nextWaveT < 0 && this.bots.every((b) => !b.tank.alive)) this.nextWaveT = 2.2;
    if (this.nextWaveT > 0) {
      this.nextWaveT -= dt;
      if (this.nextWaveT <= 0) {
        this.nextWaveT = -1;
        for (const b of this.bots) {
          const rg = this.railguns.get(b.tank.id);
          if (rg) { rg.dispose(); this.railguns.delete(b.tank.id); }
          const ft = this.flamethrowers.get(b.tank.id);
          if (ft) { ft.dispose(); this.flamethrowers.delete(b.tank.id); }
          const np = this.nameplates.get(b.tank.id);
          if (np) { np.plate.dispose(this.scene); this.nameplates.delete(b.tank.id); }
          b.tank.dispose(this.scene);
        }
        this.tanks = this.tanks.filter((t) => t.isPlayer);
        this.bots = [];
        this.nextWave();
      }
    }

    if (this.deathT >= 0) {
      this.deathT += dt;
      if (this.deathT > 2.0) {
        this.deathT = -1;
        this.mode = 'over';
        this.emit({ type: 'gameOver', score: this.score, kills: this.kills, wave: this.wave });
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

    for (const c of this.arena.colliders) {
      if (c.kind !== 'block') continue;
      const s = this.mmStatic.find((m) => Math.abs(m.x - (c.minX + c.maxX) / 2) < 0.01 && Math.abs(m.z - (c.minZ + c.maxZ) / 2) < 0.01);
      if (s) s.alive = c.active;
    }
  }

  private updateCamera(dt: number) {
    if (this.mode === 'menu') {
      this.menuAngle += dt * 0.3;
      const r = 17;
      tmpV.set(
        Math.sin(this.menuAngle) * r,
        PREVIEW_POS.y + 3.2 + Math.sin(this.elapsed * 0.4) * 0.6,
        Math.cos(this.menuAngle) * r,
      );
      this.camPos.lerp(tmpV, 1 - Math.exp(-3 * dt));
      this.camLook.lerp(tmpV2.set(PREVIEW_POS.x + 6, PREVIEW_POS.y + 1.2, PREVIEW_POS.z), 1 - Math.exp(-5 * dt));

      if (this.previewVisual) {
        this.previewVisual.group.rotation.y = this.menuAngle * 0.35;
        this.previewVisual.turret.rotation.y = Math.sin(this.elapsed * 0.8) * 0.45;
      }

    } else if (this.mode === 'garage') {
      this.menuAngle += dt * 0.4;
      const r = 8.5;
      tmpV.set(
        Math.sin(this.menuAngle) * r,
        PREVIEW_POS.y + 1.6 + Math.sin(this.elapsed * 0.6) * 0.3,
        Math.cos(this.menuAngle) * r,
      );
      this.camPos.lerp(tmpV, 1 - Math.exp(-5 * dt));
      this.camLook.lerp(tmpV2.set(PREVIEW_POS.x, PREVIEW_POS.y + 0.8, PREVIEW_POS.z), 1 - Math.exp(-6 * dt));

      if (this.previewVisual) {
        this.previewVisual.group.rotation.y = this.menuAngle * 0.15;
        this.previewVisual.turret.rotation.y = Math.sin(this.elapsed * 1.1) * 0.35;
      }

    } else if (this.mode === 'playing' && this.player) {
      const p = this.player;
      const yaw = this.input.camYaw;
      const pitch = this.input.camPitch;
      const dist = 9.6;
      const horiz = Math.cos(pitch) * dist;
      const vert = Math.sin(pitch) * dist + 1.6;
      const fx = Math.sin(yaw);
      const fz = Math.cos(yaw);
      const headX = p.position.x, headZ = p.position.z;
      const headY = p.alive ? 1.8 : 1.2;

      let dx = -fx * horiz, dz = -fz * horiz, dy = vert;

      // Обход препятствий (как в game1): не давать камере уйти сквозь стену
      for (const c of this.arena.colliders) {
        if (c.height < 2.5) continue;
        const t = rayAABB(headX, headZ, dx, dz, c.minX, c.maxX, c.minZ, c.maxZ, 0.7);
        if (t >= 0 && t < 1) {
          const tt = Math.max(t * 0.92, 0.18);
          dx *= tt; dz *= tt; dy *= Math.max(tt, 0.5);
          break;
        }
      }

      const targetX = headX + dx;
      const targetY = Math.max(headY + dy, 0.7);
      const targetZ = headZ + dz;
      const lam = p.alive ? 14 : 4;
      this.camPos.x = THREE.MathUtils.damp(this.camPos.x, targetX, lam, dt);
      this.camPos.y = THREE.MathUtils.damp(this.camPos.y, targetY, lam, dt);
      this.camPos.z = THREE.MathUtils.damp(this.camPos.z, targetZ, lam, dt);

      const lookX = headX + fx * 6;
      const lookY = headY - Math.sin(pitch) * 5.4;
      const lookZ = headZ + fz * 6;
      this.camLook.x = THREE.MathUtils.damp(this.camLook.x, lookX, lam, dt);
      this.camLook.y = THREE.MathUtils.damp(this.camLook.y, lookY, lam, dt);
      this.camLook.z = THREE.MathUtils.damp(this.camLook.z, lookZ, lam, dt);

      // Плавное расширение FOV при скорости/бусте (как в game1)
      const speed01 = Math.min(1, Math.abs(p.speed) / p.params.speed);
      const targetFov = 58 + speed01 * 5 + (p.boostActive && p.speed > p.params.speed * 0.9 ? 4 : 0);
      this.camFov = THREE.MathUtils.damp(this.camFov, targetFov, 5, dt);
      if (Math.abs(this.camFov - this.camera.fov) > 0.05) {
        this.camera.fov = this.camFov;
        this.camera.updateProjectionMatrix();
      }

    } else if (this.mode === 'over' && this.player) {
      const p = this.player.position;
      tmpV.set(p.x - 14, 16, p.z - 14);
      this.camPos.lerp(tmpV, 1 - Math.exp(-1.5 * dt));
      this.camLook.lerp(tmpV2.set(p.x, 1, p.z), 1 - Math.exp(-3 * dt));
    }

    const roll = this.effects.getShake(this.shakeV, this.elapsed);
    this.camera.position.copy(this.camPos).add(this.shakeV);
    this.camera.up.set(Math.sin(roll), 1, 0).normalize();
    this.camera.lookAt(this.camLook);
  }

  /** Мгновенно поставить камеру за спиной игрока (спавн/старт матча). */
  private snapCamera() {
    const p = this.player;
    if (!p) return;
    const yaw = this.input.camYaw;
    const pitch = this.input.camPitch;
    const horiz = Math.cos(pitch) * 9.6;
    const vert = Math.sin(pitch) * 9.6 + 1.6;
    const fx = Math.sin(yaw), fz = Math.cos(yaw);
    const headY = p.alive ? 1.8 : 1.2;
    this.camPos.set(p.position.x - fx * horiz, headY + vert, p.position.z - fz * horiz);
    this.camLook.set(p.position.x + fx * 6, headY - Math.sin(pitch) * 5.4, p.position.z + fz * 6);
    this.camera.fov = this.camFov;
    this.camera.updateProjectionMatrix();
  }

  private tick = (ts: number) => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.tick);
    const dt = Math.min(0.05, this.lastTs ? (ts - this.lastTs) / 1000 : 0.016);
    this.lastTs = ts;
    this.elapsed += dt;

    if (this.mode === 'playing' && !this.paused) this.step(dt);
    if (this.mode !== 'playing' || this.paused) {
      for (const t of this.tanks) if (!t.alive) t.update(dt);
    }
    this.arena.update(dt, this.elapsed);
    this.effects.update(dt);
    this.updateCamera(dt);
    if (this.paused) this.audio.setEngine(0);
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
    if (document.hidden && this.mode === 'playing' && !this.paused) {
      this.paused = true;
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
