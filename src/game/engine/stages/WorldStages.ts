// ===== Стадии: ambient, nameplates, physics, projectiles, minimap, match, boost, audio =====
import * as THREE from 'three';
import type { FrameContext, SimSystem, NameplateMap } from './types';
import type { Arena } from '../../Arena';
import type { EffectsPort } from '../../ports/EffectsPort';
import type { HitContext, ProjectileManager } from '../Projectile';
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
    _bots: BotRoster,
    private nameplates: NameplateMap,
  ) {}

  update(ctx: FrameContext): void {
    NameplateSystem.updateTanks(ctx.tanks, this.nameplates, ctx.player.position);
  }
}

export class PhysicsSystemStage implements SimSystem {
  readonly name = 'physics';

  constructor(private arena: Arena) {}

  update(ctx: FrameContext): void {
    // F4: dt прокидывается в стеновое трение — FPS-независимый эксп. затух.
    PhysicsSystem.resolveCollisions(ctx.tanks, this.arena.colliders, ctx.dt);
  }
}

export class ProjectileStage implements SimSystem {
  readonly name = 'projectile';

  /**
   * Переиспользуемый HitContext: раньше объект + новое замыкание `onTankHit`
   * создавались в каждом `update` (60/с) — чистый мусор в самом горячем
   * стейдже плюс свежая функция в call site внутри внутреннего цикла снарядов
   * (см. MatchRuntime._personals — тот же приём с пулом буферов).
   *
   * Состав контекста по жизни арены не меняется: `Arena.rebuild` чистит
   * коллайдеры на месте (`colliders.length = 0`), ссылка та же — как и массив
   * ростера (`GameSimulation.clearTanks` тоже in-place, на него же завязан
   * RemotePlayerManager). Тем не менее поля досинхронизируются по ссылке
   * перед вызовом: одно сравнение указателей дешевле аллокации на кадр.
   */
  private readonly hitCtx: HitContext;

  constructor(
    private projectiles: ProjectileManager,
    private arena: Arena,
    effects: EffectsPort,
    private combat: CombatSystem,
  ) {
    this.hitCtx = {
      colliders: arena.colliders,
      tanks: [],
      effects,
      damageSystem: combat.damageSystem,
      // C2 root fix: real HP must go through applyDamage (takeDamage + hooks),
      // not onTankDamaged alone (presentation hook assumes damage already applied).
      onTankHit: (target, dmg, owner) => {
        // C2: real HP must go through applyDamage (takeDamage + hooks).
        this.combat.damageSystem.applyDamage(target, dmg, owner);
      },
    };
  }

  update(ctx: FrameContext): void {
    const hit = this.hitCtx;
    if (hit.tanks !== ctx.tanks) hit.tanks = ctx.tanks;
    const colliders = this.arena.colliders;
    if (hit.colliders !== colliders) hit.colliders = colliders;
    this.projectiles.update(ctx.dt, hit);
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
      this.effects.addShake(0.012);
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
