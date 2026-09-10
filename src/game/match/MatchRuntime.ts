// ===== Runtime матча: kills, respawn, win end, capture (CP) =====
// Тонкий координатор: kill-credit + win conditions; respawn и capture делегированы.
import type * as THREE from 'three';
import type { AudioPort } from '../ports/AudioPort';
import type { PlayerController } from '../PlayerController';
import type { RunState } from '../RunState';
import type { TankEntity } from '../Tank';
import type { GameEvent } from '../types';
import type { MapId } from '../maps/mapCatalog';
import { applyPlayerKillScore } from '../scoring';
import type { BotRoster } from '../BotRoster';
import { configForMode, DEFAULT_MATCH_MODE } from './matchConfig';
import type { MatchConfig, MatchModeId, MatchResult } from './matchTypes';
import { isEnemy } from './teams';
import { evaluateMatchEnd } from './winConditions';
import type { CaptureZoneState } from './captureLogic';
import type { PersonalStanding } from './winConditions';
import { RespawnController } from './RespawnController';
import { CaptureController } from './CaptureController';

export interface MatchRuntimeHooks {
  run: RunState;
  audio: AudioPort;
  input: PlayerController;
  bots: BotRoster;
  emit: (e: GameEvent) => void;
  /** End match (mode=over + gameOver event). */
  requestMatchOver: (result: MatchResult) => void;
  /** Shared death-cam timer cell (player only). */
  getDeathT: () => number;
  setDeathT: (v: number) => void;
  /** Best player streak of the match (H4) — wired to CombatSystem. */
  getBestStreak?: () => number;
}

export interface MatchResetOpts {
  mapId?: MapId;
  scene?: THREE.Scene;
}

export class MatchRuntime {
  config: MatchConfig = configForMode(DEFAULT_MATCH_MODE);
  ended = false;
  teamKills = { alpha: 0, bravo: 0 };
  teamScore = { alpha: 0, bravo: 0 };
  lastResult: MatchResult | null = null;

  private readonly respawn: RespawnController;
  private readonly capture = new CaptureController();
  /**
   * Reusable standings buffer for evaluateMatchEnd — refilled each tick
   * (was: fresh array of N objects allocated every simulation step).
   */
  private readonly _personals: PersonalStanding[] = [];

  constructor(private hooks: MatchRuntimeHooks) {
    this.respawn = new RespawnController({
      run: hooks.run,
      audio: hooks.audio,
      input: hooks.input,
      setDeathT: hooks.setDeathT,
    });
  }

  get mode(): MatchModeId {
    return this.config.mode;
  }

  /** Active CP zones (empty outside capture_point). */
  get zones(): CaptureZoneState[] {
    return this.capture.zones;
  }

  /** Snapshot for HUD/minimap (read-only view). */
  getCaptureZones(): readonly CaptureZoneState[] {
    return this.capture.getCaptureZones();
  }

  disposeVisuals() {
    this.capture.disposeMarkers();
  }

  reset(mode: MatchModeId = DEFAULT_MATCH_MODE, opts: MatchResetOpts = {}) {
    this.config = configForMode(mode);
    this.ended = false;
    this.teamKills = { alpha: 0, bravo: 0 };
    this.teamScore = { alpha: 0, bravo: 0 };
    this.lastResult = null;

    if (mode === 'capture_point' && opts.mapId && opts.scene) {
      this.capture.reset(opts.mapId, opts.scene);
    } else {
      // No scene to mount markers into: drop visuals in any case. Outside CP
      // also drop zone data; inside CP keep the last zones (L-4) so readers
      // never observe a torn-down set between clearTanks and the next start.
      this.capture.disposeMarkers();
      if (mode !== 'capture_point') this.capture.clearZones();
    }
  }

  /**
   * Called from CombatSystem when a tank dies.
   * Awards kill credit, deaths, team pools; does not end match here.
   */
  onTankKilled(target: TankEntity, owner: TankEntity | null, tanks: TankEntity[]) {
    if (this.ended) return;

    target.deaths += 1;

    if (owner && isEnemy(owner, target)) {
      owner.kills += 1;
      if (owner.teamId === 'alpha') this.teamKills.alpha += 1;
      if (owner.teamId === 'bravo') this.teamKills.bravo += 1;

      if (owner.isPlayer) {
        const next = applyPlayerKillScore(
          { kills: this.hooks.run.kills, score: this.hooks.run.score },
          true,
        );
        this.hooks.run.kills = next.kills;
        this.hooks.run.score = next.score;
      }
    }

    this.hooks.emit({
      type: 'kill',
      victim: target.name,
      byPlayer: owner?.isPlayer ?? false,
    });

    // Keep run.kills aligned with player entity (HUD / gameOver).
    const player = tanks.find((t) => t.isPlayer);
    if (player) this.hooks.run.kills = player.kills;
  }

  /** Per-frame: invuln, respawns, capture score, win check. */
  update(dt: number, tanks: TankEntity[], player: TankEntity | null) {
    if (this.ended || this.hooks.run.mode !== 'playing') return;

    for (const t of tanks) {
      if (t.invulnT > 0) t.invulnT = Math.max(0, t.invulnT - dt);
    }

    this.respawn.update(dt, tanks, this.config.respawnDelaySec, this.config.spawnInvulnSec);

    // Keep shared death cam cell in sync with player.combat.deathT
    if (player && !player.alive) {
      this.hooks.setDeathT(player.deathT);
    } else if (player?.alive && this.hooks.getDeathT() >= 0) {
      this.hooks.setDeathT(-1);
    }

    if (this.config.mode === 'capture_point') {
      const delta = this.capture.update(dt, tanks);
      this.teamScore.alpha += delta.alpha;
      this.teamScore.bravo += delta.bravo;
    }

    // Reuse the standings buffer: pooled row objects mutated in place instead
    // of allocating a fresh array of N objects on every simulation tick.
    const personals = this._personals;
    for (let i = 0; i < tanks.length; i++) {
      const t = tanks[i];
      const row = personals[i] ?? (personals[i] = {
        id: 0, name: '', kills: 0, isPlayer: false,
      });
      row.id = t.id;
      row.name = t.name;
      row.kills = t.kills;
      row.isPlayer = t.isPlayer;
    }
    personals.length = tanks.length;

    const win = evaluateMatchEnd({
      config: this.config,
      matchTimeSec: this.hooks.run.matchTime,
      personals,
      teamKills: this.teamKills,
      teamScore: this.teamScore,
    });

    if (win) {
      const p = tanks.find((t) => t.isPlayer);
      const result: MatchResult = {
        reason: win.reason,
        mode: this.config.mode,
        winnerName: win.winnerName,
        winnerTeam: win.winnerTeam,
        playerWon: win.playerWon,
        playerKills: p?.kills ?? this.hooks.run.kills,
        playerDeaths: p?.deaths ?? 0,
        playerScore: this.hooks.run.score,
        playerBestStreak: this.hooks.getBestStreak?.() ?? 0,
        teamKills: { ...this.teamKills },
        teamScore: { ...this.teamScore },
        matchTimeSec: this.hooks.run.matchTime,
      };
      this.ended = true;
      this.lastResult = result;
      this.hooks.requestMatchOver(result);
    }
  }
}
