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

  /**
   * Проверяет и выполняет респаун всех погибших танков.
   * Танки, респавнящиеся в один кадр, не делят одну точку: каждый следующий
   * берёт пулем, исключая уже занятые в этом прогоне (dead-дедуп).
   */
  update(_dt: number, tanks: TankEntity[], respawnDelaySec: number, spawnInvulnSec: number) {
    const claimed = new Set<number>();
    for (const t of tanks) {
      if (canRespawn(t, respawnDelaySec)) {
        this.respawnTank(t, tanks, spawnInvulnSec, claimed);
      }
    }
  }

  private respawnTank(
    tank: TankEntity,
    tanks: TankEntity[],
    spawnInvulnSec: number,
    claimed: Set<number>,
  ) {
    // J9: FFA_FALLBACK удалён — pool статически непустой (spawnPoints.ts),
    // а его заводские ±128 к тому же устарели после перестройки карт.
    const points = respawnPoolFor(tank.teamId as TeamId);
    // Threats for point scoring: enemies only (same threat model as before).
    const threats: { x: number; z: number }[] = [];
    for (const t of tanks) {
      if (!t.alive || t.id === tank.id || !isEnemy(tank, t)) continue;
      threats.push({ x: t.position.x, z: t.position.z });
    }

    const [x, z, pickedIdx] = pickRespawnPoint(points, threats, Math.random, claimed);
    claimed.add(pickedIdx);
    const yaw = Math.atan2(-x, -z);

    applyRespawnCombat(tank, spawnInvulnSec);
    tank.weapon?.onRespawn?.();
    tank.visual.group.position.set(x, 0, z);
    tank.yaw = yaw;
    tank.aimYaw = yaw;
    tank.turretYaw = 0;
    tank.barrelPitch = 0;
    tank.pitchLocked = false;
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

/** Undo death animation greying / hide ring. */
function restoreDeathVisuals(tank: TankEntity) {
  const { bodyMats, bodyBaseColors } = tank.visual;
  for (let i = 0; i < bodyMats.length; i++) {
    // Возврат к базе материала, а не к белому (иначе теряется accent).
    bodyMats[i].color.setHex(bodyBaseColors[i] ?? 0xffffff);
    bodyMats[i].emissive.setScalar(0);
  }
  tank.visual.ring.visible = true;
  tank.visual.barrelGroup.rotation.x = 0;
}
