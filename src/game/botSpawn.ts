// ===== Контракт записи бота в ростере =====
// Legacy wave spawnBot удалён (P0); боты создаются в match/rosterSpawn.ts,
// spawn-таблицы живут в match/spawnPoints.ts.
import type { AIController } from './AI';
import type { TankEntity } from './Tank';

export interface BotEntry {
  tank: TankEntity;
  ai: AIController;
  /** CP: bot prioritizes capture zones (P5). */
  objectiveDuty?: boolean;
}
