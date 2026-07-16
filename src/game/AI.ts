// ===== ИИ противников: патруль, обнаружение, преследование, огонь =====
import * as THREE from 'three';
import { clamp, losClear, pointInCollider, segmentHitsCircle, wrapAngle } from './engine/physics';
import type { Collider } from './engine/physics';
import type { TankEntity } from './Tank';
import { PROJECTILE } from './constants';

export interface AICtx {
  player: TankEntity;
  bots: TankEntity[];
  colliders: Collider[];
  bounds: number; // половина арены минус отступ
}

/** Индивидуальный «характер» бота — задаёт разнообразие поведения. */
export interface AIPersona {
  aggro: number;  // 0..1 — насколько близко держится и как рвётся в бой
  react: number;  // сек задержки реакции при обнаружении цели
  lead: number;   // множитель упреждения по движущейся цели (0..1.2)
}

export function randomPersona(wave: number): AIPersona {
  return {
    aggro: Math.random(),
    react: Math.max(0.1, 0.15 + Math.random() * 0.35 - wave * 0.02),
    lead: 0.6 + Math.random() * 0.6,
  };
}

const DEFAULT_PERSONA: AIPersona = { aggro: 0.5, react: 0.25, lead: 0.9 };

type AIState = 'patrol' | 'engage';

export type WeaponType = 'railgun' | 'flamethrower' | 'cannon';

/** Чистые хелперы решений ИИ — без Three.js, покрываемы unit-тестами. */

/** Предпочтительная дистанция боя (по оружию и агрессии 0..1). */
export function preferredRange(weapon: WeaponType, aggro: number): number {
  if (weapon === 'flamethrower') return 7;
  if (weapon === 'railgun') return 34 + aggro * 10;
  return 20 + aggro * 8; // пушка
}

/** Допуск прицеливания (радианы) по типу оружия. */
export function aimTolerance(weapon: WeaponType): number {
  if (weapon === 'flamethrower') return 0.3;
  if (weapon === 'railgun') return 0.1;
  return 0.14; // пушка
}

/** Рулёжка: steer из угла отклонения к цели (clamp к [-1, 1]). */
export function steeringFromAngle(diff: number): number {
  return clamp(diff * 2.4, -1, 1);
}

export class AIController {
  wantsFire = false;
  private state: AIState = 'patrol';
  private waypoint = new THREE.Vector2(0, 0);
  private idleT = 0;
  private loseT = 0;
  private lastSeen = new THREE.Vector2(0, 0);
  private avoidT = 0;
  private avoidDir = 1;
  private stuckT = 0;
  private strafeDir = 1;
  private strafeT = 0;
  private scanT = Math.random() * Math.PI * 2;
  private patrolN = 0;
  private reactT = 0;          // обратный отсчёт задержки реакции
  private persona: AIPersona;

  constructor(
    private tank: TankEntity,
    private sight: number,
    private fireRange: number,
    private aimError: number,
    persona?: AIPersona,
  ) {
    this.persona = persona ?? DEFAULT_PERSONA;
    this.pickWaypoint(44);
  }

  /** Предпочтительная дистанция боя в зависимости от оружия и агрессии. */
  private prefRange(): number {
    return preferredRange(this.tank.params.weaponType ?? 'cannon', this.persona.aggro);
  }

  private pickWaypoint(bounds: number, huntTarget?: { x: number; z: number }) {
    this.patrolN += 1;
    // каждый третий патрульный манёвр — разведка в сторону игрока
    if (huntTarget && this.patrolN % 3 === 0) {
      const ang = Math.random() * Math.PI * 2;
      const dist = 24 + Math.random() * 18;
      this.waypoint.set(
        clamp(huntTarget.x + Math.cos(ang) * dist, -bounds, bounds),
        clamp(huntTarget.z + Math.sin(ang) * dist, -bounds, bounds),
      );
      return;
    }
    this.waypoint.set(
      (Math.random() * 2 - 1) * bounds,
      (Math.random() * 2 - 1) * bounds,
    );
  }

