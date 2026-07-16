// ===== Система синхронизации состояния блоков арены с миникартой =====
import type { Arena } from '../../Arena';

export const MinimapSystem = {
  /** Помечает разрушенные блоки неживыми на миникарте за O(n) по id. */
  sync(arena: Arena, mmById: Map<number, { alive: boolean }>) {
    for (const c of arena.colliders) {
      if (c.kind !== 'block') continue;
      const s = mmById.get(c.id);
      if (s) s.alive = c.active;
    }
  },
};
