// ===== ИИ противников: патруль, обнаружение, преследование, огонь =====
import * as THREE from 'three';
import { clamp, losClear, pointInCollider, segmentHitsCircle, wrapAngle } from './engine/physics';
import type { Collider } from './engine/physics';
import type { TankEntity } from './Tank';
import { PROJECTILE } from './constants';
import type { WeaponType } from '../core/catalog';

export type { WeaponType };

export interface AICtx {
  player: TankEntity;
  bots: TankEntity[];
  colliders: Collider[];
  bounds: number;
}

export interface AIPersona {
  aggro: number;
  react: number;
  lead: number;
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

export function preferredRange(weapon: WeaponType, aggro: number): number {
  if (weapon === 'flamethrower') return 7;
  if (weapon === 'railgun') return 34 + aggro * 10;
  return 20 + aggro * 8;
}

export function aimTolerance(weapon: WeaponType): number {
  if (weapon === 'flamethrower') return 0.3;
  if (weapon === 'railgun') return 0.1;
  return 0.14;
}

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
  private reactT = 0;
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

  private prefRange(): number {
    return preferredRange(this.tank.params.weaponType ?? 'cannon', this.persona.aggro);
  }

  private pickWaypoint(bounds: number, huntTarget?: { x: number; z: number }) {
    this.patrolN += 1;
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

  /** Шаг 1: восприятие — дистанция, LOS, видимость игрока. */
  private perceive(ctx: AICtx) {
    const p = ctx.player;
    const dx = p.position.x - this.tank.position.x;
    const dz = p.position.z - this.tank.position.z;
    const dist = Math.hypot(dx, dz);
    const canSee = p.alive && dist < this.sight &&
      losClear(this.tank.position.x, this.tank.position.z, p.position.x, p.position.z, ctx.colliders);
    return { canSee, dist, dx, dz };
  }

  /** Шаг 2: конечный автомат смены состояния engage/patrol. */
  private updateStateMachine(canSee: boolean, dt: number, player: TankEntity) {
    if (canSee) {
      if (this.state !== 'engage') this.reactT = this.persona.react;
      this.state = 'engage';
      this.loseT = 0;
      this.lastSeen.set(player.position.x, player.position.z);
    } else if (this.state === 'engage') {
      this.loseT += dt;
      if (this.loseT > 2.2) {
        this.state = 'patrol';
        this.waypoint.copy(this.lastSeen);
      }
    }
    if (this.reactT > 0) this.reactT -= dt;
  }

  /** Шаг 3: расчёт целевой точки движения + базовая газ/рулёжка. */
  private computeTargetPoint(
    state: AIState, dist: number, dx: number, dz: number,
    player: TankEntity, pref: number, dt: number, t: TankEntity,
  ) {
    let tx = this.waypoint.x;
    let tz = this.waypoint.y;
    let throttleBase = 0.85;

    if (state === 'engage' && player.alive) {
      this.strafeT -= dt;
      if (this.strafeT <= 0) {
        this.strafeDir = Math.random() > 0.5 ? 1 : -1;
        this.strafeT = 2 + Math.random() * 2;
      }
      const nx = dx / (dist || 1);
      const nz = dz / (dist || 1);
      const perpX = -nz * this.strafeDir;
      const perpZ = nx * this.strafeDir;
      if (dist > pref + 8) { tx = player.position.x + perpX * 6; tz = player.position.z + perpZ * 6; throttleBase = 1; }
      else if (dist < pref - 5) { tx = t.position.x - nx * 10; tz = t.position.z - nz * 10; throttleBase = 0.7; }
      else { tx = t.position.x + perpX * 10; tz = t.position.z + perpZ * 10; throttleBase = 0.6; }
    }

    return { tx, tz, throttleBase };
  }

  /** Шаг 6 (выполняется в update): избегание препятствий. */
  private computeObstacleAvoidance(
    dt: number, t: TankEntity, colliders: Collider[],
  ): { steerOverride: number | null; throttleOverride: number | null } {
    const fx = Math.sin(t.yaw);
    const fz = Math.cos(t.yaw);
    const probeX = t.position.x + fx * 4.2;
    const probeZ = t.position.z + fz * 4.2;
    let blocked = false;
    for (const c of colliders) {
      if (!c.active) continue;
      if (pointInCollider(probeX, probeZ, c, 1.4)) { blocked = true; break; }
    }
    if (this.avoidT > 0) {
      this.avoidT -= dt;
      return { steerOverride: this.avoidDir, throttleOverride: 0.7 };
    } else if (blocked) {
      const la = t.yaw + Math.PI / 3;
      const ra = t.yaw - Math.PI / 3;
      const lFree = this.dirFree(t, la, colliders);
      const rFree = this.dirFree(t, ra, colliders);
      this.avoidDir = lFree && !rFree ? 1 : !lFree && rFree ? -1 : Math.random() > 0.5 ? 1 : -1;
      this.avoidT = 0.6;
    }
    return { steerOverride: null, throttleOverride: null };
  }

  /** Шаг 8: антизастревание. */
  private checkAntiStuck(
    dt: number, throttle: number, tankSpeed: number,
    bounds: number, playerAlive: boolean, playerPos?: { x: number; z: number },
  ) {
    if (Math.abs(throttle) > 0.3 && tankSpeed < 1 && this.avoidT <= 0) {
      this.stuckT += dt;
      if (this.stuckT > 1.1) {
        this.pickWaypoint(bounds, playerAlive ? playerPos : undefined);
        this.stuckT = 0;
      }
    } else {
      this.stuckT = Math.max(0, this.stuckT - dt * 2);
    }
  }

  /** Шаг 9: бездействие по прибытии в точку патруля (возвращает true если газ = 0). */
  private updatePatrolIdle(
    dt: number, tx: number, tz: number,
    tPos: THREE.Vector3, bounds: number, playerPos?: { x: number; z: number },
  ): boolean {
    const wd = Math.hypot(tx - tPos.x, tz - tPos.z);
    if (wd < 3) {
      this.idleT += dt;
      if (this.idleT > 0.5 + Math.random()) {
        this.pickWaypoint(bounds, playerPos);
        this.idleT = 0;
      }
      return true;
    }
    return false;
  }

  /** Шаг 11: нитро. */
  private computeBoost(
    diff: number, dist: number, pref: number,
    tx: number, tz: number, tPos: THREE.Vector3,
  ): boolean {
    return this.avoidT <= 0 && Math.abs(diff) < 0.4 && this.persona.aggro > 0.5 &&
      ((this.state === 'engage' && dist > pref + 14) ||
       (this.state === 'patrol' && Math.hypot(tx - tPos.x, tz - tPos.z) > 22));
  }

  /** Шаг 12: наведение башни и огонь. */
  private updateTurretAndFire(
    dt: number, canSee: boolean, dist: number,
    player: TankEntity, bots: TankEntity[],
  ) {
    const t = this.tank;
    if (this.state === 'engage' && player.alive) {
      const w = t.params.weaponType;
      const lead = w === 'cannon'
        ? clamp(dist / PROJECTILE.speed, 0, 1.4) * this.persona.lead
        : 0;
      const ax = player.position.x + player.vel.x * lead;
      const az = player.position.z + player.vel.z * lead;
      const err = (Math.random() - 0.5) * this.aimError * 2;
      t.aimYaw = Math.atan2(ax - t.position.x, az - t.position.z) + err;

      const aimTol = aimTolerance(w ?? 'cannon');
      if (canSee && this.reactT <= 0 && dist < this.fireRange && t.fireTimer <= 0) {
        const turretAbs = t.yaw + t.turretYaw;
        const aimed = Math.abs(wrapAngle(t.aimYaw - turretAbs)) < aimTol;
        let friendlyInLine = false;
        for (const b of bots) {
          if (b === t || !b.alive) continue;
          if (segmentHitsCircle(
            t.position.x, t.position.z, player.position.x, player.position.z,
            b.position.x, b.position.z, b.radius + 0.6,
          )) { friendlyInLine = true; break; }
        }
        if (aimed && !friendlyInLine) this.wantsFire = true;
      }
    } else {
      this.scanT += dt * 0.7;
      t.aimYaw = t.yaw + Math.sin(this.scanT) * 0.9;
    }
  }

  update(dt: number, ctx: AICtx) {
    const t = this.tank;
    this.wantsFire = false;
    t.boosting = false;
    if (!t.alive) return;

    // Шаг 1-2: восприятие + конечный автомат
    const { canSee, dist, dx, dz } = this.perceive(ctx);
    this.updateStateMachine(canSee, dt, ctx.player);

    // Шаг 3-4: целевая точка + предпочтительная дистанция
    const pref = this.prefRange();
    const { tx, tz, throttleBase } = this.computeTargetPoint(
      this.state, dist, dx, dz, ctx.player, pref, dt, t,
    );

    // Шаг 5: рулевое управление
    const desired = Math.atan2(tx - t.position.x, tz - t.position.z);
    const diff = wrapAngle(desired - t.yaw);
    let steer = steeringFromAngle(diff);
    let throttle = Math.abs(diff) < 1.1 ? throttleBase : 0.18;

    // Шаг 6-7: избегание препятствий (переопределяет steer/throttle)
    const avoid = this.computeObstacleAvoidance(dt, t, ctx.colliders);
    if (avoid.steerOverride !== null) steer = avoid.steerOverride;
    if (avoid.throttleOverride !== null) throttle = avoid.throttleOverride;

    // Шаг 8: антизастревание
    this.checkAntiStuck(dt, throttle, t.speed, ctx.bounds, ctx.player.alive, ctx.player.position);

    // Шаг 9: бездействие патруля
    if (this.state === 'patrol' && this.updatePatrolIdle(
      dt, tx, tz, t.position, ctx.bounds, ctx.player.alive ? ctx.player.position : undefined,
    )) {
      throttle = 0;
    }

    // Шаг 10: применение управления
    t.throttle = throttle;
    t.steer = steer;

    // Шаг 11: нитро
    t.boosting = this.computeBoost(diff, dist, pref, tx, tz, t.position);

    // Шаг 12: башня + огонь
    this.updateTurretAndFire(dt, canSee, dist, ctx.player, ctx.bots);
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
