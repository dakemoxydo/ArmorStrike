// ===== Централизованная система урона: применение урона, разрушение танков и блоков =====
import * as THREE from 'three';
import type { GameEvent } from './Game';
import type { Arena } from './Arena';
import type { Effects } from './effects';
import type { AudioFX } from './audio';
import type { RunState } from './RunState';
import type { TankEntity } from './Tank';
import type { DamageSystem } from './weapons/types';
import { SCORE } from './constants';

export interface CombatDeps {
  arena: Arena;
  effects: Effects;
  audio: AudioFX;
  run: RunState;
  emit: (e: GameEvent) => void;
  /** Вызывается при гибели игрока (Game сбрасывает deathT и отпускает захват мыши). */
  onPlayerDeath: () => void;
}

export class CombatSystem {
  damageSystem: DamageSystem;

  constructor(private deps: CombatDeps) {
    this.damageSystem = {
      applyDamage: (target: TankEntity, dmg: number, source: TankEntity) => {
        this.onTankHit(target, dmg, source);
      },
      applyKnockback: (target: TankEntity, dir: THREE.Vector3, force: number) => {
        target.knockback.addScaledVector(dir, force);
      },
      damageBlock: (blockId: number, dmg: number, hitPos: THREE.Vector3) => {
        const res = this.deps.arena.damageBlock(blockId, dmg);
        if (res === 'destroyed') {
          this.onBlockDestroyed(hitPos, 1.4);
        }
      },
    };
  }

  onTankHit(target: TankEntity, dmg: number, owner: TankEntity) {
    target.takeDamage(dmg, owner.id);
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

    // Сокращенный лог
    if (!target.isPlayer) {

    }

    if (!target.alive) this.onTankDestroyed(target, owner);
  }

  private onTankDestroyed(target: TankEntity, owner: TankEntity | null) {
    const p = target.position.clone().setY(1.4);
    this.deps.effects.explosion(p, target.isPlayer ? 0x2ee6c0 : 0xff7a3d, 1.9);
    this.deps.effects.debris(p, 0xffa050, 26);
    this.deps.audio.explosion();

    if (target.isPlayer) {
      this.deps.audio.death();
      this.deps.audio.stopEngine();
      this.deps.onPlayerDeath();
    } else {
      const byPlayer = owner?.isPlayer ?? false;
      if (byPlayer) { this.deps.run.score += SCORE.kill; this.deps.run.kills += 1; }
      this.deps.emit({ type: 'kill', victim: target.name, byPlayer });
    }
  }

  onBlockDestroyed = (pos: THREE.Vector3, size: number) => {
    this.deps.effects.explosion(pos, 0xffb02e, size);
    this.deps.effects.debris(pos, 0x6b7688, 18);
    this.deps.audio.explosion();
  };
}
