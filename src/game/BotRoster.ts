// ===== Roster ботов матча (без волнового lifecycle) =====
// P0: контейнер для AI / nameplates. Спавн и win conditions — P1+.
import type { BotEntry } from './botSpawn';

export type { BotEntry };

/**
 * Список живых/мёртвых ботов текущего матча.
 * Ранее lifecycle жил в WaveManager (волны, intermission, wave bonus).
 */
export class BotRoster {
  bots: BotEntry[] = [];

  reset() {
    this.bots = [];
  }
}
