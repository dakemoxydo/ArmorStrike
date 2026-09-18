// ===== Стадия: красная обводка модели врага в прицеле игрока =====
// Порядок: после PhysicsSystemStage (позиции финальные после разгона коллизий),
// перед ProjectileStage. Визуал — inverted-hull outline по силуэту модели
// (modelOutline.ts): не кольцо под танком и не прицел игрока (фидбек P7/P8/P9).
import * as THREE from 'three';
import type { Arena } from '../../Arena';
import type { FrameContext, SimSystem } from './types';
import { AimHighlighter, aimConeRadFor } from '../../targetHighlight';
import type { AimCone } from '../../targetHighlight';
import { TARGET_HIGHLIGHT } from '../../tuning';
import { TANK } from '../../constants';
import type { TankEntity } from '../../Tank';
import { setOutlineIntensity, setTankOutline } from '../../tank/modelOutline';

export class TargetHighlightStage implements SimSystem {
  readonly name = 'targetHighlight';

  private readonly hl = new AimHighlighter<TankEntity>();
  private shown: TankEntity | null = null;
  private shownTarget: TankEntity | null = null;
  private elapsed = 0;
  /** Точка прицела залоченной цели (центр корпуса) — переиспользуется, ноль аллокаций. */
  private readonly _aimPoint = new THREE.Vector3();

  constructor(private arena: Arena) {}

  /** Pitch lock before TankSystem so this frame's shot uses current barrelPitch. */
  resolveAim(ctx: FrameContext): void {
    const { dt, player } = ctx;
    this.elapsed += dt;

    let target: TankEntity | null = null;
    if (player.alive) {
      target = this.hl.update(dt, ctx.tanks, player, this.cone(player), this.arena.colliders);
    } else {
      this.hl.reset();
    }
    if (target) {
      this._aimPoint.set(
        target.position.x,
        target.position.y + TANK.aimCenterY,
        target.position.z,
      );
      player.setPitchAim(this._aimPoint);
    } else {
      player.clearPitchAim();
    }
    this.shownTarget = target;
  }

  /** Outline after physics — uses the entity resolved in resolveAim (same object). */
  syncOutline(): void {
    this.apply(this.shownTarget);
  }

  update(ctx: FrameContext): void {
    this.resolveAim(ctx);
    this.syncOutline();
  }

  private cone(p: TankEntity): AimCone {
    // Совпадает с дуговым contract оружия: aimDir = (sin(aimYaw), 0, cos(aimYaw)).
    return {
      x: p.position.x,
      z: p.position.z,
      dirX: Math.sin(p.aimYaw),
      dirZ: Math.cos(p.aimYaw),
      halfCos: Math.cos(aimConeRadFor(p.params.weaponType)),
      range: p.params.range ?? TARGET_HIGHLIGHT.defaultRange,
    };
  }

  /** Переключение — «было/стало»; пока цель видна — одна запись «дыхания»/кадр. */
  private apply(target: TankEntity | null): void {
    if (this.shown !== target) {
      if (this.shown) setTankOutline(this.shown.visual.group, false);
      if (target) setTankOutline(target.visual.group, true);
      this.shown = target;
    }
    if (this.shown) {
      const p = TARGET_HIGHLIGHT.pulse;
      setOutlineIntensity(p.base + Math.sin(this.elapsed * p.speed) * p.amp);
    }
  }

  onRosterCleared(): void {
    if (this.shown) setTankOutline(this.shown.visual.group, false);
    this.hl.reset();
    this.shown = null;
    this.shownTarget = null;
  }
}

/** Early tick: set player pitchLocked before TankSystem / WeaponFire. */
export class PlayerAimStage implements SimSystem {
  readonly name = 'playerAim';

  constructor(private highlight: TargetHighlightStage) {}

  update(ctx: FrameContext): void {
    this.highlight.resolveAim(ctx);
  }

  onRosterCleared(): void {
    this.highlight.onRosterCleared();
  }
}

/** Late tick: outline on post-physics poses. */
export class TargetOutlineStage implements SimSystem {
  readonly name = 'targetOutline';

  constructor(private highlight: TargetHighlightStage) {}

  update(_ctx: FrameContext): void {
    this.highlight.syncOutline();
  }
}
