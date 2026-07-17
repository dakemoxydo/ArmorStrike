// ===== Менеджер волн: lifecycle, score/audio, делегирование спавна =====
import type * as THREE from 'three';
import { botsForWave, SCORE } from './constants';
import type { WeaponType } from '../core/catalog';
import type { AudioFX } from './audio';
import type { TankEntity } from './Tank';
import type { Nameplate } from './nameplate';
import type { RunState } from './RunState';
import type { GameEvent } from './types';
import type { Weapon } from './weapons/types';
import { SPAWN_POINTS, spawnBot, disposeBots, type BotEntry } from './botSpawn';

export type { BotEntry };

export interface WaveContext {
  scene: THREE.Scene;
  audio: AudioFX;
  run: RunState;
  createWeapon: (tank: TankEntity, type: WeaponType) => Weapon;
  emit: (e: GameEvent) => void;
}

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

    const count = botsForWave(this.wave);
    const used = new Set<number>();
    const spawnDeps = {
      scene: this.ctx.scene,
      createWeapon: this.ctx.createWeapon,
    };

    for (let i = 0; i < count; i++) {
      let idx = Math.floor(Math.random() * SPAWN_POINTS.length);
      let guard = 0;
      while (used.has(idx) && guard++ < 20) idx = Math.floor(Math.random() * SPAWN_POINTS.length);
      used.add(idx);
      this.bots.push(spawnBot(this.wave, i, idx, spawnDeps, tanks, nameplates));
    }
  }

  /** Таймер перехода к следующей волне после зачистки ботов + очистка мёртвых. */
  update(dt: number, tanks: TankEntity[], nameplates: Map<number, { plate: Nameplate; color: number }>) {
    if (this.nextWaveT < 0 && this.bots.every((b) => !b.tank.alive)) this.nextWaveT = 2.2;
    if (this.nextWaveT > 0) {
      this.nextWaveT -= dt;
      if (this.nextWaveT <= 0) {
        this.nextWaveT = -1;
        disposeBots(this.bots, tanks, nameplates, this.ctx.scene);
        this.bots = [];
        this.spawnWave(tanks, nameplates);
      }
    }
  }
}
