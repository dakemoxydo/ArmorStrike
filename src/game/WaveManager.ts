// ===== Менеджер волн: lifecycle, score/audio, intermission, делегирование спавна =====
import type * as THREE from 'three';
import { SCORE } from './constants';
import type { WeaponType } from '../core/catalog';
import type { AudioPort } from './ports/AudioPort';
import type { TankEntity } from './Tank';
import type { Nameplate } from './nameplate';
import type { RunState } from './RunState';
import type { GameEvent } from './types';
import type { Weapon } from './weapons/types';
import { spawnBot, disposeBots, pickSpawnIndex, type BotEntry } from './botSpawn';
import { previewWaveComposition, tallyWeapons, tallyRoles } from './wavePreview';

export type { BotEntry };

export interface WaveContext {
  scene: THREE.Scene;
  audio: AudioPort;
  run: RunState;
  createWeapon: (tank: TankEntity, type: WeaponType) => Weapon;
  emit: (e: GameEvent) => void;
}

export class WaveManager {
  wave = 0;
  bots: BotEntry[] = [];
  /** Waiting for player buff pick between waves. */
  waitingForChoice = false;

  constructor(private ctx: WaveContext) {}

  reset() {
    this.wave = 0;
    this.bots = [];
    this.waitingForChoice = false;
    this.ctx.run.intermission = false;
  }

  /** Начать первую волну (после ресета). Без intermission. */
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

    const composition = previewWaveComposition(this.wave);
    const used = new Set<number>();
    const spawnDeps = {
      scene: this.ctx.scene,
      createWeapon: this.ctx.createWeapon,
    };
    const player = tanks.find((t) => t.isPlayer);
    const px = player?.position.x ?? 0;
    const pz = player?.position.z ?? 0;

    for (let i = 0; i < composition.length; i++) {
      const idx = pickSpawnIndex(used, px, pz);
      used.add(idx);
      this.bots.push(spawnBot(this.wave, i, idx, spawnDeps, tanks, nameplates));
    }
  }

  /**
   * После зачистки — открыть intermission (превью + выбор баффа).
   * Спавн следующей волны только через confirmChoice().
   */
  update(_dt: number, _tanks: TankEntity[], _nameplates: Map<number, { plate: Nameplate; color: number }>) {
    if (this.waitingForChoice) return;
    if (this.bots.length === 0) return;
    if (!this.bots.every((b) => !b.tank.alive)) return;

    this.waitingForChoice = true;
    this.ctx.run.intermission = true;
    const nextWave = this.wave + 1;
    const composition = previewWaveComposition(nextWave);
    this.ctx.emit({
      type: 'intermission',
      clearedWave: this.wave,
      nextWave,
      composition,
      tally: tallyWeapons(composition),
      roleTally: tallyRoles(composition),
    });
  }

  /**
   * Игрок выбрал бафф: очистить трупы, заспавнить следующую волну, снять intermission.
   * Бафф на игрока применяется снаружи (GameModeController) до вызова.
   */
  confirmChoice(
    tanks: TankEntity[],
    nameplates: Map<number, { plate: Nameplate; color: number }>,
  ) {
    if (!this.waitingForChoice) return;
    this.waitingForChoice = false;
    this.ctx.run.intermission = false;
    disposeBots(this.bots, tanks, nameplates, this.ctx.scene);
    this.bots = [];
    this.spawnWave(tanks, nameplates);
  }
}
