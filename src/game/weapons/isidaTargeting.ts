// ===== «Изида»: чистая логика автозахвата нано-луча (без Three-объектов) =====
// Канон Tanki Online: луч сам «липнет» к цели внутри конуса 20°, одиночная цель,
// блокируется препятствиями и корпусами танков. Приоритет — враг, союзник —
// только если врага в конусе нет и у союзника есть реальный дефицит HP.
// Семантика фракций совпадает с match/teams (FFA-нули враждебны всем), но
// порт допускает teamId === undefined (как TankLike/CombatPeer), поэтому
// отношения проверены локально — тот же приём, что isOpponent у Гаусса.
import type { Collider } from '../engine/physics';
import { losClear } from '../engine/physics';
import { WEAPON_TUNING } from '../../core/catalog';

export interface BeamFactional {
  id: number;
  teamId?: string | null;
}

export interface BeamPeer extends BeamFactional {
  alive: boolean;
  position: { x: number; z: number };
  health: number;
  maxHealth: number;
}

export interface BeamCone {
  x: number;
  z: number;
  dirX: number;
  dirZ: number;
  /** cos(полуугла) — сравнение через dot без acos. */
  halfCos: number;
  range: number;
}

export type BeamTargetMode = 'attack' | 'heal';

export interface BeamAcquisition<T extends BeamPeer = BeamPeer> {
  peer: T;
  mode: BeamTargetMode;
}

export function isBeamHostile(a: BeamFactional, b: BeamFactional): boolean {
  if (a.id === b.id) return false;
  const ta = a.teamId ?? null;
  const tb = b.teamId ?? null;
  if (ta !== null && tb !== null) return ta !== tb;
  return true;
}

export function isBeamAllied(a: BeamFactional, b: BeamFactional): boolean {
  const ta = a.teamId ?? null;
  const tb = b.teamId ?? null;
  if (ta === null || tb === null) return false;
  return ta === tb && a.id !== b.id;
}

/**
 * Кандидат годится как цель заданного режима: жив, во фракции, в конусе,
 * в дистанции, с чистой прямой видимостью (луч рвётся о коллайдеры и чужие
 * корпуса — losClear по XZ, как у Гаусса/Рельсы).
 * Союзник additionally должен иметь дефицит HP (лечить полного — мусор-лок).
 */
export function isBeamCandidate<T extends BeamPeer>(
  peer: T,
  owner: BeamFactional,
  cone: BeamCone,
  colliders: readonly Collider[],
  mode: BeamTargetMode,
): boolean {
  if (!peer.alive) return false;
  if (mode === 'heal') {
    if (!isBeamAllied(owner, peer)) return false;
    if (peer.health >= peer.maxHealth * WEAPON_TUNING.isida.healHpFrac) return false;
  } else if (!isBeamHostile(owner, peer)) {
    return false;
  }
  const dx = peer.position.x - cone.x;
  const dz = peer.position.z - cone.z;
  const dist = Math.hypot(dx, dz);
  if (dist <= 0.001 || dist > cone.range) return false;
  const dot = (dx * cone.dirX + dz * cone.dirZ) / dist;
  if (dot < cone.halfCos) return false;
  return losClear(cone.x, cone.z, peer.position.x, peer.position.z, colliders);
}

/**
 * Захват: одна цель, враг приоритетнее союзника; внутри фракции — ближайшая к
 * центру конуса (max dot). Луч, упёршийся в спину союзника, канонно рвётся о
 * его корпус: losClear с муззла до врага за спиной союзника не проходит только
 * если союзник реально перекрывает линию (AABB), т.е. поведение «союзник щит»
 * получается само собой на стенах, но не на открытых позициях.
 */
export function acquireIsidaTarget<T extends BeamPeer>(
  peers: readonly T[],
  owner: BeamFactional,
  cone: BeamCone,
  colliders: readonly Collider[],
): BeamAcquisition<T> | null {
  let enemy: T | null = null;
  let enemyDot = -Infinity;
  let ally: T | null = null;
  let allyDot = -Infinity;
  for (const p of peers) {
    const dx = p.position.x - cone.x;
    const dz = p.position.z - cone.z;
    const dist = Math.hypot(dx, dz);
    if (!p.alive || dist <= 0.001 || dist > cone.range) continue;
    const dot = (dx * cone.dirX + dz * cone.dirZ) / dist;
    if (dot < cone.halfCos) continue;
    if (isBeamHostile(owner, p)) {
      if (dot > enemyDot && losClear(cone.x, cone.z, p.position.x, p.position.z, colliders)) {
        enemy = p;
        enemyDot = dot;
      }
    } else if (
      isBeamAllied(owner, p)
      && p.health < p.maxHealth * WEAPON_TUNING.isida.healHpFrac
      && dot > allyDot
      && losClear(cone.x, cone.z, p.position.x, p.position.z, colliders)
    ) {
      ally = p;
      allyDot = dot;
    }
  }
  if (enemy) return { peer: enemy, mode: 'attack' };
  if (ally) return { peer: ally, mode: 'heal' };
  return null;
}
