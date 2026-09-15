// ===== Стадия: ввод игрока + учёт перезарядки =====
// Триггер оружия (setFire) сюда больше НЕ входит — его применяет WeaponFireStage
// после TankSystemStage, чтобы выстрел шёл из дула текущего кадра (см. там).
import type { FrameContext, SimSystem } from './types';
import type { PlayerController } from '../../PlayerController';
import type { AudioPort } from '../../ports/AudioPort';
import { isBeamTurretId } from '../../../ui/hudPresentation';

export class PlayerInputStage implements SimSystem {
  readonly name = 'playerInput';

  constructor(
    private input: PlayerController,
    private audio: AudioPort,
  ) {}

  update(ctx: FrameContext): void {
    const p = ctx.player;
    if (p.alive) {
      // WASD/mouse → tank fields; wantsFire/requestReload фиксируются в
      // контроллере и применяются позже (WeaponFireStage).
      this.input.update(p);
      const ammo = p.weapon?.getAmmoState();
      const reloading = ammo?.reloading ?? false;
      // Railgun reports isCharging as "reloading" for HUD progress, but charging
      // isn't a magazine reload — don't play the reload click on charge start.
      // G3: у лучевых башен reloading = низкий баллон («не магазин», Weapon_Isida.md) —
      // HUD-текст уже исключён через weaponStatusKind, исключаем и щелчок.
      const isReloadNotCharge =
        reloading && !(ammo?.isCharging) && !isBeamTurretId(p.turretId ?? '');
      if (isReloadNotCharge && !ctx.prevReloading.value) this.audio.reload();
      ctx.prevReloading.value = reloading;
    } else {
      ctx.prevReloading.value = false;
    }
  }
}
