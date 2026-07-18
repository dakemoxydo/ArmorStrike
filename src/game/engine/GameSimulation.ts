import * as THREE from 'three';
import type { TankEntity } from '../Tank';
import { Nameplate } from '../nameplate';
import type { Arena } from '../Arena';
import type { EffectsPort } from '../ports/EffectsPort';
import type { ProjectileManager } from './Projectile';
import type { PlayerController } from '../PlayerController';
import type { AudioPort } from '../ports/AudioPort';
import type { RunState } from '../RunState';
import type { WaveManager } from '../WaveManager';
import type { CombatSystem } from '../CombatSystem';
import type { HudModel } from '../HudModel';
import type { GameEvent } from '../types';
import { buildSimulationStages, type SimSystem, type SimContext, type ScalarCell } from './stages';
import { applyGameOverInputState } from '../deathLifecycle';

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

  /** Long-lived sim context — fields rewritten each step. */
  private readonly simCtx: SimContext = {
    dt: 0,
    emit: () => {},
    player: null!,
    tanks: [],
    nameplates: this.nameplates,
    arena: null!,
    effects: null!,
    projectiles: null!,
    input: null!,
    audio: null!,
    run: null!,
    combat: null!,
    waves: null!,
    hudModel: null!,
    deathT: this.deathCell,
    prevReloading: this.prevReloadingCell,
    requestGameOver: () => {},
  };

  /** Колбэк гибели игрока (устанавливается Game после создания sim). */
  onPlayerDeath?: () => void;

  constructor(
    readonly arena: Arena,
    readonly effects: EffectsPort,
    readonly projectiles: ProjectileManager,
    readonly input: PlayerController,
    readonly audio: AudioPort,
    readonly run: RunState,
    readonly combat: CombatSystem,
    readonly waves: WaveManager,
    readonly hudModel: HudModel,
  ) {
    const c = this.simCtx;
    c.arena = arena;
    c.effects = effects;
    c.projectiles = projectiles;
    c.input = input;
    c.audio = audio;
    c.run = run;
    c.combat = combat;
    c.waves = waves;
    c.hudModel = hudModel;
    c.nameplates = this.nameplates;
    c.deathT = this.deathCell;
    c.prevReloading = this.prevReloadingCell;
  }

  step(dt: number, emit: (e: GameEvent) => void) {
    const p = this.player;
    if (!p) return;
    this.run.matchTime += dt;

    const ctx = this.simCtx;
    ctx.dt = dt;
    ctx.emit = emit;
    ctx.player = p;
    ctx.tanks = this.tanks;
    ctx.requestGameOver = () => this.requestGameOver(emit);
    for (const s of this.systems) s.update(ctx);
  }

  /** Единая точка перехода playing → over (DeathTimerStage и любые будущие call-sites). */
  requestGameOver(emit: (e: GameEvent) => void) {
    this.deathT = -1;
    this.run.mode = 'over';
    const st = { paused: this.run.paused, inputEnabled: this.input.enabled };
    applyGameOverInputState(st);
    this.run.paused = st.paused;
    this.input.enabled = st.inputEnabled;
    this.input.releaseLock();
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
