import { useMemo } from 'react';
import type { GameApi } from '../game/GameApi';
import { HULLS, TURRETS } from '../core/catalog';

/**
 * Derive current hull/turret defs + claimable quest count from GameApi.
 * Memoized on `game` identity + `economyVersion` (garageChanged bump): credit
 * and quest payloads mutate in place, so identity alone would go stale.
 */
export function useGameDerivedStats(game: GameApi | null, economyVersion: number) {
  return useMemo(() => {
    // garageChanged-bump: тело не читает счётчик, но пересчёт обязан слушать его.
    void economyVersion;
    const currHull = HULLS[game?.currentHull ?? 'hunter'];
    const currTurret = TURRETS[game?.currentTurret ?? 'railgun'];
    const claimableQuestsCount =
      game?.quests?.filter((q) => q.current >= q.target && !q.claimed).length ?? 0;
    return { currHull, currTurret, claimableQuestsCount };
  }, [game, economyVersion]);
}
