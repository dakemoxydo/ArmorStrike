// ===== Единый конвейер стадий симуляции =====
// Каждая стадия оборачивает часть логики GameSimulation.step в равномерный
// интерфейс, чтобы step стал чистым циклом по упорядоченному списку.
// Стадии зависят только от плоского SimContext (не от типа GameSimulation).
import * as THREE from 'three';
import type { TankEntity } from '../Tank';
import type { Arena } from '../Arena';
import type { EffectsPort } from '../ports/EffectsPort';
import type { ProjectileManager } from './Projectile';
import type { PlayerController } from '../PlayerController';
import type { AudioPort } from '../ports/AudioPort';
import type { RunState } from '../RunState';
import type { BotRoster } from '../BotRoster';
import type { CombatSystem } from '../CombatSystem';
import type { HudModel } from '../HudModel';
import type { Nameplate } from '../nameplate';
import type { GameEvent } from '../types';
import type { MatchRuntime } from '../match/MatchRuntime';
import { allyLineBlockers, pickAiFocus } from '../match/aiFocus';
import {
  moveHintForZone,
  pickObjectiveZone,
  shouldFightNearObjective,
  type ObjectiveZoneView,
} from '../match/aiObjective';
import { WeaponSystem } from './systems/WeaponSystem';
import { TankSystem } from './systems/TankSystem';
import { TankAnimationSystem } from './systems/TankAnimationSystem';
import { TankFxSystem } from './systems/TankFxSystem';
import { NameplateSystem } from './systems/NameplateSystem';
import { PhysicsSystem } from './systems/PhysicsSystem';
import { MinimapSystem } from './systems/MinimapSystem';
import { COLORS } from '../../core/constants';
import { BOOST_JET_HEIGHT, BOOST_JET_OFFSET } from '../tuning';
import { rearPoint } from './physics';
import type { AITarget } from '../AI';
import { BOT_NORMAL } from '../match/matchConfig';
import type { TeamId } from '../match/matchTypes';

/** Shared mutable scalar (same object as GameSimulation cell — mid-step external writes stay visible). */
export type ScalarCell<T> = { value: T };

/**
 * Полный контекст кадра симуляции (composition bag).
 * Stages type-narrow via Pick-slices below (ISP at type level; runtime object unchanged).
 */
export interface SimContext {
  dt: number;
  emit: (e: GameEvent) => void;
  player: TankEntity;
  tanks: TankEntity[];
  nameplates: Map<number, { plate: Nameplate; color: number }>;
  arena: Arena;
  effects: EffectsPort;
  projectiles: ProjectileManager;
  input: PlayerController;
  audio: AudioPort;
  run: RunState;
  combat: CombatSystem;
  bots: BotRoster;
  match: MatchRuntime;
  hudModel: HudModel;
  /** Shared cell with GameSimulation.deathT. */
  deathT: ScalarCell<number>;
  /** Shared cell with GameSimulation.prevReloading. */
  prevReloading: ScalarCell<boolean>;
  /** Единый переход в game over (mode + events). */
  requestGameOver(): void;
}

/** Stage-local views (documentation + type discipline; same object as SimContext). */
export type PlayerInputCtx = Pick<SimContext, 'player' | 'input' | 'audio' | 'prevReloading'>;
export type BotAiCtx = Pick<SimContext, 'dt' | 'player' | 'bots' | 'arena' | 'tanks' | 'match'>;
export type EngineAudioCtx = Pick<SimContext, 'player' | 'audio'>;
export type BoostFxCtx = Pick<SimContext, 'player' | 'effects'>;

export interface SimSystem {
  readonly name: string;
  update(ctx: SimContext): void;
}

const _bv = new THREE.Vector3();
const _bd = new THREE.Vector3();

/** Ввод игрока + учёт перезарядки. */
export class PlayerInputStage implements SimSystem {
  readonly name = 'playerInput';
  update(ctx: SimContext): void {
    const p = ctx.player;
    if (p.alive) {
      const wantsFire = ctx.input.update(p);
      p.weapon?.setFire(wantsFire);
      const reloading = p.weapon?.getAmmoState().reloading ?? false;
      if (reloading && !ctx.prevReloading.value) ctx.audio.reload();
      ctx.prevReloading.value = reloading;
    } else {
      // M8: cut flamethrower/weapon fire on death so audio/state do not leak.
      p.weapon?.setFire(false);
      ctx.prevReloading.value = false;
    }
  }
}

