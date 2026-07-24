// ===== Контроллер респауна: точка спавна, восстановление состояния, визуалы =====
// Извлечено из MatchRuntime для разделения ответственности (SRP).
// MatchRuntime делегирует сюда respawn-логику; поведение идентично.
import type { TankEntity } from '../Tank';
import type { AudioPort } from '../ports/AudioPort';
import type { PlayerController } from '../PlayerController';
import type { RunState } from '../RunState';
import type { TeamId } from './matchTypes';
import { isEnemy } from './teams';
import { applyRespawnCombat, canRespawn } from './respawn';
import { pickRespawnPoint } from './spawnPoints';
import { respawnPoolFor } from './rosterSpawn';

export interface RespawnHooks {
  run: RunState;
  audio: AudioPort;
  input: PlayerController;
  setDeathT: (v: number) => void;
}

export class RespawnController {
  constructor(private hooks: RespawnHooks) {}

  /** Проверяет и выполняет респаун всех погибших танков. */
  update(_dt: number, tanks: TankEntity[], respawnDelaySec: number, spawnInvulnSec: number) {
    for (const t of tanks) {
      if (canRespawn(t, respawnDelaySec)) {
        this.respawnTank(t, tanks, spawnInvulnSec);
      }
    }
  }

  private respawnTank(tank: TankEntity, tanks: TankEntity[], spawnInvulnSec: number) {
    const pool = respawnPoolFor(tank.teamId as TeamId);
    // Prefer rosterSpawn helper (same pools)
    const points = pool.length ? pool : FFA_FALLBACK;
    const threats = tanks
      .filter((t) => t.alive && t.id !== tank.id && isEnemy(tank, t))
      .map((t) => ({ x: t.position.x, z: t.position.z }));

    const [x, z] = pickRespawnPoint(points, threats);
    const yaw = Math.atan2(-x, -z);

    applyRespawnCombat(tank, spawnInvulnSec);
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

const FFA_FALLBACK: [number, number][] = [
  [0, -120], [128, 128], [-128, 128], [128, -128], [-128, -128],
];

/** Undo death animation greying / hide ring. */
function restoreDeathVisuals(tank: TankEntity) {
  for (const m of tank.visual.bodyMats) {
    m.color.setRGB(1, 1, 1);
    m.emissive.setScalar(0);
  }
  tank.visual.ring.visible = true;
  tank.visual.barrelGroup.rotation.x = 0;
}
