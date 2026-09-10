// ===== Стадия: ввод игрока + учёт перезарядки =====
import type { FrameContext, SimSystem } from './types';
import type { PlayerController } from '../../PlayerController';
import type { AudioPort } from '../../ports/AudioPort';

export class PlayerInputStage implements SimSystem {
  readonly name = 'playerInput';

  constructor(
    private input: PlayerController,
    private audio: AudioPort,
  ) {}

  update(ctx: FrameContext): void {
    const p = ctx.player;
    if (p.alive) {
      const wantsFire = this.input.update(p);
      p.weapon?.setFire(wantsFire);
      const ammo = p.weapon?.getAmmoState();
      const reloading = ammo?.reloading ?? false;
      // Railgun reports isCharging as "reloading" for HUD progress, but charging
      // isn't a magazine reload — don't play the reload click on charge start.
      const isReloadNotCharge = reloading && !(ammo?.isCharging);
      if (isReloadNotCharge && !ctx.prevReloading.value) this.audio.reload();
      ctx.prevReloading.value = reloading;
    } else {
      // M8: cut flamethrower/weapon fire on death so audio/state do not leak.
      p.weapon?.setFire(false);
      ctx.prevReloading.value = false;
    }
  }
}
