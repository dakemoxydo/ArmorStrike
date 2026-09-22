import type { GameApi } from '../game/GameApi';
import type { HudSnapshot } from '../game/types';

/**
 * Pull a HUD snapshot once per render (getHud is a synchronous getter).
 * Намеренно без мемоизации: PauseMenu показывает живой счёт/время при каждой
 * перерисовке (pauseChanged и т.п.), кэш по `game` протух бы.
 */
export function useHudSnapshot(game: GameApi | null): HudSnapshot | null {
  return game ? game.getHud() : null;
}
