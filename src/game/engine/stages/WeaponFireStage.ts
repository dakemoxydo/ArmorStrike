// ===== Стадия: применение триггеров оружия (после синка башни) =====
// setFire обязан идти ПОСЛЕ TankSystemStage: презентация башни (turret
// rotation) синкаится там, а выстрел читает мировую позицию дула. Раньше
// PlayerInputStage/BotAiStage дёргали setFire до синка — снаряд/луч вылетали
// из дула прошлого кадра при текущем направлении (заметный боковой унос
// при развороте башни 9–10 рад/с).
import type { FrameContext, SimSystem } from './types';
import type { PlayerController } from '../../PlayerController';
import type { BotRoster } from '../../BotRoster';

export class WeaponFireStage implements SimSystem {
  readonly name = 'weaponFire';

  constructor(
    private input: PlayerController,
    private bots: BotRoster,
  ) {}

  update(ctx: FrameContext): void {
    const p = ctx.player;
    // M8 stays true: a dead owner's weapon must drop its trigger so audio/state
    // do not leak (flame loop).
    p.weapon?.setFire(p.alive ? this.input.wantsFire : false);

    for (const b of this.bots.bots) {
      b.tank.weapon?.setFire(b.tank.alive ? b.ai.wantsFire : false);
    }
  }
}
