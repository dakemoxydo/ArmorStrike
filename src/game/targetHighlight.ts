// ===== Подсветка цели в прицеле: чистая логика (без Three.js / без сущностей) =====
// «Враг в прицеле» = узкий конус от направления прицела + дальность оружия +
// прямая видимость (без рентгена сквозь стены). Выбор — цель с наибольшим dot
// (ближайшая к центру прицела). Гистерезис удержания — AimHighlighter.
import type { WeaponType } from '../core/catalog';
import { WEAPON_TUNING } from '../core/catalog';
import type { Collider } from './engine/physics';
import { losClear } from './engine/physics';
import { isEnemy } from './match/teams';
import type { TeamTagged } from './match/teams';
import { TARGET_HIGHLIGHT } from './tuning';

/** Минимальный профиль танка для выбора цели (совпадает с TankEntity структурно). */
export interface AimCandidate extends TeamTagged {
  alive: boolean;
  position: { x: number; z: number };
}

/** Конус «в прицеле» в плоскости XZ. */
export interface AimCone {
  /** Точка обзора (позиция игрока XZ). */
  x: number;
  z: number;
  /** Нормализованное направление прицела (XZ). */
  dirX: number;
  dirZ: number;
  /** cos(полуугла) — сравнение через dot без acos. */
  halfCos: number;
  /** Дальность детекции (дальность оружия). */
  range: number;
}

/**
 * Полуугол конуса «в прицеле»: огнемёт — свой боевой конус (иначе подсветка
 * врала бы: «в прицеле» один, горит другой), пушка/рельса — узкий конус прицела.
 */
export function aimConeRadFor(weaponType?: WeaponType): number {
  if (weaponType === 'flamethrower') return WEAPON_TUNING.flamethrower.coneAngle * 0.5;
  if (weaponType === 'gauss') return WEAPON_TUNING.gauss.lockConeAngle;
  if (weaponType === 'isida') return WEAPON_TUNING.isida.coneHalfAngle;
  return TARGET_HIGHLIGHT.coneRad;
}

/**
 * Враг, ближайший к центру прицела (конус + дальность + LOS), либо null.
 * `self` — игрок: союзники/сам себя отсекает isEnemy. Отсечение по LOS не
 * «сжигает» остальных кандидатов: следующая цель в конусе всё равно выберется.
 */
export function selectAimedEnemy<T extends AimCandidate>(
  tanks: readonly T[],
  self: TeamTagged,
  cone: AimCone,
  colliders: readonly Collider[],
): T | null {
  let best: T | null = null;
  let bestDot = -Infinity;
  for (const t of tanks) {
    if (!t.alive || !isEnemy(self, t)) continue;
    const dx = t.position.x - cone.x;
    const dz = t.position.z - cone.z;
    const dist = Math.hypot(dx, dz);
    if (dist > cone.range || dist < 1e-6) continue;
    const dot = (dx * cone.dirX + dz * cone.dirZ) / dist;
    // Строже: и внутри конуса, и ближе к центру текущего кандидата.
    if (dot < cone.halfCos || dot <= bestDot) continue;
    if (!losClear(cone.x, cone.z, t.position.x, t.position.z, colliders)) continue;
    best = t;
    bestDot = dot;
  }
  return best;
}

/**
 * Выбор цели с гистерезисом удержания (anti-flicker на границе конуса):
 * пока цель находится — она активна; после потери даётся TARGET_HIGHLIGHT.holdSec,
 * но удержание рвётся мгновенно, если цель мертва или пропала прямая видимость
 * (без «рентгена» сквозь стены).
 */
export class AimHighlighter<T extends AimCandidate = AimCandidate> {
  private held: T | null = null;
  private holdT = 0;

  reset(): void {
    this.held = null;
    this.holdT = 0;
  }

  update(
    dt: number,
    tanks: readonly T[],
    self: T,
    cone: AimCone,
    colliders: readonly Collider[],
  ): T | null {
    const found = selectAimedEnemy(tanks, self, cone, colliders);
    if (found) {
      this.held = found;
      this.holdT = TARGET_HIGHLIGHT.holdSec;
      return found;
    }
    const h = this.held;
    if (!h || this.holdT <= 0) {
      this.held = null;
      return null;
    }
    this.holdT -= dt;
    // Держим кольцо только пока цель жива и видима; угол уже не проверяем —
    // в этом смысл гистерезиса.
    if (!h.alive || !losClear(self.position.x, self.position.z, h.position.x, h.position.z, colliders)) {
      this.reset();
      return null;
    }
    if (this.holdT <= 0) {
      this.held = null;
      return null;
    }
    return h;
  }
}