  update(dt: number, ctx: AICtx) {
    const t = this.tank;
    this.wantsFire = false;
    t.boosting = false;
    if (!t.alive) return;

    const p = ctx.player;
    const dx = p.position.x - t.position.x;
    const dz = p.position.z - t.position.z;
    const dist = Math.hypot(dx, dz);
    const canSee = p.alive && dist < this.sight && losClear(t.position.x, t.position.z, p.position.x, p.position.z, ctx.colliders);

    // ==== смена состояний ====
    if (canSee) {
      if (this.state !== 'engage') this.reactT = this.persona.react; // задержка реакции при захвате
      this.state = 'engage';
      this.loseT = 0;
      this.lastSeen.set(p.position.x, p.position.z);
    } else if (this.state === 'engage') {
      this.loseT += dt;
      if (this.loseT > 2.2) {
        this.state = 'patrol';
        this.waypoint.copy(this.lastSeen); // идти проверить последнюю позицию
      }
    }
    if (this.reactT > 0) this.reactT -= dt;

    const pref = this.prefRange();
    let tx = this.waypoint.x;
    let tz = this.waypoint.y;
    let throttleBase = 0.85;

    if (this.state === 'engage' && p.alive) {
      // движение: держать дистанцию под своё оружие + латеральный манёвр
      this.strafeT -= dt;
      if (this.strafeT <= 0) {
        this.strafeDir = Math.random() > 0.5 ? 1 : -1;
        this.strafeT = 2 + Math.random() * 2;
      }
      const nx = dx / (dist || 1);
      const nz = dz / (dist || 1);
      const perpX = -nz * this.strafeDir;
      const perpZ = nx * this.strafeDir;
      if (dist > pref + 8) { tx = p.position.x + perpX * 6; tz = p.position.z + perpZ * 6; throttleBase = 1; }
      else if (dist < pref - 5) { tx = t.position.x - nx * 10; tz = t.position.z - nz * 10; throttleBase = 0.7; }
      else { tx = t.position.x + perpX * 10; tz = t.position.z + perpZ * 10; throttleBase = 0.6; }
    }

    // ==== рулевое управление ====
    const desired = Math.atan2(tx - t.position.x, tz - t.position.z);
    const diff = wrapAngle(desired - t.yaw);
    let steer = steeringFromAngle(diff);
    let throttle = Math.abs(diff) < 1.1 ? throttleBase : 0.18;

    // ==== избегание препятствий (зонд впереди) ====
    const fx = Math.sin(t.yaw);
    const fz = Math.cos(t.yaw);
    const probeX = t.position.x + fx * 4.2;
    const probeZ = t.position.z + fz * 4.2;
    let blocked = false;
    for (const c of ctx.colliders) {
      if (!c.active) continue;
      if (pointInCollider(probeX, probeZ, c, 1.4)) { blocked = true; break; }
    }
    if (this.avoidT > 0) {
      this.avoidT -= dt;
      steer = this.avoidDir;
      throttle = 0.7;
    } else if (blocked) {
      // выбрать свободную сторону
      const la = t.yaw + Math.PI / 3;
      const ra = t.yaw - Math.PI / 3;
      const lFree = this.dirFree(t, la, ctx.colliders);
      const rFree = this.dirFree(t, ra, ctx.colliders);
      this.avoidDir = lFree && !rFree ? 1 : !lFree && rFree ? -1 : Math.random() > 0.5 ? 1 : -1;
      this.avoidT = 0.6;
    }

    // ==== антизастревание ====
    if (Math.abs(throttle) > 0.3 && t.speed < 1 && this.avoidT <= 0) {
      this.stuckT += dt;
      if (this.stuckT > 1.1) {
        this.pickWaypoint(ctx.bounds, p.alive ? p.position : undefined);
        this.stuckT = 0;
      }
    } else {
      this.stuckT = Math.max(0, this.stuckT - dt * 2);
    }

    // прибытие в точку патруля
    if (this.state === 'patrol') {
      const wd = Math.hypot(tx - t.position.x, tz - t.position.z);
      if (wd < 3) {
        throttle = 0;
        this.idleT += dt;
        if (this.idleT > 0.5 + Math.random()) {
          this.pickWaypoint(ctx.bounds, p.alive ? p.position : undefined);
          this.idleT = 0;
        }
      }
    }

    t.throttle = throttle;
    t.steer = steer;

    // ==== нитро: агрессивные боты рвутся на дистанцию сближения ====
    t.boosting =
      this.avoidT <= 0 && Math.abs(diff) < 0.4 && this.persona.aggro > 0.5 &&
      ((this.state === 'engage' && dist > pref + 14) ||
       (this.state === 'patrol' && Math.hypot(tx - t.position.x, tz - t.position.z) > 22));

    // ==== башня ====
    if (this.state === 'engage' && p.alive) {
      const w = t.params.weaponType;
      // упреждение только для снарядной пушки (hitscan бьёт точно)
      const lead = w === 'cannon'
        ? clamp(dist / PROJECTILE.speed, 0, 1.4) * this.persona.lead
        : 0;
      const ax = p.position.x + p.vel.x * lead;
      const az = p.position.z + p.vel.z * lead;
      const err = (Math.random() - 0.5) * this.aimError * 2;
      t.aimYaw = Math.atan2(ax - t.position.x, az - t.position.z) + err;

      // ==== огонь ====
      const aimTol = aimTolerance(w ?? 'cannon');
      if (canSee && this.reactT <= 0 && dist < this.fireRange && t.fireTimer <= 0) {
        const turretAbs = t.yaw + t.turretYaw;
        const aimed = Math.abs(wrapAngle(t.aimYaw - turretAbs)) < aimTol;
        // не палить по своим
        let friendlyInLine = false;
        for (const b of ctx.bots) {
          if (b === t || !b.alive) continue;
          if (segmentHitsCircle(
            t.position.x, t.position.z, p.position.x, p.position.z,
            b.position.x, b.position.z, b.radius + 0.6,
          )) { friendlyInLine = true; break; }
        }
        if (aimed && !friendlyInLine) this.wantsFire = true;
      }
    } else {
      // патруль: башня медленно сканирует
      this.scanT += dt * 0.7;
      t.aimYaw = t.yaw + Math.sin(this.scanT) * 0.9;
    }
  }

  private dirFree(t: TankEntity, a: number, colliders: Collider[]): boolean {
    const px = t.position.x + Math.sin(a) * 5;
    const pz = t.position.z + Math.cos(a) * 5;
    for (const c of colliders) {
      if (c.active && pointInCollider(px, pz, c, 1.4)) return false;
    }
    return true;
  }
}
