// ===== Модель HUD: снапшот состояния для UI, миникарта динамика/статика =====
import type { Arena } from './Arena';
import type { AudioPort } from './ports/AudioPort';
import type { PlayerController } from './PlayerController';
import type { RunState } from './RunState';
import type { BotRoster } from './BotRoster';
import type { MatchRuntime } from './match/MatchRuntime';
import type { HudUnit } from './tank/simPorts';
import { HULLS, TURRETS } from '../core/catalog';
import type { HullId, TurretId } from '../core/catalog';

import type { CaptureHudPoint, HudSnapshot, MinimapDynamic, MinimapStatic, ScoreRow } from './types';
import { getWeaponMeta } from '../core/WeaponCatalog';
import { isAlly } from './match/teams';
import type { TeamId } from './match/matchTypes';

export class HudModel {
  private _static: MinimapStatic[] = [];
  private _byId = new Map<number, MinimapStatic>();
  private _emptyBoard: ScoreRow[] = [];

  constructor(private deps: {
    run: RunState;
    audio: AudioPort;
    bots: BotRoster;
    input: PlayerController;
    /** Lazy: match wired after GameSimulation exists. */
    getMatch: () => MatchRuntime | null;
  }) {}

  buildMinimap(arena: Arena) {
    for (const c of arena.colliders) {
      const entry: MinimapStatic = {
        id: c.id, x: (c.minX + c.maxX) / 2, z: (c.minZ + c.maxZ) / 2,
        w: c.maxX - c.minX, d: c.maxZ - c.minZ,
        kind: c.kind, alive: c.kind !== 'block',
      };
      this._static.push(entry);
      this._byId.set(c.id, entry);
    }
  }

  /** Clear and rebuild static minimap after arena map switch. */
  rebuildMinimap(arena: Arena) {
    this._static.length = 0;
    this._byId.clear();
    this.buildMinimap(arena);
  }

  getStatic(): MinimapStatic[] { return this._static; }
  getByIdMap(): Map<number, MinimapStatic> { return this._byId; }

  fillDynamics(tanks: HudUnit[], out: MinimapDynamic[]): MinimapDynamic[] {
    out.length = 0;
    const player = tanks.find((t) => t.isPlayer);
    const selfTeam = (player?.teamId ?? null) as TeamId;
    const selfId = player?.id ?? -1;
    for (const t of tanks) {
      if (!t.alive) continue;
      let relation: MinimapDynamic['relation'] = 'enemy';
      if (t.isPlayer || t.id === selfId) {
        relation = 'self';
      } else if (player && isAlly(
        { id: selfId, teamId: selfTeam },
        { id: t.id ?? 0, teamId: (t.teamId ?? null) as TeamId },
      )) {
        relation = 'ally';
      }
      out.push({
        x: t.position.x,
        z: t.position.z,
        yaw: t.yaw,
        turret: t.yaw + t.turretYaw,
        isPlayer: t.isPlayer,
        relation,
      });
    }
    return out;
  }

  getHud(
    player: (HudUnit & {
      weapon?: { getAmmoState(): {
        ammo: number; magazine: number; reloading: boolean;
        reloadProgress: number; isCharging: boolean;
      } };
      boostEnergy?: number;
      kills?: number;
      deaths?: number;
    }) | null,
    tanks: (HudUnit & { kills?: number; deaths?: number })[],
    includeScoreboard = false,
  ): HudSnapshot {
    const { run, audio, bots, input } = this.deps;
    const match = this.deps.getMatch();

    const ammoState = player?.weapon?.getAmmoState();
    const ammo = ammoState?.ammo ?? 0;
    const magazine = ammoState?.magazine ?? 0;
    const reloading = ammoState?.reloading ?? false;
    const reloadProgress = ammoState?.reloadProgress ?? 0;
    const isCharging = ammoState?.isCharging ?? false;

    const showScore = run.mode === 'playing' && input.scoreHeld && !run.paused;
    const board: ScoreRow[] = includeScoreboard
      ? tanks
        .map((t) => {
          const hullId = t.hullId as HullId | undefined;
          const turretId = t.turretId as TurretId | undefined;
          return {
            name: t.name,
            hull: hullId ? HULLS[hullId].name : '-',
            turret: turretId ? TURRETS[turretId].name : '-',
            weapon: t.params.weaponType ?? '-',
            weaponName: turretId ? getWeaponMeta(turretId).name : '-',
            hpFrac: t.maxHealth > 0 ? t.health / t.maxHealth : 0,
            isPlayer: t.isPlayer,
            alive: t.alive,
            kills: t.kills ?? 0,
            deaths: t.deaths ?? 0,
            teamId: (t.teamId ?? null) as TeamId,
          };
        })
        .sort((a, b) => {
          // Team modes: Alpha first, then Bravo; within team by kills.
          if (a.teamId && b.teamId && a.teamId !== b.teamId) {
            return a.teamId === 'alpha' ? -1 : 1;
          }
          return b.kills - a.kills || (b.isPlayer ? 1 : 0) - (a.isPlayer ? 1 : 0);
        })
      : this._emptyBoard;

    const wmeta = getWeaponMeta(run.currentTurret);
    const cfg = match?.config;
    const mode = cfg?.mode ?? 'deathmatch';
    let winTarget = cfg?.winKills ?? 30;
    if (mode === 'team_deathmatch') winTarget = cfg?.winTeamKills ?? 100;
    if (mode === 'capture_point') winTarget = cfg?.winTeamScore ?? 1000;

    return {
      mode: run.mode, paused: run.paused,
      health: player?.health ?? HULLS[run.currentHull].maxHealth,
      maxHealth: player?.maxHealth ?? HULLS[run.currentHull].maxHealth,
      ammo, magazine, reloading, reloadProgress, isCharging,
      boost: player?.boostEnergy ?? 1,
      score: run.score,
      kills: player?.kills ?? run.kills,
      deaths: player?.deaths ?? 0,
      botsAlive: bots.bots.filter((b) => b.tank.alive).length,
      alive: player?.alive ?? false, timeSec: run.matchTime,
      muted: audio.muted,
      hullId: run.currentHull, turretId: run.currentTurret,
      weaponName: wmeta.name, weaponLabel: wmeta.label,
      weaponColor: wmeta.color, weaponAccentClass: wmeta.accentClass,
      showScore, scoreboard: board,
      matchMode: mode,
      winTarget,
      timeLimitSec: cfg?.timeLimitSec ?? 720,
      teamKillsAlpha: match?.teamKills.alpha ?? 0,
      teamKillsBravo: match?.teamKills.bravo ?? 0,
      teamScoreAlpha: match?.teamScore.alpha ?? 0,
      teamScoreBravo: match?.teamScore.bravo ?? 0,
      capturePoints: captureHudPoints(match),
    };
  }
}

function captureHudPoints(match: MatchRuntime | null): CaptureHudPoint[] {
  if (!match || match.mode !== 'capture_point') return [];
  return match.getCaptureZones().map((z) => ({
    id: z.id,
    x: z.x,
    z: z.z,
    owner: z.owner,
    progress: z.progress,
    contested: z.contested,
  }));
}
