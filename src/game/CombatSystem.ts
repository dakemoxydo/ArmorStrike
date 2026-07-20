// ===== Боевая система: гибель танков, эффекты и события боя =====
// Владеет damageSystem (через core/createDamageSystem) и надстраивает поверх
// него визуальные эффекты, звук и эмит событий для HUD.
// Match kill credit / respawn — MatchRuntime.
import * as THREE from 'three';
import type { GameEvent } from './types';
import type { Arena } from './Arena';
import type { EffectsPort } from './ports/EffectsPort';
import type { AudioPort } from './ports/AudioPort';
import type { TankLike } from '../core/types';
import { COLORS } from '../core/constants';
import { createDamageSystem } from '../core/DamageSystem';
import type { TankEntity } from './Tank';
import type { MatchRuntime } from './match/MatchRuntime';

export interface CombatDeps {
  arena: Arena;
  effects: EffectsPort;
  audio: AudioPort;
  emit: (e: GameEvent) => void;
  /** Вызывается при гибели игрока (death cam / lock release). */
  onPlayerDeath: () => void;
  /** Optional until bootstrap wires MatchRuntime. */
  getMatch?: () => MatchRuntime | null;
  getTanks?: () => TankEntity[];
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

    const match = this.deps.getMatch?.() ?? null;
    const tanks = this.deps.getTanks?.() ?? [];
    const targetEnt = target as TankEntity;
    const ownerEnt = owner as TankEntity | null;

    if (match) {
      match.onTankKilled(targetEnt, ownerEnt, tanks);
    } else {
      this.deps.emit({
        type: 'kill',
        victim: target.name,
        byPlayer: owner?.isPlayer ?? false,
      });
    }

    if (target.isPlayer) {
      this.deps.audio.death();
      this.deps.audio.stopEngine();
      this.deps.onPlayerDeath();
    }
  }

  onBlockDestroyed = (pos: THREE.Vector3, size: number) => {
    this.deps.effects.explosion(pos, 0xffb02e, size);
    this.deps.effects.debris(pos, 0x6b7688, 18);
    this.deps.audio.explosion();
  };
}
