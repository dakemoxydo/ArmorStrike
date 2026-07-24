import * as THREE from 'three';
import type { TankEntity } from '../Tank';
import { Nameplate } from '../nameplate';
import type { Arena } from '../Arena';
import type { EffectsPort } from '../ports/EffectsPort';
import type { ProjectileManager } from './Projectile';
import type { PlayerController } from '../PlayerController';
import type { AudioPort } from '../ports/AudioPort';
import type { RunState } from '../RunState';
import type { BotRoster } from '../BotRoster';
import type { CombatSystem } from '../CombatSystem';
import type { HudModel } from '../HudModel';
import type { GameEvent } from '../types';
import { buildSimulationStages, type SimSystem, type FrameContext, type ScalarCell } from './stages';
import { applyGameOverInputState } from '../deathLifecycle';
import { MatchRuntime } from '../match/MatchRuntime';
import type { MatchResult } from '../match/matchTypes';

export class GameSimulation {
  player: TankEntity | null = null;
  tanks: TankEntity[] = [];
  nameplates = new Map<number, { plate: Nameplate; color: number }>();
  readonly match: MatchRuntime;

  /** Internal cells projected into FrameContext by reference. */
  private readonly deathCell: ScalarCell<number> = { value: -1 };
  private readonly prevReloadingCell: ScalarCell<boolean> = { value: false };

  /** Public API for bootstrap / mode controller (same field names as before). */
  get deathT(): number { return this.deathCell.value; }
  set deathT(v: number) { this.deathCell.value = v; }
  get prevReloading(): boolean { return this.prevReloadingCell.value; }
  set prevReloading(v: boolean) { this.prevReloadingCell.value = v; }

  private systems: SimSystem[];

  /** Bound each step for MatchRuntime emit. */
  private stepEmit: (e: GameEvent) => void = () => {};

  /** Long-lived frame context — per-frame fields rewritten each step. */
  private readonly frameCtx: FrameContext = {
    dt: 0,
    emit: () => {},
    player: null!,
    tanks: [],
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
    readonly bots: BotRoster,
    readonly hudModel: HudModel,
  ) {
    this.match = new MatchRuntime({
      run,
      audio,
      input,
      bots,
      emit: (e) => this.stepEmit(e),
      requestMatchOver: (result) => this.requestMatchOver(result),
      getDeathT: () => this.deathT,
      setDeathT: (v) => { this.deathT = v; },
    });

    this.systems = buildSimulationStages({
      arena,
      effects,
      projectiles,
      input,
      audio,
      combat,
      bots,
      hudModel,
      match: this.match,
      nameplates: this.nameplates,
    });
  }

  step(dt: number, emit: (e: GameEvent) => void) {
    const p = this.player;
    if (!p) return;
    this.run.matchTime += dt;
    this.stepEmit = emit;
    // Обновляем время матча для streak tracker
    this.combat.setMatchTime(this.run.matchTime);

    const ctx = this.frameCtx;
    ctx.dt = dt;
    ctx.emit = emit;
    ctx.player = p;
    ctx.tanks = this.tanks;
    ctx.requestGameOver = () => {
      // Legacy path: treat as time-forfeit with player loss (should be rare).
      const result: MatchResult = {
        reason: 'time',
        mode: this.match.mode,
        winnerName: null,
        winnerTeam: null,
        playerWon: false,
        playerKills: p.kills,
        playerDeaths: p.deaths,
        playerScore: this.run.score,
        teamKills: { ...this.match.teamKills },
        teamScore: { ...this.match.teamScore },
        matchTimeSec: this.run.matchTime,
      };
      this.requestMatchOver(result);
    };
    for (const s of this.systems) s.update(ctx);
  }

  /** Match win / time limit — single exit to game over UI. */
  requestMatchOver(result: MatchResult) {
    this.match.ended = true;
    this.match.lastResult = result;
    this.deathT = -1;
    this.run.mode = 'over';
    const st = { paused: this.run.paused, inputEnabled: this.input.enabled };
    applyGameOverInputState(st);
    this.run.paused = st.paused;
    this.input.enabled = st.inputEnabled;
    this.input.releaseLock();
    this.stepEmit({ type: 'modeChanged', mode: 'over' });
    this.stepEmit({
      type: 'gameOver',
      score: result.playerScore,
      kills: result.playerKills,
      deaths: result.playerDeaths,
      playerWon: result.playerWon,
      winnerName: result.winnerName,
      winnerTeam: result.winnerTeam,
      reason: result.reason,
      mode: result.mode,
      matchTimeSec: result.matchTimeSec,
      teamKills: result.teamKills,
      teamScore: result.teamScore,
    });
  }

  clearTanks(scene: THREE.Scene) {
    for (const np of this.nameplates.values()) np.plate.dispose(scene);
    this.nameplates.clear();
    for (const t of this.tanks) t.dispose(scene);
    this.tanks = [];
    this.bots.reset();
    this.player = null;
    this.match.disposeVisuals();
    this.match.reset(this.match.mode);
  }
}
