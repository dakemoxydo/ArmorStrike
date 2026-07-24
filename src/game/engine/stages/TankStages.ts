// ===== Стадия: системы оружия, танка, анимации, FX =====
import type { FrameContext, SimSystem } from './types';
import type { Arena } from '../../Arena';
import type { EffectsPort } from '../../ports/EffectsPort';
import { WeaponSystem } from '../systems/WeaponSystem';
import { TankSystem } from '../systems/TankSystem';
import { TankAnimationSystem } from '../systems/TankAnimationSystem';
import { TankFxSystem } from '../systems/TankFxSystem';

export class WeaponSystemStage implements SimSystem {
  readonly name = 'weapon';

  constructor(private arena: Arena) {}

  update(ctx: FrameContext): void {
    WeaponSystem.update(ctx.tanks, this.arena.colliders, ctx.dt);
  }
}

export class TankSystemStage implements SimSystem {
  readonly name = 'tank';
  update(ctx: FrameContext): void {
    TankSystem.update(ctx.tanks, ctx.dt);
  }
}

export class TankAnimationSystemStage implements SimSystem {
  readonly name = 'tankAnim';
  update(ctx: FrameContext): void {
    TankAnimationSystem.update(ctx.tanks, ctx.dt);
  }
}

export class TankFxSystemStage implements SimSystem {
  readonly name = 'tankFx';

  constructor(private effects: EffectsPort) {}

  update(ctx: FrameContext): void {
    TankFxSystem.update(ctx.tanks, this.effects, ctx.dt);
  }
}
