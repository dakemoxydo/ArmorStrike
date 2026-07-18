import { describe, it, expect } from 'vitest';
import { staticLayerKey, MAP_SIZE, MAP_HALF } from '../components/hud/minimapDraw';
import type { MinimapStatic } from '../game/types';

function entry(
  partial: Partial<MinimapStatic> & Pick<MinimapStatic, 'id' | 'alive'>,
): MinimapStatic {
  return {
    x: 0, z: 0, w: 2, d: 2, kind: 'block',
    ...partial,
  };
}

describe('minimapDraw static layer key (shipped)', () => {
  it('exports map constants used by radar canvas', () => {
    expect(MAP_SIZE).toBe(172);
    expect(MAP_HALF).toBe(156);
  });

  it('staticLayerKey is stable for identical static lists', () => {
    const a: MinimapStatic[] = [
      entry({ id: 1, alive: true, kind: 'wall' }),
      entry({ id: 2, alive: true, kind: 'block' }),
    ];
    const b: MinimapStatic[] = [
      entry({ id: 1, alive: true, kind: 'wall' }),
      entry({ id: 2, alive: true, kind: 'block' }),
    ];
    expect(staticLayerKey(a)).toBe(staticLayerKey(b));
  });

  it('staticLayerKey changes when a block dies (forces static layer rebuild)', () => {
    const alive: MinimapStatic[] = [
      entry({ id: 1, alive: true }),
      entry({ id: 2, alive: true }),
    ];
    const dead: MinimapStatic[] = [
      entry({ id: 1, alive: true }),
      entry({ id: 2, alive: false }),
    ];
    expect(staticLayerKey(alive)).not.toBe(staticLayerKey(dead));
  });

  it('staticLayerKey changes when collider count changes', () => {
    const short = [entry({ id: 1, alive: true })];
    const long = [entry({ id: 1, alive: true }), entry({ id: 2, alive: true })];
    expect(staticLayerKey(short)).not.toBe(staticLayerKey(long));
  });
});
