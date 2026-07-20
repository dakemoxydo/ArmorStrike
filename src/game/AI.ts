// ===== ИИ противников: патруль, обнаружение, преследование, огонь =====
import * as THREE from 'three';
import { clamp, losClear, wrapAngle } from './engine/physics';
import type { Collider } from './engine/physics';
import type { WeaponType } from '../core/catalog';
import { findCoverPoint } from './aiCover';
import {
  aimErrorMulForRole,
  coverHpFracForRole,
  type AIRole,
} from './aiRoles';
import { computeObstacleAvoidance } from './aiObstacle';
import { updateTurretAndFire } from './aiAimFire';
import { preferredRange, steeringFromAngle } from './aiTuning';

export { preferredRange, aimTolerance, steeringFromAngle } from './aiTuning';

export type { WeaponType };
export type { AIRole };

/** Цель ИИ (игрок): позиция, жив, скорость для lead. */
export interface AITarget {
  position: THREE.Vector3;
  alive: boolean;
  vel: THREE.Vector3;
}

/** Управляемое тело бота: drive/aim поля без mesh/weapon. */
export interface AIBody {
  position: THREE.Vector3;
  yaw: number;
  aimYaw: number;
  turretYaw: number;
  fireTimer: number;
  throttle: number;
  steer: number;
  boosting: boolean;
  speed: number;
  alive: boolean;
  radius: number;
  health: number;
  maxHealth: number;
  params: { weaponType?: WeaponType };
}

export interface AICtx {
  player: AITarget;
  bots: AIBody[];
  colliders: Collider[];
  bounds: number;
  /**
   * Optional drive target (CP objective). Aim/fire still use `player`.
   * When set, bot paths here unless already in close engage.
   */
  moveHint?: { x: number; z: number } | null;
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

export class AIController {
  wantsFire = false;
  private state: AIState = 'patrol';
  private waypoint = new THREE.Vector2(0, 0);
  private idleT = 0;
  private loseT = 0;
  private lastSeen = new THREE.Vector2(0, 0);
  /** Shared with aiObstacle.computeObstacleAvoidance (mutable bag). */
  private readonly avoid = { avoidT: 0, avoidDir: 1 };
  private stuckT = 0;
  private strafeDir = 1;
  private strafeT = 0;
  private scanT = Math.random() * Math.PI * 2;
  private patrolN = 0;
  private reactT = 0;
  /** M11: hold aim noise so turret can settle within aimTol (was re-rolled every frame). */
  private aimNoise = 0;
  private aimNoiseT = 0;
  /** Low-HP cover seek: re-pick point on timer. */
  private coverT = 0;
  private coverX = 0;
  private coverZ = 0;
  private hasCover = false;
  private persona: AIPersona;
  private role: AIRole;

  constructor(
    private tank: AIBody,
    private sight: number,
    private fireRange: number,
    private aimError: number,
    persona?: AIPersona,
    role: AIRole = 'standard',
  ) {
    this.persona = persona ?? DEFAULT_PERSONA;
    this.role = role;
    this.aimError *= aimErrorMulForRole(role);
    this.pickWaypoint(44);
  }

