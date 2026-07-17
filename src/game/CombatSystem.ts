// ===== Боевая система: гибель танков, скоринг, эффекты и события боя =====
// Владеет damageSystem (через core/createDamageSystem) и надстраивает поверх
// него визуальные эффекты, звук, скоринг и эмит событий для HUD.
import * as THREE from 'three';
import type { GameEvent } from './types';
import type { Arena } from './Arena';
import type { Effects } from './effects';
import type { AudioFX } from './audio';
import type { TankLike } from '../core/types';
import { COLORS } from '../core/constants';
import { createDamageSystem } from '../core/DamageSystem';
import type { RunState } from './RunState';
import { applyPlayerKillScore } from './scoring';

export interface CombatDeps {
  arena: Arena;
  effects: Effects;
  audio: AudioFX;
  emit: (e: GameEvent) => void;
  /** Run stats (kills/score) updated on player frags. */
  run: RunState;
  /** Вызывается при гибели игрока (Game сбрасывает deathT и отпускает захват мыши). */
  onPlayerDeath: () => void;
}

export class CombatSystem {
  damageSystem: ReturnType<typeof createDamageSystem>;

  constructor(private deps: CombatDeps) {
    this.damageSystem = createDamageSystem(deps.arena, {
      onTankDamaged: (target, dmg, source) =>
        this.onTankDamaged(target, dmg, source),
      onBlockDestroyed: (pos, size) => this.onBlockDestroyed(pos, size),
    });
  }

  /**
   * Эффекты/звук/события после применения чистого урона.
   * target.takeDamage(dmg, source.id) уже вызван в DamageSystem.applyDamage.
   */
  onTankDamaged(target: TankLike, _dmg: number, owner: TankLike) {
    if (target.isPlayer) {
      this.deps.audio.hitPlayer();
      this.deps.effects.addShake(0.3);
      // направление на атакующего в системе координат экрана (0 = спереди, по часовой)
      const dx = owner.position.x - target.position.x;
      const dz = owner.position.z - target.position.z;
      const fs = Math.sin(target.yaw);
      const fc = Math.cos(target.yaw);
      const dir = (dx * dx + dz * dz) > 0.01
        ? Math.atan2(dx * fc - dz * fs, dx * fs + dz * fc)
        : 0;
      this.deps.emit({ type: 'playerHit', dir });
    } else {
      this.deps.audio.hitEnemy();
      if (owner.isPlayer) this.deps.emit({ type: 'enemyHit', killed: !target.alive });
    }

    if (!target.alive) this.onTankDestroyed(target, owner);
  }

  private onTankDestroyed(target: TankLike, owner: TankLike | null) {
    const p = target.position.clone().setY(1.4);
    this.deps.effects.explosion(p, target.isPlayer ? COLORS.player : 0xff7a3d, 1.9);
    this.deps.effects.debris(p, 0xffa050, 26);
    this.deps.audio.explosion();

    if (target.isPlayer) {
      this.deps.audio.death();
      this.deps.audio.stopEngine();
      this.deps.onPlayerDeath();
    } else {
      const byPlayer = owner?.isPlayer ?? false;
      // M1 root: kill event was emitted but run.kills/score never mutated (SCORE.kill unused).
      const next = applyPlayerKillScore(
        { kills: this.deps.run.kills, score: this.deps.run.score },
        byPlayer,
      );
      this.deps.run.kills = next.kills;
      this.deps.run.score = next.score;
      // TEMP DEBUG [BUGFIX-M1]
      if (byPlayer) {
        console.debug('[BUGFIX-M1] player kill scored', {
          victim: target.name, kills: this.deps.run.kills, score: this.deps.run.score,
        });
      }
      this.deps.emit({ type: 'kill', victim: target.name, byPlayer });
    }
  }

  onBlockDestroyed = (pos: THREE.Vector3, size: number) => {
    this.deps.effects.explosion(pos, 0xffb02e, size);
    this.deps.effects.debris(pos, 0x6b7688, 18);
    this.deps.audio.explosion();
  };
}
