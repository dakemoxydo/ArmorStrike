// ===== Единый конвейер стадий симуляции =====
// Каждая стадия оборачивает часть логики GameSimulation.step в равномерный
// интерфейс, чтобы step стал чистым циклом по упорядоченному списку.
import * as THREE from 'three';
import type { GameSimulation } from './GameSimulation';
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

export interface SimContext {
  sim: GameSimulation;
  dt: number;
  emit: (e: GameEvent) => void;
}

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
    const { sim } = ctx;
    const p = sim.player!;
    if (p.alive) {
      const wantsFire = sim.input.update(p);
      p.weapon?.setFire(wantsFire);
      const reloading = p.weapon?.getAmmoState().reloading ?? false;
      if (reloading && !sim.prevReloading) sim.audio.reload();
      sim.prevReloading = reloading;
    } else {
      sim.prevReloading = false;
    }
  }
}

/** Обновление ИИ ботов + установка огня. */
export class BotAiStage implements SimSystem {
  readonly name = 'botAi';
  update(ctx: SimContext): void {
    const { sim, dt } = ctx;
    const p = sim.player!;
    const bounds = sim.arena.half - 6;
    const others = sim.waves.bots.map((b) => b.tank);
    for (const b of sim.waves.bots) {
      b.ai.update(dt, {
        player: p, bots: others,
        colliders: sim.arena.colliders, bounds,
      });
      b.tank.weapon?.setFire(b.ai.wantsFire);
    }
  }
}

export class WeaponSystemStage implements SimSystem {
  readonly name = 'weapon';
  update(ctx: SimContext): void {
    WeaponSystem.update(ctx.sim.tanks, ctx.sim.arena, ctx.dt);
  }
}

export class TankSystemStage implements SimSystem {
  readonly name = 'tank';
  update(ctx: SimContext): void {
    TankSystem.update(ctx.sim.tanks, ctx.dt);
  }
}

export class TankAnimationSystemStage implements SimSystem {
  readonly name = 'tankAnim';
  update(ctx: SimContext): void {
    TankAnimationSystem.update(ctx.sim.tanks, ctx.dt);
  }
}

export class TankFxSystemStage implements SimSystem {
  readonly name = 'tankFx';
  update(ctx: SimContext): void {
    TankFxSystem.update(ctx.sim.tanks, ctx.sim.effects, ctx.dt);
  }
}

export class AmbientStage implements SimSystem {
  readonly name = 'ambient';
  update(ctx: SimContext): void {
    const p = ctx.sim.player!;
    ctx.sim.effects.setAmbientCenter(p.position.x, p.position.z);
  }
}

export class NameplateSystemStage implements SimSystem {
  readonly name = 'nameplate';
  update(ctx: SimContext): void {
    NameplateSystem.update(ctx.sim.waves.bots, ctx.sim.nameplates);
  }
}

export class PhysicsSystemStage implements SimSystem {
  readonly name = 'physics';
  update(ctx: SimContext): void {
    PhysicsSystem.resolveCollisions(ctx.sim.tanks, ctx.sim.arena.colliders);
  }
}

export class ProjectileStage implements SimSystem {
  readonly name = 'projectile';
  update(ctx: SimContext): void {
    const { sim } = ctx;
    sim.projectiles.update(ctx.dt, {
      colliders: sim.arena.colliders,
      tanks: sim.tanks,
      arena: sim.arena,
      effects: sim.effects,
      damageSystem: sim.combat.damageSystem,
      onTankHit: (target, dmg, owner) => {
        sim.combat.onTankDamaged(target, dmg, owner);
      },
    });
  }
}

export class WavesStage implements SimSystem {
  readonly name = 'waves';
  update(ctx: SimContext): void {
    ctx.sim.waves.update(ctx.dt, ctx.sim.tanks, ctx.sim.nameplates);
  }
}

export class MinimapStage implements SimSystem {
  readonly name = 'minimap';
  update(ctx: SimContext): void {
    MinimapSystem.sync(ctx.sim.arena, ctx.sim.hudModel.getByIdMap());
  }
}

export class DeathTimerStage implements SimSystem {
  readonly name = 'deathTimer';
  update(ctx: SimContext): void {
    const { sim, emit } = ctx;
    if (sim.deathT >= 0) {
      sim.deathT += ctx.dt;
      if (sim.deathT > 2.0) {
        sim.deathT = -1;
        sim.run.mode = 'over';
        emit({ type: 'modeChanged', mode: 'over' });
        emit({ type: 'gameOver', score: sim.run.score, kills: sim.run.kills, wave: sim.waves.wave });
      }
    }
  }
}

export class BoostStage implements SimSystem {
  readonly name = 'boost';
  update(ctx: SimContext): void {
    const { sim } = ctx;
    const p = sim.player!;
    const boostBack = p.yaw + Math.PI;
    if (p.alive && p.boostActive) {
      rearPoint(_bv, p.position.x, p.position.z, p.yaw, BOOST_JET_OFFSET, BOOST_JET_HEIGHT);
      _bd.set(Math.sin(boostBack), 0.05, Math.cos(boostBack)).normalize();
      sim.effects.boostJet(_bv, _bd, COLORS.player);
    }
  }
}

export class EngineAudioStage implements SimSystem {
  readonly name = 'engineAudio';
  update(ctx: SimContext): void {
    const { sim } = ctx;
    const p = sim.player!;
    sim.audio.setEngine(
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
