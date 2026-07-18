// ===== Модель HUD: снапшот состояния для UI, миникарта динамика/статика =====
import type { Arena } from './Arena';
import type { AudioPort } from './ports/AudioPort';
import type { PlayerController } from './PlayerController';
import type { RunState } from './RunState';
import type { WaveManager } from './WaveManager';
import type { HudUnit } from './tank/simPorts';
import { HULLS, TURRETS } from '../core/catalog';
import type { HullId, TurretId } from '../core/catalog';

import type { HudSnapshot, MinimapDynamic, MinimapStatic, ScoreRow } from './types';
import { getWeaponMeta } from '../core/WeaponCatalog';

export class HudModel {
  private _static: MinimapStatic[] = [];
  private _byId = new Map<number, MinimapStatic>();
  private _emptyBoard: ScoreRow[] = [];

  constructor(private deps: { run: RunState; audio: AudioPort; waves: WaveManager; input: PlayerController }) {}

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

  getStatic(): MinimapStatic[] { return this._static; }
  getByIdMap(): Map<number, MinimapStatic> { return this._byId; }

  fillDynamics(tanks: HudUnit[], out: MinimapDynamic[]): MinimapDynamic[] {
    out.length = 0;
    for (const t of tanks) {
      if (!t.alive) continue;
      out.push({ x: t.position.x, z: t.position.z, yaw: t.yaw, turret: t.yaw + t.turretYaw, isPlayer: t.isPlayer });
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
    }) | null,
    tanks: HudUnit[],
    includeScoreboard = false,
  ): HudSnapshot {
    const { run, audio, waves, input } = this.deps;

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
          };
        })
        .sort((a, b) => (b.isPlayer ? 1 : 0) - (a.isPlayer ? 1 : 0) || b.hpFrac - a.hpFrac)
      : this._emptyBoard;

    const wmeta = getWeaponMeta(run.currentTurret);

    return {
      mode: run.mode, paused: run.paused, intermission: run.intermission,
      health: player?.health ?? HULLS[run.currentHull].maxHealth,
      maxHealth: player?.maxHealth ?? HULLS[run.currentHull].maxHealth,
      ammo, magazine, reloading, reloadProgress, isCharging,
      boost: player?.boostEnergy ?? 1,
      score: run.score, kills: run.kills, wave: waves.wave,
      botsAlive: waves.bots.filter((b) => b.tank.alive).length,
      alive: player?.alive ?? false, timeSec: run.matchTime,
      muted: audio.muted,
      hullId: run.currentHull, turretId: run.currentTurret,
      weaponName: wmeta.name, weaponLabel: wmeta.label,
      weaponColor: wmeta.color, weaponAccentClass: wmeta.accentClass,
      showScore, scoreboard: board,
    };
  }
}
