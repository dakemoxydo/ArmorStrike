// ===== Состояние забега: режим, очки, выбор корпуса/башни, сохранение прогресса =====
import type { GameMode } from './Game';
import { HULLS, TURRETS } from './constants';
import type { HullId, TurretId } from './constants';

const LS_KEY = 'as2_loadout';

export class RunState {
  mode: GameMode = 'menu';
  paused = false;
  score = 0;
  kills = 0;
  matchTime = 0;
  currentHull: HullId = 'hunter';
  currentTurret: TurretId = 'railgun';

  /** Загрузить выбор корпуса/башни из предыдущих сессий. */
  load() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const o = JSON.parse(raw);
        if (o && HULLS[o.hullId as HullId] && TURRETS[o.turretId as TurretId]) {
          this.currentHull = o.hullId;
          this.currentTurret = o.turretId;
        }
      }
    } catch { /* ignore */ }
  }

  save() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ hullId: this.currentHull, turretId: this.currentTurret }));
    } catch { /* ignore */ }
  }

  /** Сброс счёта/волн при старте нового матча. */
  resetRun() {
    this.score = 0;
    this.kills = 0;
    this.matchTime = 0;
  }
}