/** Per-bot sticky focus (id) for FFA thrash reduction — stage-local. */
const _aiSticky = new Map<number, number>();
/** Per-bot sticky capture zone id (CP objective). */
const _objSticky = new Map<number, string>();

function deadStub(player: TankEntity): AITarget {
  return { position: player.position, alive: false, vel: player.vel };
}

/**
 * Multi-target hostile focus (DM FFA + team modes).
 * Uses isEnemy; sticky target; LoS-preferred when in sight.
 */
function aiFocusForBot(
  bot: TankEntity,
  player: TankEntity,
  tanks: TankEntity[],
  colliders: SimContext['arena']['colliders'],
): AITarget {
  const stickyId = _aiSticky.get(bot.id) ?? -1;
  const { target } = pickAiFocus({
    self: bot,
    candidates: tanks,
    colliders,
    sightRange: BOT_NORMAL.sightRange,
    stickyId,
  });
  if (!target) {
    _aiSticky.delete(bot.id);
    return deadStub(player);
  }
  _aiSticky.set(bot.id, target.id);
  // Resolve live entity (pick returns candidate shape; same refs as tanks).
  const ent = tanks.find((t) => t.id === target.id);
  return ent ?? deadStub(player);
}

function zonesAsView(ctx: SimContext): ObjectiveZoneView[] {
  return ctx.match.getCaptureZones().map((z) => ({
    id: z.id,
    x: z.x,
    z: z.z,
    radius: z.radius,
    owner: z.owner,
    contested: z.contested,
  }));
}

/** Обновление ИИ ботов + установка огня (+ CP objective path). */
export class BotAiStage implements SimSystem {
  readonly name = 'botAi';
  update(ctx: SimContext): void {
    const p = ctx.player;
    const bounds = ctx.arena.half - 6;
    const cpMode = ctx.match.mode === 'capture_point';
    const zoneViews = cpMode ? zonesAsView(ctx) : [];

    for (const b of ctx.bots.bots) {
      if (!b.tank.alive) {
        b.tank.weapon?.setFire(false);
        _aiSticky.delete(b.tank.id);
        _objSticky.delete(b.tank.id);
        continue;
      }

      const focus = aiFocusForBot(b.tank, p, ctx.tanks, ctx.arena.colliders);
      let moveHint: { x: number; z: number } | null = null;

      // P5: ~50% bots path to capture zones. AIController still aims at focus;
      // moveHint overrides drive unless close combat (see AIController).
      if (cpMode && b.objectiveDuty && zoneViews.length > 0) {
        const teamId = b.tank.teamId as Exclude<TeamId, null> | null;
        if (teamId === 'alpha' || teamId === 'bravo') {
          const stickyZ = _objSticky.get(b.tank.id) ?? null;
          const zone = pickObjectiveZone(
            { x: b.tank.position.x, z: b.tank.position.z, teamId },
            zoneViews,
            stickyZ,
          );
          if (zone) {
            _objSticky.set(b.tank.id, zone.id);
            const enemyPos = focus.alive
              ? { x: focus.position.x, z: focus.position.z, alive: true }
              : null;
            // Always set path; close fight clears moveHint so engage code runs fully.
            const fight = shouldFightNearObjective(
              { x: b.tank.position.x, z: b.tank.position.z },
              enemyPos,
              zone,
              BOT_NORMAL.sightRange * 0.85,
            );
            moveHint = fight ? null : moveHintForZone(zone);
          }
        }
      } else {
        _objSticky.delete(b.tank.id);
      }

      // Line-of-fire block: allies only (empty in FFA → free fire through peers).
      const allyBlockers = allyLineBlockers(b.tank, ctx.tanks);
      b.ai.update(ctx.dt, {
        player: focus,
        bots: allyBlockers,
        colliders: ctx.arena.colliders,
        bounds,
        moveHint,
      });
      b.tank.weapon?.setFire(b.ai.wantsFire);
    }
  }
}

