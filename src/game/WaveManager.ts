// ===== Менеджер волн: композиция и спавн ботов, таймер следующей волны =====
import * as THREE from 'three';
import { botStatsForWave, botsForWave, COLORS, HULLS, SCORE, TURRETS } from './constants';
import type { HullId, TurretId } from './constants';
import type { Arena } from './Arena';
import type { Effects } from './effects';
import type { AudioFX } from './audio';
import { TankEntity, buildTankMesh } from './Tank';
import type { TankParams, TankStyle } from './Tank';
import { AIController, randomPersona } from './AI';
import { Nameplate } from './nameplate';
import type { RunState } from './RunState';
import type { GameEvent } from './Game';
import type { Weapon } from './weapons/types';
import type { WeaponType } from './Projectile';

const SPAWN_POINTS: [number, number][] = [
  [64, 64], [-64, 64], [64, -64], [-64, -64],
  [0, -66], [67, 0], [-67.5, 18],
];

export interface WaveContext {
  scene: THREE.Scene;
  arena: Arena;
  effects: Effects;
  audio: AudioFX;
  run: RunState;
  createWeapon: (tank: TankEntity, type: WeaponType) => Weapon;
  emit: (e: GameEvent) => void;
}

export interface BotEntry { tank: TankEntity; ai: AIController }

export class WaveManager {
  wave = 0;
  nextWaveT = -1;
  bots: BotEntry[] = [];

  constructor(private ctx: WaveContext) {}

  reset() {
    this.wave = 0;
    this.nextWaveT = -1;
    this.bots = [];
  }

  /** Начать первую волну (после ресета). */
  begin(tanks: TankEntity[], nameplates: Map<number, { plate: Nameplate; color: number }>) {
    this.reset();
    this.spawnWave(tanks, nameplates);
  }

  private spawnWave(tanks: TankEntity[], nameplates: Map<number, { plate: Nameplate; color: number }>) {
    this.wave += 1;
    if (this.wave > 1) {
      this.ctx.run.score += SCORE.waveBonus(this.wave - 1);
      this.ctx.audio.waveHorn();
    }
    this.ctx.emit({ type: 'wave', n: this.wave });

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
      this.ctx.scene.add(plate.sprite);
      nameplates.set(bot.id, { plate, color: colorHex });
      bot.yaw = yaw;
      bot.aimYaw = yaw;
      this.ctx.scene.add(bot.visual.group);
      tanks.push(bot);

      bot.weapon = this.ctx.createWeapon(bot, tDef.weaponType);

      this.bots.push({ tank: bot, ai: new AIController(bot, stats.sightRange, tDef.range, stats.aimError, randomPersona(this.wave)) });
    }
  }

  /** Таймер перехода к следующей волне после зачистки ботов + очистка мёртвых. */
  update(dt: number, tanks: TankEntity[], nameplates: Map<number, { plate: Nameplate; color: number }>) {
    if (this.nextWaveT < 0 && this.bots.every((b) => !b.tank.alive)) this.nextWaveT = 2.2;
    if (this.nextWaveT > 0) {
      this.nextWaveT -= dt;
      if (this.nextWaveT <= 0) {
        this.nextWaveT = -1;
        for (const b of this.bots) {
          b.tank.weapon?.dispose();
          const np = nameplates.get(b.tank.id);
          if (np) { np.plate.dispose(this.ctx.scene); nameplates.delete(b.tank.id); }
          b.tank.dispose(this.ctx.scene);
        }
        for (let i = tanks.length - 1; i >= 0; i--) {
          if (!tanks[i].isPlayer) tanks.splice(i, 1);
        }
        this.bots = [];
        this.spawnWave(tanks, nameplates);
      }
    }
  }
}
