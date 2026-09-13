import { expect, it, vi, describe } from 'vitest';
import { MATCH_MODE_IDS } from '../game/match/matchConfig';
import { MAP_IDS } from '../game/maps/mapCatalog';
import { pickQuickMatch } from '../game/quickMatch';

describe('pickQuickMatch', () => {
  it('always returns a valid mode + map pair', () => {
    for (let i = 0; i < 200; i++) {
      const pick = pickQuickMatch();
      expect(MATCH_MODE_IDS).toContain(pick.mode);
      expect(MAP_IDS).toContain(pick.mapId);
    }
  });

  it('rand=0 picks first entries, rand just under 1 picks last (bounds)', () => {
    expect(pickQuickMatch(() => 0)).toEqual({
      mode: MATCH_MODE_IDS[0],
      mapId: MAP_IDS[0],
    });
    expect(pickQuickMatch(() => 0.999999)).toEqual({
      mode: MATCH_MODE_IDS[MATCH_MODE_IDS.length - 1],
      mapId: MAP_IDS[MAP_IDS.length - 1],
    });
  });

  it('consumes the injected rand in order: mode first, then map', () => {
    const rand = vi.fn().mockReturnValueOnce(0.9).mockReturnValueOnce(0.2);
    const pick = pickQuickMatch(rand);
    expect(pick.mode).toBe(MATCH_MODE_IDS[2]); // capture_point
    expect(pick.mapId).toBe(MAP_IDS[0]); // factory
    expect(rand).toHaveBeenCalledTimes(2);
  });
});