export class WeaponSystemStage implements SimSystem {
  readonly name = 'weapon';
  update(ctx: SimContext): void {
    WeaponSystem.update(ctx.tanks, ctx.arena.colliders, ctx.dt);
  }
}

export class TankSystemStage implements SimSystem {
  readonly name = 'tank';
  update(ctx: SimContext): void {
    TankSystem.update(ctx.tanks, ctx.dt);
  }
}

export class TankAnimationSystemStage implements SimSystem {
  readonly name = 'tankAnim';
  update(ctx: SimContext): void {
    TankAnimationSystem.update(ctx.tanks, ctx.dt);
  }
}

export class TankFxSystemStage implements SimSystem {
  readonly name = 'tankFx';
  update(ctx: SimContext): void {
    TankFxSystem.update(ctx.tanks, ctx.effects, ctx.dt);
  }
}

export class AmbientStage implements SimSystem {
  readonly name = 'ambient';
  update(ctx: SimContext): void {
    const p = ctx.player;
    ctx.effects.setAmbientCenter(p.position.x, p.position.z);
  }
}

export class NameplateSystemStage implements SimSystem {
  readonly name = 'nameplate';
  update(ctx: SimContext): void {
    NameplateSystem.update(ctx.bots.bots, ctx.nameplates);
  }
}

export class PhysicsSystemStage implements SimSystem {
  readonly name = 'physics';
  update(ctx: SimContext): void {
    PhysicsSystem.resolveCollisions(ctx.tanks, ctx.arena.colliders);
  }
}

export class ProjectileStage implements SimSystem {
  readonly name = 'projectile';
  update(ctx: SimContext): void {
    ctx.projectiles.update(ctx.dt, {
      colliders: ctx.arena.colliders,
      tanks: ctx.tanks,
      effects: ctx.effects,
      damageSystem: ctx.combat.damageSystem,
      // C2 root fix: real HP must go through applyDamage (takeDamage + hooks),
      // not onTankDamaged alone (presentation hook assumes damage already applied).
      onTankHit: (target, dmg, owner) => {
        // C2: real HP must go through applyDamage (takeDamage + hooks).
        ctx.combat.damageSystem.applyDamage(target, dmg, owner);
      },
    });
  }
}

export class MinimapStage implements SimSystem {
  readonly name = 'minimap';
  update(ctx: SimContext): void {
    MinimapSystem.sync(ctx.arena, ctx.hudModel.getByIdMap());
  }
}

/** Match: invuln tick, respawn, win conditions (replaces death→gameOver timer). */
export class MatchStage implements SimSystem {
  readonly name = 'match';
  update(ctx: SimContext): void {
    ctx.match.update(ctx.dt, ctx.tanks, ctx.player);
  }
}

export class BoostStage implements SimSystem {
  readonly name = 'boost';
  update(ctx: SimContext): void {
    const p = ctx.player;
    const boostBack = p.yaw + Math.PI;
    if (p.alive && p.boostActive) {
      rearPoint(_bv, p.position.x, p.position.z, p.yaw, BOOST_JET_OFFSET, BOOST_JET_HEIGHT);
      _bd.set(Math.sin(boostBack), 0.05, Math.cos(boostBack)).normalize();
      ctx.effects.boostJet(_bv, _bd, COLORS.player);
    }
  }
}

export class EngineAudioStage implements SimSystem {
  readonly name = 'engineAudio';
  update(ctx: SimContext): void {
    const p = ctx.player;
    ctx.audio.setEngine(
      p.alive ? Math.min(1, Math.abs(p.speed) / p.params.speed) : 0,
      p.alive && p.boostActive,
    );
  }
}

/** Упорядоченный список стадий (повторяет порядок исходного step). */
export function buildSimulationStages(): SimSystem[] {
  return [
    new PlayerInputStage(),
    new BotAiStage(),
    new WeaponSystemStage(),
    new TankSystemStage(),
    new TankAnimationSystemStage(),
    new TankFxSystemStage(),
    new AmbientStage(),
    new NameplateSystemStage(),
    new PhysicsSystemStage(),
    new ProjectileStage(),
    new MinimapStage(),
    new MatchStage(),
    new BoostStage(),
    new EngineAudioStage(),
  ];
}
