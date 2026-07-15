// ===== Система обновления самих танков (движение, физика корпуса, таймеры) =====
import type { TankEntity } from '../Tank';

export const TankSystem = {
  update(tanks: TankEntity[], dt: number) {
    for (const t of tanks) t.update(dt);
  },
};
