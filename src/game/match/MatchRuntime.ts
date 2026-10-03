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
import { SCORE } from '../constants';
import type { BotRoster } from '../BotRoster';
import { configForMode, DEFAULT_MATCH_MODE } from './matchConfig';
import type { MatchConfig, MatchModeId, MatchResult } from './matchTypes';
import type { MatchPlayerSync, MatchSyncPacket } from '../network/types';
import {
  findSyncPlayer,
  localPlayerWonFromSync,
  reconcilePlayerScore,
  sanitizeSyncPlayers,
} from '../network/replication';
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

export type MatchReplication = 'local' | 'host' | 'client';

/** Санитайзер верхней границы времени матча (сутки) для недоверенного пакета. */
const MAX_MATCH_TIME_SEC = 24 * 60 * 60;

/** Конечное число из пакета хоста (null — значение битое, поле игнорируем). */
function numOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export class MatchRuntime {
  config: MatchConfig = configForMode(DEFAULT_MATCH_MODE);
  ended = false;
  teamKills = { alpha: 0, bravo: 0 };
  teamScore = { alpha: 0, bravo: 0 };
  lastResult: MatchResult | null = null;
  /**
   * local — offline (simulate + end).
   * host — simulate + end, broadcast via NetworkSession.
   * client — apply host snapshots; do not simulate CP or win.
   */
  replication: MatchReplication = 'local';

  private readonly respawn: RespawnController;
  private readonly capture = new CaptureController();
  /**
   * Reusable standings buffer for evaluateMatchEnd — refilled each tick
   * (was: fresh array of N objects allocated every simulation step).
   */
  private readonly _personals: PersonalStanding[] = [];
  /**
   * Пул авторитетных строк игроков для `match_sync` (хост заполняет в update,
   * toSyncPacket отдаёт снимок). Клиент берёт отсюда фраги/очки — локальные
   * счётчики игрока можно накрутить.
   */
  private readonly _netRows: MatchPlayerSync[] = [];
  /** networkId победителя DM (имя — свободно меняемый label). */
  private winnerNetworkId: string | null = null;

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
    this.winnerNetworkId = null;
    this._netRows.length = 0;

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

    if (this.replication === 'client') {
      this.capture.syncMarkers();
      return;
    }

    if (this.config.mode === 'capture_point') {
      const delta = this.capture.update(dt, tanks);
      this.teamScore.alpha += delta.alpha;
      this.teamScore.bravo += delta.bravo;
    }

    // Reuse the standings buffer: pooled row objects mutated in place instead
    // of allocating a fresh array of N objects on every simulation tick.
    const personals = this._personals;
    const netRows = this._netRows;
    for (let i = 0; i < tanks.length; i++) {
      const t = tanks[i];
      const row = personals[i] ?? (personals[i] = {
        id: 0, name: '', kills: 0, isPlayer: false,
      });
      row.id = t.id;
      row.name = t.name;
      row.kills = t.kills;
      row.isPlayer = t.isPlayer;

      const net = netRows[i] ?? (netRows[i] = {
        networkId: '', name: '', kills: 0, deaths: 0,
      });
      net.networkId = t.networkId ?? '';
      net.name = t.name;
      net.kills = t.kills;
      net.deaths = t.deaths;
      if (t.isPlayer) {
        net.score = this.hooks.run.score;
        net.bestStreak = this.hooks.getBestStreak?.() ?? 0;
      } else {
        // Support-очки (лечение «Изидой») хост не видит — отдаём киловую часть.
        net.score = t.kills * SCORE.kill;
        net.bestStreak = 0;
      }
    }
    personals.length = tanks.length;
    netRows.length = tanks.length;

    const win = evaluateMatchEnd({
      config: this.config,
      matchTimeSec: this.hooks.run.matchTime,
      personals,
      teamKills: this.teamKills,
      teamScore: this.teamScore,
      playerTeam: player?.teamId ?? 'alpha',
    });

    if (win) {
      const p = tanks.find((t) => t.isPlayer);
      // DM: победителя опознаём по networkId строки, а не по display name.
      this.winnerNetworkId = win.winnerName
        ? (netRows.find((r) => r.name === win.winnerName)?.networkId ?? null)
        : null;
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

  /** Client: replace scores / CP / clock from the host snapshot. */
  applyHostSync(packet: MatchSyncPacket, player: TankEntity | null) {
    // Нефинитный timeSec навсегда испортил бы run.matchTime (из NaN не выходит
    // `+= dt`), а с ним — лимит матча, окна серий (KillStreakTracker) и часы.
    const timeSec = numOrNull(packet.timeSec);
    if (timeSec !== null && timeSec >= 0 && timeSec <= MAX_MATCH_TIME_SEC) {
      this.hooks.run.matchTime = timeSec;
    }
    const ts = packet.teamScore;
    const tsA = numOrNull(ts?.alpha);
    const tsB = numOrNull(ts?.bravo);
    if (tsA !== null && tsB !== null) {
      this.teamScore.alpha = tsA;
      this.teamScore.bravo = tsB;
    }
    const tk = packet.teamKills;
    const tkA = numOrNull(tk?.alpha);
    const tkB = numOrNull(tk?.bravo);
    if (tkA !== null && tkB !== null) {
      this.teamKills.alpha = tkA;
      this.teamKills.bravo = tkB;
    }
    if (Array.isArray(packet.captures)) this.capture.applyNetworkState(packet.captures);

    if (packet.ended && !this.ended) {
      // Фраги/очки — от хоста: локальные счётчики игрока накручиваются.
      // Нет players (старый хост) → фолбэк на локальные значения.
      const row = findSyncPlayer(sanitizeSyncPlayers(packet.players), player?.networkId ?? null);
      const localKills = player?.kills ?? this.hooks.run.kills;
      const playerKills = row ? row.kills : player?.kills ?? this.hooks.run.kills;
      const playerDeaths = row ? row.deaths : player?.deaths ?? 0;
      const playerScore = row
        ? reconcilePlayerScore(row.score, this.hooks.run.score, localKills)
        : this.hooks.run.score;
      // Серии клиент считает локально, хост их не знает → не затираем честную.
      const playerBestStreak = Math.max(row?.bestStreak ?? 0, this.hooks.getBestStreak?.() ?? 0);
      // HUD/gameOver читают run.kills — синхронизируем с авторитетными.
      if (row) this.hooks.run.kills = playerKills;

      const result: MatchResult = {
        reason: packet.reason === 'time' ? 'time' : 'score',
        mode: this.config.mode,
        winnerName: packet.winnerName ?? null,
        winnerTeam: packet.winnerTeam ?? null,
        playerWon: player
          ? localPlayerWonFromSync(packet, {
            teamId: player.teamId,
            name: player.name,
            networkId: player.networkId,
          })
          : false,
        playerKills,
        playerDeaths,
        playerScore,
        playerBestStreak,
        teamKills: { ...(packet.teamKills ?? this.teamKills) },
        teamScore: { ...(packet.teamScore ?? this.teamScore) },
        matchTimeSec: this.hooks.run.matchTime,
      };
      this.ended = true;
      this.lastResult = result;
      this.hooks.requestMatchOver(result);
    }
  }

  toSyncPacket(ended = this.ended): MatchSyncPacket {
    const captures = this.config.mode === 'capture_point'
      ? this.capture.zones.map((z) => ({
        id: z.id,
        owner: z.owner,
        progress: z.progress,
        contested: z.contested,
        actor: z.actor,
      }))
      : undefined;
    return {
      timeSec: this.hooks.run.matchTime,
      teamScore: { ...this.teamScore },
      teamKills: { ...this.teamKills },
      captures,
      ended,
      reason: this.lastResult?.reason,
      winnerName: this.lastResult?.winnerName ?? null,
      winnerTeam: this.lastResult?.winnerTeam ?? null,
      winnerId: this.winnerNetworkId,
      // Снимок пула: 2 Гц × N танков — копия строк дёшева и безопасна.
      players: this._netRows.map((r) => ({ ...r })),
    };
  }
}
