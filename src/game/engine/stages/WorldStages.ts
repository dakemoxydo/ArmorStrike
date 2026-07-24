// ===== Стадии: ambient, nameplates, physics, projectiles, minimap, match, boost, audio =====
import * as THREE from 'three';
import type { FrameContext, SimSystem, NameplateMap } from './types';
import type { Arena } from '../../Arena';
import type { EffectsPort } from '../../ports/EffectsPort';
import type { ProjectileManager } from '../Projectile';
import type { AudioPort } from '../../ports/AudioPort';
import type { CombatSystem } from '../../CombatSystem';
import type { BotRoster } from '../../BotRoster';
import type { HudModel } from '../../HudModel';
import type { MatchRuntime } from '../../match/MatchRuntime';
import { NameplateSystem } from '../systems/NameplateSystem';
import { PhysicsSystem } from '../systems/PhysicsSystem';
import { MinimapSystem } from '../systems/MinimapSystem';
import { COLORS } from '../../../core/constants';
import { BOOST_JET_HEIGHT, BOOST_JET_OFFSET } from '../../tuning';
import { rearPoint } from '../physics';

const _bv = new THREE.Vector3();
const _bd = new THREE.Vector3();

export class AmbientStage implements SimSystem {
  readonly name = 'ambient';

  constructor(private effects: EffectsPort) {}

  update(ctx: FrameContext): void {
    const p = ctx.player;
    this.effects.setAmbientCenter(p.position.x, p.position.z);
  }
}

export class NameplateSystemStage implements SimSystem {
  readonly name = 'nameplate';

  constructor(
    private bots: BotRoster,
    private nameplates: NameplateMap,
  ) {}

  update(_ctx: FrameContext): void {
    NameplateSystem.update(this.bots.bots, this.nameplates);
  }
}

export class PhysicsSystemStage implements SimSystem {
  readonly name = 'physics';

  constructor(private arena: Arena) {}

  update(ctx: FrameContext): void {
    PhysicsSystem.resolveCollisions(ctx.tanks, this.arena.colliders);
  }
}

export class ProjectileStage implements SimSystem {
  readonly name = 'projectile';

  constructor(
    private projectiles: ProjectileManager,
    private arena: Arena,
    private effects: EffectsPort,
    private combat: CombatSystem,
  ) {}

  update(ctx: FrameContext): void {
    this.projectiles.update(ctx.dt, {
      colliders: this.arena.colliders,
      tanks: ctx.tanks,
      effects: this.effects,
      damageSystem: this.combat.damageSystem,
      // C2 root fix: real HP must go through applyDamage (takeDamage + hooks),
      // not onTankDamaged alone (presentation hook assumes damage already applied).
      onTankHit: (target, dmg, owner) => {
        // C2: real HP must go through applyDamage (takeDamage + hooks).
        this.combat.damageSystem.applyDamage(target, dmg, owner);
      },
    });
  }
}

export class MinimapStage implements SimSystem {
  readonly name = 'minimap';

  constructor(
    private arena: Arena,
    private hudModel: HudModel,
  ) {}

  update(_ctx: FrameContext): void {
    MinimapSystem.sync(this.arena, this.hudModel.getByIdMap());
  }
}

/** Match: invuln tick, respawn, win conditions (replaces death→gameOver timer). */
export class MatchStage implements SimSystem {
  readonly name = 'match';

  constructor(private match: MatchRuntime) {}

  update(ctx: FrameContext): void {
    this.match.update(ctx.dt, ctx.tanks, ctx.player);
  }
}

export class BoostStage implements SimSystem {
  readonly name = 'boost';

  constructor(private effects: EffectsPort) {}

  update(ctx: FrameContext): void {
    const p = ctx.player;
    const boostBack = p.yaw + Math.PI;
    if (p.alive && p.boostActive) {
      rearPoint(_bv, p.position.x, p.position.z, p.yaw, BOOST_JET_OFFSET, BOOST_JET_HEIGHT);
      _bd.set(Math.sin(boostBack), 0.05, Math.cos(boostBack)).normalize();
      this.effects.boostJet(_bv, _bd, COLORS.player);
    }
  }
}

export class EngineAudioStage implements SimSystem {
  readonly name = 'engineAudio';

  constructor(private audio: AudioPort) {}

  update(ctx: FrameContext): void {
    const p = ctx.player;
    this.audio.setEngine(
      p.alive ? Math.min(1, Math.abs(p.speed) / p.params.speed) : 0,
      p.alive && p.boostActive,
    );
  }
}
