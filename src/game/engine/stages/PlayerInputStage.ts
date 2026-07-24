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
      const reloading = p.weapon?.getAmmoState().reloading ?? false;
      if (reloading && !ctx.prevReloading.value) this.audio.reload();
      ctx.prevReloading.value = reloading;
    } else {
      // M8: cut flamethrower/weapon fire on death so audio/state do not leak.
      p.weapon?.setFire(false);
      ctx.prevReloading.value = false;
    }
  }
}
