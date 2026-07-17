import * as THREE from 'three';
import type { TankEntity } from '../Tank';
import { Nameplate } from '../nameplate';
import type { Arena } from '../Arena';
import type { Effects } from '../effects';
import type { ProjectileManager } from './Projectile';
import type { PlayerController } from '../PlayerController';
import type { AudioFX } from '../audio';
import type { RunState } from '../RunState';
import type { WaveManager } from '../WaveManager';
import type { CombatSystem } from '../CombatSystem';
import type { HudModel } from '../HudModel';
import type { GameEvent } from '../types';
import { buildSimulationStages, type SimSystem, type SimContext, type ScalarCell } from './stages';

export class GameSimulation {
  player: TankEntity | null = null;
  tanks: TankEntity[] = [];
  nameplates = new Map<number, { plate: Nameplate; color: number }>();

  /** Internal cells projected into SimContext by reference. */
  private readonly deathCell: ScalarCell<number> = { value: -1 };
  private readonly prevReloadingCell: ScalarCell<boolean> = { value: false };

  /** Public API for bootstrap / mode controller (same field names as before). */
  get deathT(): number { return this.deathCell.value; }
  set deathT(v: number) { this.deathCell.value = v; }
  get prevReloading(): boolean { return this.prevReloadingCell.value; }
  set prevReloading(v: boolean) { this.prevReloadingCell.value = v; }

  private systems: SimSystem[] = buildSimulationStages();

  /** Колбэк гибели игрока (устанавливается Game после создания sim). */
  onPlayerDeath?: () => void;

  constructor(
    readonly arena: Arena,
    readonly effects: Effects,
    readonly projectiles: ProjectileManager,
    readonly input: PlayerController,
    readonly audio: AudioFX,
    readonly run: RunState,
    readonly combat: CombatSystem,
    readonly waves: WaveManager,
    readonly hudModel: HudModel,
  ) {}

  step(dt: number, emit: (e: GameEvent) => void) {
    const p = this.player;
    if (!p) return;
    this.run.matchTime += dt;

    // Плоский контекст: стадии не зависят от типа GameSimulation.
    // Скаляры — shared cells (mid-step sim.deathT = 0 видно DeathTimerStage в том же кадре).
    const ctx: SimContext = {
      dt,
      emit,
      player: p,
      tanks: this.tanks,
      nameplates: this.nameplates,
      arena: this.arena,
      effects: this.effects,
      projectiles: this.projectiles,
      input: this.input,
      audio: this.audio,
      run: this.run,
      combat: this.combat,
      waves: this.waves,
      hudModel: this.hudModel,
      deathT: this.deathCell,
      prevReloading: this.prevReloadingCell,
      requestGameOver: () => this.requestGameOver(emit),
    };
    for (const s of this.systems) s.update(ctx);
  }

  /** Единая точка перехода playing → over (DeathTimerStage и любые будущие call-sites). */
  requestGameOver(emit: (e: GameEvent) => void) {
    this.deathT = -1;
    this.run.mode = 'over';
    emit({ type: 'modeChanged', mode: 'over' });
    emit({ type: 'gameOver', score: this.run.score, kills: this.run.kills, wave: this.waves.wave });
  }

  clearTanks(scene: THREE.Scene) {
    for (const np of this.nameplates.values()) np.plate.dispose(scene);
    this.nameplates.clear();
    for (const t of this.tanks) t.dispose(scene);
    this.tanks = [];
    this.waves.reset();
    this.player = null;
  }
}
