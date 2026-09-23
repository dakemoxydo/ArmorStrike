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
import { NetworkSyncStage } from './stages/NetworkSyncStage';
import type { RemotePlayerManager } from '../network/RemotePlayerManager';
import type { NetworkSession } from '../network/NetworkSession';
import { applyGameOverInputState } from '../deathLifecycle';
import { MatchRuntime } from '../match/MatchRuntime';
import type { MatchResult } from '../match/matchTypes';
import { calculateMatchRewards } from '../economy/matchRewards';

export class GameSimulation {
  player: TankEntity | null = null;
  tanks: TankEntity[] = [];
  /**
   * Generation counter for async roster mutations (spawnHostBot): bumped by
   * clearTanks; a spawn started under an older generation is discarded so a
   * late await cannot re-insert a bot into a cleared roster.
   */
  rosterGen = 0;
  nameplates = new Map<number, { plate: Nameplate; color: number }>();
  readonly match: MatchRuntime;
  readonly networkSync: NetworkSyncStage;
  remotePlayers: RemotePlayerManager | null = null;
  networkSession: NetworkSession | null = null;
  /** True while a Realtime room is attached — pause must not freeze the sim. */
  networked = false;

  /** Internal cells projected into FrameContext by reference. */
  private readonly deathCell: ScalarCell<number> = { value: -1 };
  private readonly prevReloadingCell: ScalarCell<boolean> = { value: false };
  /** Timestamp of the last auto-pause triggered by pointer lock loss or tab blur. */
  lastAutoPauseTime = 0;

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
    this.networkSync = new NetworkSyncStage();

    this.match = new MatchRuntime({
      run,
      audio,
      input,
      bots,
      emit: (e) => this.stepEmit(e),
      requestMatchOver: (result) => this.requestMatchOver(result),
      getDeathT: () => this.deathT,
      setDeathT: (v) => { this.deathT = v; },
      getBestStreak: () => this.combat.playerBestStreak,
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
      networkSync: this.networkSync,
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

    const isDraw = !result.playerWon && !result.winnerName && !result.winnerTeam;
    const rewards = calculateMatchRewards({
      kills: result.playerKills,
      score: result.playerScore,
      playerWon: result.playerWon,
      isDraw,
      bestStreak: result.playerBestStreak,
    });
    this.run.addCredits(rewards.total);
    this.run.advanceQuests({
      kills: result.playerKills,
      playerWon: result.playerWon,
      mode: result.mode,
      bestStreak: result.playerBestStreak,
    });

    this.networkSession?.notifyMatchOver();

    this.stepEmit({
      type: 'gameOver',
      score: result.playerScore,
      kills: result.playerKills,
      deaths: result.playerDeaths,
      bestStreak: result.playerBestStreak,
      playerWon: result.playerWon,
      winnerName: result.winnerName,
      winnerTeam: result.winnerTeam,
      reason: result.reason,
      mode: result.mode,
      matchTimeSec: result.matchTimeSec,
      teamKills: result.teamKills,
      teamScore: result.teamScore,
      rewards,
    });
  }

  clearTanks(scene: THREE.Scene) {
    this.rosterGen++;
    this.remotePlayers?.clear();
    for (const np of this.nameplates.values()) np.plate.dispose(scene);
    this.nameplates.clear();
    for (const t of this.tanks) t.dispose(scene);
    // In-place: RemotePlayerManager holds this array reference (tanksList).
    this.tanks.length = 0;
    this.bots.reset();
    this.player = null;
    for (const s of this.systems) s.onRosterCleared?.();
    this.match.disposeVisuals();
    this.match.reset(this.match.mode);
  }
}
