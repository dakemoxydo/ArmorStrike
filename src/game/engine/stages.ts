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
import type { WaveManager } from '../WaveManager';
import type { CombatSystem } from '../CombatSystem';
import type { HudModel } from '../HudModel';
import type { Nameplate } from '../nameplate';
import type { GameEvent } from '../types';
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
  waves: WaveManager;
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
export type BotAiCtx = Pick<SimContext, 'dt' | 'player' | 'waves' | 'arena'>;
export type EngineAudioCtx = Pick<SimContext, 'player' | 'audio'>;
export type BoostFxCtx = Pick<SimContext, 'player' | 'effects'>;
export type WavesCtx = Pick<SimContext, 'player' | 'deathT' | 'run' | 'waves' | 'dt' | 'tanks' | 'nameplates' | 'input'>;

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

/** Обновление ИИ ботов + установка огня. */
export class BotAiStage implements SimSystem {
  readonly name = 'botAi';
  update(ctx: SimContext): void {
    const p = ctx.player;
    const bounds = ctx.arena.half - 6;
    const others = ctx.waves.bots.map((b) => b.tank);
    for (const b of ctx.waves.bots) {
      b.ai.update(ctx.dt, {
        player: p, bots: others,
        colliders: ctx.arena.colliders, bounds,
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
    NameplateSystem.update(ctx.waves.bots, ctx.nameplates);
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

export class WavesStage implements SimSystem {
  readonly name = 'waves';
  update(ctx: SimContext): void {
    // M5: do not advance waves / award waveBonus during death cam or after player death.
    if (!ctx.player.alive || ctx.deathT.value >= 0) {
      return;
    }
    const wasIntermission = ctx.run.intermission;
    ctx.waves.update(ctx.dt, ctx.tanks, ctx.nameplates);
    // Opened this frame: free cursor so React intermission UI is clickable.
    if (ctx.run.intermission && !wasIntermission) {
      ctx.input.enabled = false;
      ctx.input.releaseLock();
    }
  }
}

export class MinimapStage implements SimSystem {
  readonly name = 'minimap';
  update(ctx: SimContext): void {
    MinimapSystem.sync(ctx.arena, ctx.hudModel.getByIdMap());
  }
}

export class DeathTimerStage implements SimSystem {
  readonly name = 'deathTimer';
  update(ctx: SimContext): void {
    if (ctx.deathT.value >= 0) {
      ctx.deathT.value += ctx.dt;
      if (ctx.deathT.value > 2.0) {
        // Единая точка перехода playing → over (mode ownership).
        ctx.requestGameOver();
      }
    }
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
    new WavesStage(),
    new MinimapStage(),
    new DeathTimerStage(),
    new BoostStage(),
    new EngineAudioStage(),
  ];
}