  private prefRange(): number {
    const base = preferredRange(this.tank.params.weaponType ?? 'cannon', this.persona.aggro);
    if (this.role === 'sniper') return base + 10;
    if (this.role === 'assault') return Math.min(base, 8);
    if (this.role === 'elite') return base + 3;
    return base;
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
  private updateStateMachine(canSee: boolean, dt: number, player: AITarget) {
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
    player: AITarget, pref: number, dt: number, t: AIBody,
    colliders: Collider[],
  ) {
    let tx = this.waypoint.x;
    let tz = this.waypoint.y;
    let throttleBase = 0.85;

    if (state === 'engage' && player.alive) {
      // Low HP → break contact and hide behind cover if any exists nearby.
      // Elite/sniper seek cover earlier (role threshold).
      const hpFrac = t.maxHealth > 0 ? t.health / t.maxHealth : 1;
      const coverFrac = coverHpFracForRole(this.role);
      if (hpFrac < coverFrac) {
        this.coverT -= dt;
        if (!this.hasCover || this.coverT <= 0) {
          const pt = findCoverPoint(
            t.position.x, t.position.z,
            player.position.x, player.position.z,
            colliders,
          );
          if (pt) {
            this.coverX = pt.x;
            this.coverZ = pt.z;
            this.hasCover = true;
            this.coverT = 1.4 + Math.random() * 0.8;
          } else {
            this.hasCover = false;
            this.coverT = 0.8;
          }
        }
        if (this.hasCover) {
          return { tx: this.coverX, tz: this.coverZ, throttleBase: 1 };
        }
      } else {
        this.hasCover = false;
      }

      // Assault: hard rush the player (close range pressure).
      if (this.role === 'assault') {
        return {
          tx: player.position.x,
          tz: player.position.z,
          throttleBase: 1,
        };
      }

      this.strafeT -= dt;
      if (this.strafeT <= 0) {
        this.strafeDir = Math.random() > 0.5 ? 1 : -1;
        // Sniper holds line longer; less jittery orbit.
        this.strafeT = this.role === 'sniper'
          ? 3.2 + Math.random() * 2
          : 2 + Math.random() * 2;
      }
      const nx = dx / (dist || 1);
      const nz = dz / (dist || 1);
      const perpX = -nz * this.strafeDir;
      const perpZ = nx * this.strafeDir;
      const strafeW = this.role === 'sniper' ? 4 : this.role === 'elite' ? 8 : 10;
      const approachBand = this.role === 'sniper' ? 12 : 8;
      const retreatBand = this.role === 'sniper' ? 4 : 5;

      if (dist > pref + approachBand) {
        tx = player.position.x + perpX * (this.role === 'sniper' ? 3 : 6);
        tz = player.position.z + perpZ * (this.role === 'sniper' ? 3 : 6);
        throttleBase = this.role === 'sniper' ? 0.75 : 1;
      } else if (dist < pref - retreatBand) {
        tx = t.position.x - nx * (this.role === 'sniper' ? 14 : 10);
        tz = t.position.z - nz * (this.role === 'sniper' ? 14 : 10);
        throttleBase = this.role === 'sniper' ? 0.85 : 0.7;
      } else {
        // Sniper: minimal lateral drift at preferred range (hold angle).
        tx = t.position.x + perpX * strafeW;
        tz = t.position.z + perpZ * strafeW;
        throttleBase = this.role === 'sniper' ? 0.35 : 0.6;
      }
    }

    return { tx, tz, throttleBase };
  }

  /** Шаг 8: антизастревание. */
  private checkAntiStuck(
    dt: number, throttle: number, tankSpeed: number,
    bounds: number, playerAlive: boolean, playerPos?: { x: number; z: number },
  ) {
    // Allow stuck accumulation during avoidance (was mutually exclusive → corner traps).
    if (Math.abs(throttle) > 0.3 && tankSpeed < 1) {
      this.stuckT += dt;
      if (this.stuckT > 1.1) {
        this.pickWaypoint(bounds, playerAlive ? playerPos : undefined);
        this.stuckT = 0;
        this.avoid.avoidT = 0;
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

  /** Шаг 11: нитро. Assault boosts aggressively; snipers almost never. */
  private computeBoost(
    diff: number, dist: number, pref: number,
    tx: number, tz: number, tPos: THREE.Vector3,
  ): boolean {
    if (this.role === 'sniper') return false;
    const aggroGate = this.role === 'assault' ? 0.3 : 0.5;
    const engageDist = this.role === 'assault' ? pref + 6 : pref + 14;
    return this.avoid.avoidT <= 0 && Math.abs(diff) < 0.4 && this.persona.aggro > aggroGate &&
      ((this.state === 'engage' && dist > engageDist) ||
       (this.state === 'patrol' && Math.hypot(tx - tPos.x, tz - tPos.z) > 22));
  }

  update(dt: number, ctx: AICtx) {
    const t = this.tank;
    this.wantsFire = false;
    t.boosting = false;
    if (!t.alive) return;

    // Шаг 1-2: восприятие + конечный автомат
    const { canSee, dist, dx, dz } = this.perceive(ctx);
    this.updateStateMachine(canSee, dt, ctx.player);

    // Шаг 3-4: целевая точка + предпочтительная дистанция (+ low-HP cover)
    const pref = this.prefRange();
    let { tx, tz, throttleBase } = this.computeTargetPoint(
      this.state, dist, dx, dz, ctx.player, pref, dt, t, ctx.colliders,
    );

    // CP objective path: drive to moveHint unless in close combat / cover flee.
    const hint = ctx.moveHint;
    let onObjectivePath = false;
    if (hint) {
      const closeFight =
        this.state === 'engage' &&
        ctx.player.alive &&
        dist <= this.fireRange * 1.05;
      const covering =
        this.hasCover &&
        t.maxHealth > 0 &&
        t.health / t.maxHealth < coverHpFracForRole(this.role);
      if (!closeFight && !covering) {
        tx = hint.x;
        tz = hint.z;
        throttleBase = 1;
        onObjectivePath = true;
      }
    }

    // Шаг 5: рулевое управление
    const desired = Math.atan2(tx - t.position.x, tz - t.position.z);
    const diff = wrapAngle(desired - t.yaw);
    let steer = steeringFromAngle(diff);
    let throttle = Math.abs(diff) < 1.1 ? throttleBase : 0.18;

    // Шаг 6-7: избегание препятствий (переопределяет steer/throttle)
    const avoid = computeObstacleAvoidance(
      this.avoid, dt, t, ctx.colliders,
    );
    if (avoid.steerOverride !== null) steer = avoid.steerOverride;
    if (avoid.throttleOverride !== null) throttle = avoid.throttleOverride;

    // Шаг 8: антизастревание
    this.checkAntiStuck(
      dt, throttle, t.speed, ctx.bounds, ctx.player.alive,
      onObjectivePath ? hint! : ctx.player.position,
    );

    // Шаг 9: idle at patrol waypoint OR soft hold at objective center
    if (onObjectivePath && hint) {
      const wd = Math.hypot(hint.x - t.position.x, hint.z - t.position.z);
      if (wd < 5) throttle = Math.min(throttle, 0.12);
    } else if (this.state === 'patrol' && this.updatePatrolIdle(
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
    const aimState = {
      aimNoise: this.aimNoise,
      aimNoiseT: this.aimNoiseT,
      reactT: this.reactT,
      scanT: this.scanT,
      wantsFire: false,
    };
    updateTurretAndFire(
      aimState, dt, this.state === 'engage', canSee, dist,
      this.fireRange, this.aimError, this.persona, t, ctx.player, ctx.bots,
    );
    this.aimNoise = aimState.aimNoise;
    this.aimNoiseT = aimState.aimNoiseT;
    this.scanT = aimState.scanT;
    this.wantsFire = aimState.wantsFire;
  }
}
