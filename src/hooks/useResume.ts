import { useCallback } from 'react';
import type { GameApi } from '../game/GameApi';

/**
 * Resume paused game via GameApi.togglePause.
 */
export function useResume(game: GameApi | null): () => void {
  return useCallback(() => {
    if (!game) return;
    game.togglePause();
  }, [game]);
}
