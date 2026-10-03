// ===== Контроллер респауна: точка спавна, восстановление состояния, визуалы =====
// Извлечено из MatchRuntime для разделения ответственности (SRP).
// MatchRuntime делегирует сюда respawn-логику; поведение идентично.
import type { TankEntity } from '../Tank';
import type { AudioPort } from '../ports/AudioPort';
import type { PlayerController } from '../PlayerController';
import type { RunState } from '../RunState';
import type { TeamId } from './matchTypes';
import { isEnemy } from './teams';
import { applyRespawnCombat, canRespawn, restoreRespawnVisuals } from './respawn';
import { pickRespawnPoint } from './spawnPoints';
import { respawnPoolFor } from './rosterSpawn';

export interface RespawnHooks {
  run: RunState;
  audio: AudioPort;
  input: PlayerController;
  setDeathT: (v: number) => void;
}

/** Строка пула угроз для скоринга точки респауна (мутируется на месте). */
interface ThreatPoint {
  x: number;
  z: number;
}

export class RespawnController {
  /**
   * Занятые в текущем прогоне точки респауна — пул на весь матч. Раньше новый
   * `Set` создавался в каждом `update`, а `MatchRuntime.update` зовёт его
   * безусловно каждый тик боя (60/с), даже когда никто не мёртв.
   * Инвариант: `clear()` — первая операция `update` (ранних выходов нет), а
   * читается множество только в цикле ниже, поэтому в следующий кадр мусор
   * не попадает даже если в `update` добавят guard.
   */
  private readonly claimed = new Set<number>();
  /**
   * Точки угроз для скоринга спавна (только враги) — переиспользуемый буфер:
   * раньше массив и по объекту на врага создавались при каждом респавне.
   * Длина схлопывается под фактическое число врагов, строки мутируются
   * на месте (тот же приём, что `MatchRuntime._personals`).
   */
  private readonly threats: ThreatPoint[] = [];

  constructor(private hooks: RespawnHooks) {}

  /**
   * Проверяет и выполняет респаун всех погибших танков.
   * Танки, респавнящиеся в один кадр, не делят одну точку: каждый следующий
   * берёт пулем, исключая уже занятые в этом прогоне (dead-дедуп).
   */
  update(_dt: number, tanks: TankEntity[], respawnDelaySec: number, spawnInvulnSec: number) {
    const claimed = this.claimed;
    claimed.clear();
    for (const t of tanks) {
      if (t.isRemote) continue;
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
    const threats = this.threats;
    let n = 0;
    for (const t of tanks) {
      if (!t.alive || t.id === tank.id || !isEnemy(tank, t)) continue;
      const row = threats[n] ?? (threats[n] = { x: 0, z: 0 });
      row.x = t.position.x;
      row.z = t.position.z;
      n++;
    }
    threats.length = n;

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
    restoreRespawnVisuals(tank);

    if (tank.isPlayer) {
      this.hooks.setDeathT(-1);
      this.hooks.run.paused = false;
      this.hooks.input.enabled = true;
      this.hooks.audio.startEngine();
      this.hooks.input.requestLock();
    }
  }
}


