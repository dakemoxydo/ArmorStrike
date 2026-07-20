// ===== Runtime матча: kills, respawn, win end, capture (CP) =====
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
import type { MatchConfig, MatchModeId, MatchResult, TeamId } from './matchTypes';
import { isEnemy } from './teams';
import { applyRespawnCombat, canRespawn } from './respawn';
import { evaluateMatchEnd } from './winConditions';
import { pickRespawnPoint } from './spawnPoints';
import { respawnPoolFor } from './rosterSpawn';
import { zonesForMap } from './captureAnchors';
import {
  countPresenceInZone,
  scoreDeltaFromZones,
  stepCaptureZone,
  type CaptureZoneState,
} from './captureLogic';
import { CaptureMarkers } from './CaptureMarkers';

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
  /** Active CP zones (empty outside capture_point). */
  zones: CaptureZoneState[] = [];
  private markers: CaptureMarkers | null = null;

  constructor(private hooks: MatchRuntimeHooks) {}

  get mode(): MatchModeId {
    return this.config.mode;
  }

  /** Snapshot for HUD/minimap (read-only view). */
  getCaptureZones(): readonly CaptureZoneState[] {
    return this.zones;
  }

  disposeVisuals() {
    this.markers?.dispose();
    this.markers = null;
    this.zones = [];
  }

  reset(mode: MatchModeId = DEFAULT_MATCH_MODE, opts: MatchResetOpts = {}) {
    this.disposeVisuals();
    this.config = configForMode(mode);
    this.ended = false;
    this.teamKills = { alpha: 0, bravo: 0 };
    this.teamScore = { alpha: 0, bravo: 0 };
    this.lastResult = null;

    if (mode === 'capture_point' && opts.mapId && opts.scene) {
      this.zones = zonesForMap(opts.mapId);
      this.markers = new CaptureMarkers(opts.scene);
      this.markers.mount(this.zones);
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

    for (const t of tanks) {
      if (canRespawn(t, this.config.respawnDelaySec)) {
        this.respawnTank(t, tanks);
      }
    }

    // Keep shared death cam cell in sync with player.combat.deathT
    if (player && !player.alive) {
      this.hooks.setDeathT(player.deathT);
    } else if (player?.alive && this.hooks.getDeathT() >= 0) {
      this.hooks.setDeathT(-1);
    }

    if (this.config.mode === 'capture_point' && this.zones.length > 0) {
      this.updateCapture(dt, tanks);
    }

    const personals = tanks.map((t) => ({
      id: t.id,
      name: t.name,
      kills: t.kills,
      isPlayer: t.isPlayer,
    }));

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
        teamKills: { ...this.teamKills },
        teamScore: { ...this.teamScore },
        matchTimeSec: this.hooks.run.matchTime,
      };
      this.ended = true;
      this.lastResult = result;
      this.hooks.requestMatchOver(result);
    }
  }

  private updateCapture(dt: number, tanks: TankEntity[]) {
    const next: CaptureZoneState[] = [];
    for (const z of this.zones) {
      const presence = countPresenceInZone(z, tanks);
      next.push(stepCaptureZone(z, presence, dt));
    }
    this.zones = next;

    const delta = scoreDeltaFromZones(this.zones, dt);
    this.teamScore.alpha += delta.alpha;
    this.teamScore.bravo += delta.bravo;

    this.markers?.sync(this.zones);
  }

  private respawnTank(tank: TankEntity, tanks: TankEntity[]) {
    const pool = respawnPoolFor(tank.teamId as TeamId);
    // Prefer rosterSpawn helper (same pools)
    const points = pool.length ? pool : FFA_fallback();
    const threats = tanks
      .filter((t) => t.alive && t.id !== tank.id && isEnemy(tank, t))
      .map((t) => ({ x: t.position.x, z: t.position.z }));

    const [x, z] = pickRespawnPoint(points, threats);
    const yaw = Math.atan2(-x, -z);

    applyRespawnCombat(tank, this.config.spawnInvulnSec);
    tank.visual.group.position.set(x, 0, z);
    tank.yaw = yaw;
    tank.aimYaw = yaw;
    tank.turretYaw = 0;
    tank.knockback.set(0, 0, 0);
    restoreDeathVisuals(tank);

    if (tank.isPlayer) {
      this.hooks.setDeathT(-1);
      this.hooks.run.paused = false;
      this.hooks.input.enabled = true;
      this.hooks.audio.startEngine();
      this.hooks.input.requestLock();
    }
  }
}

function FFA_fallback(): [number, number][] {
  return [[0, -120], [128, 128], [-128, 128], [128, -128], [-128, -128]];
}

/** Undo death animation greying / hide ring. */
function restoreDeathVisuals(tank: TankEntity) {
  for (const m of tank.visual.bodyMats) {
    m.color.setRGB(1, 1, 1);
    m.emissive.setScalar(0);
  }
  tank.visual.ring.visible = true;
  tank.visual.barrelGroup.rotation.x = 0;
}
