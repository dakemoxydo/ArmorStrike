import type { AimBody } from '../../tank/simPorts';
import { clamp, wrapAngle } from '../physics';

export const TankAimSystem = {
  updateOne(t: AimBody, dt: number) {
    const p = t.params;

    // --- Горизонт: поворот башни к aimYaw относительно корпуса ---
    const rel = wrapAngle(t.aimYaw - t.yaw);
    const diff = wrapAngle(rel - t.turretYaw);
    const maxStep = p.turretSpeed * dt;
    t.turretYaw += clamp(diff, -maxStep, maxStep);

    // --- Вертикаль: автонаводка ствола по высоте цели (УВН башни) ---
    // Целевой тангаж θ = atan2(dy, distXZ), зажатый сектором [−depression, +elevation].
    // Без цели θ = 0 (горизонт). barrelPitch дотягивается линейным шагом pitchSpeed*dt,
    // без аллокаций (скалярная арифметика). Вход (dy/distXZ/locked) готовит стадия,
    // разрешившая залоченную цель (AimHighlighter игрока / focus ИИ).
    const pitchSpeed = p.pitchSpeed ?? 0;
    if (pitchSpeed <= 0) {
      // У башни нет УВН (тестовый двойник без параметров) — держим горизонт.
      t.barrelPitch = 0;
      return;
    }
    const elevation = p.elevationAngle ?? 0;
    const depression = p.depressionAngle ?? 0;
    const targetPitch = t.pitchLocked
      ? clamp(Math.atan2(t.pitchDy, t.pitchDistXZ), -depression, elevation)
      : 0;
    const step = pitchSpeed * dt;
    t.barrelPitch += clamp(targetPitch - t.barrelPitch, -step, step);
  },
};
