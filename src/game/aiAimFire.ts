// ===== ИИ: наведение башни и решение стрелять (без смены логики) =====
import { clamp, segmentHitsCircle, wrapAngle } from './engine/physics';
import { PROJECTILE } from './constants';
import { aimTolerance } from './aiTuning';
import type { AIBody, AITarget, AIPersona } from './AI';
import type { WeaponType } from '../core/catalog';

export interface AimFireState {
  aimNoise: number;
  aimNoiseT: number;
  reactT: number;
  scanT: number;
  wantsFire: boolean;
}

/**
 * Шаг 12: наведение башни и огонь.
 * Мутирует aim-state и tank.aimYaw; выставляет wantsFire.
 */
export function updateTurretAndFire(
  state: AimFireState,
  dt: number,
  engage: boolean,
  canSee: boolean,
  dist: number,
  fireRange: number,
  aimError: number,
  persona: AIPersona,
  tank: AIBody,
  player: AITarget,
  bots: AIBody[],
): void {
  state.wantsFire = false;
  if (engage && player.alive) {
    const w = tank.params.weaponType as WeaponType | undefined;
    const lead = w === 'cannon'
      ? clamp(dist / PROJECTILE.speed, 0, 1.4) * persona.lead
      : 0;
    const ax = player.position.x + player.vel.x * lead;
    const az = player.position.z + player.vel.z * lead;
    // M11: re-roll aim noise on a short timer, not every frame (servo could never settle).
    state.aimNoiseT -= dt;
    if (state.aimNoiseT <= 0) {
      state.aimNoise = (Math.random() - 0.5) * aimError * 2;
      state.aimNoiseT = 0.35 + Math.random() * 0.25;
    }
    tank.aimYaw = Math.atan2(ax - tank.position.x, az - tank.position.z) + state.aimNoise;

    const aimTol = aimTolerance(w ?? 'cannon');
    if (canSee && state.reactT <= 0 && dist < fireRange && tank.fireTimer <= 0) {
      const turretAbs = tank.yaw + tank.turretYaw;
      const aimed = Math.abs(wrapAngle(tank.aimYaw - turretAbs)) < aimTol;
      let friendlyInLine = false;
      for (const b of bots) {
        if (b === tank || !b.alive) continue;
        if (segmentHitsCircle(
          tank.position.x, tank.position.z, player.position.x, player.position.z,
          b.position.x, b.position.z, b.radius + 0.6,
        )) { friendlyInLine = true; break; }
      }
      if (aimed && !friendlyInLine) state.wantsFire = true;
    }
  } else {
    state.scanT += dt * 0.7;
    tank.aimYaw = tank.yaw + Math.sin(state.scanT) * 0.9;
  }
}
