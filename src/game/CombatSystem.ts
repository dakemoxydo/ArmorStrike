// ===== Боевая система: гибель танков, эффекты и события боя =====
// Владеет damageSystem (через core/createDamageSystem) и надстраивает поверх
// него визуальные эффекты, звук и эмит событий для HUD.
// Match kill credit / respawn — MatchRuntime.
import * as THREE from 'three';
import type { GameEvent } from './types';
import type { Arena } from './Arena';
import type { EffectsPort } from './ports/EffectsPort';
import type { AudioPort } from './ports/AudioPort';
import type { DamageInfo, TankLike } from '../core/types';
import { COLORS } from '../core/constants';
import { createDamageSystem } from '../core/DamageSystem';
import type { TankEntity } from './Tank';
import type { MatchRuntime } from './match/MatchRuntime';
import { KillStreakTracker } from './KillStreakTracker';
import { FLOAT_HEIGHT, FLOAT_JITTER } from './damageFloats';
import type { DamageFloatKind, DamageFloatQueue } from './damageFloats';

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
  /** Hit-stop + slow-mo на убийстве (вызывается из onTankDestroyed). */
  onKillPunch?: (byPlayer: boolean) => void;
  /** Очередь всплывающих чисел HUD (п.1). Без неё канал просто выключен. */
  floats?: DamageFloatQueue;
}

/**
 * Над стрелком-игроком показываем все попадания; числа входящего урона по
 * игроку не дублируются — для этого уже есть виньетка, дуга и хитмаркер
 * (канон Tanki: числа видит тот, кто нанёс урон; лечение видят оба).
 * Точка и джиттер числа — FLOAT_HEIGHT / FLOAT_JITTER (damageFloats.ts).
 */
/** Минимальный интервал между «ИММУНИТЕТ»-подсказками (огнемёт бьёт 10 тиков/с). */
const IMMUNITY_CUE_MS = 320;

export class CombatSystem {
  damageSystem: ReturnType<typeof createDamageSystem>;
  private streakTracker = new KillStreakTracker();
  private matchTime = 0;
  /** Best player kill streak of the current match (H4, shown on results). */
  private playerBest = 0;
  /** ms-таймстемп последнего «ИММУНИТЕТ»-cue (частота, см. IMMUNITY_CUE_MS). */
  private lastImmunityCue = 0;

  constructor(private deps: CombatDeps) {
    this.damageSystem = createDamageSystem(deps.arena, {
      onTankDamaged: (target, dmg, source, info) =>
        this.onTankDamaged(target, dmg, source, info),
      onDamageIgnored: (target, source) => this.onDamageIgnored(target, source),
      onBlockDestroyed: (pos, size) => this.onBlockDestroyed(pos, size),
    });
  }

  /** Мировая точка над целью + джиттер: origin всплывающего числа. */
  private pushFloat(target: TankLike, value: number, kind: DamageFloatKind) {
    const q = this.deps.floats;
    if (!q) return;
    const r = Math.random;
    q.push(
      target.position.x + (r() - 0.5) * FLOAT_JITTER,
      target.position.y + FLOAT_HEIGHT,
      target.position.z + (r() - 0.5) * FLOAT_JITTER,
      value,
      kind,
    );
  }

  /** Устанавливает колбэк hit-stop/slow-mo (вызывается из bootstrap после создания GameLoop). */
  setOnKillPunch(fn: (byPlayer: boolean) => void) {
    this.deps.onKillPunch = fn;
  }

  /** Обновляет время матча для streak tracker. */
  setMatchTime(t: number) {
    this.matchTime = t;
  }

  /** Сброс streak tracker (при смерти игрока / смене раунда). */
  resetStreaks() {
    this.streakTracker.reset();
    this.playerBest = 0;
  }

  /** Лучшая серия игрока в текущем матче (не сбрасывается смертью). */
  get playerBestStreak(): number {
    return this.playerBest;
  }

  /**
   * Эффекты/звук/события после применения чистого урона.
   * target.takeDamage(dmg, source.id) уже вызван в DamageSystem.applyDamage.
   */
  onTankDamaged(target: TankLike, dmg: number, owner: TankLike, info?: DamageInfo) {
    if (target.isPlayer) {
      this.deps.audio.hitPlayer();
      this.deps.effects.addShake(0.3);
      const dx = owner.position.x - target.position.x;
      const dz = owner.position.z - target.position.z;
      // Индикатор урона на экране должен быть согласован с ракурсом камеры (aimYaw),
      // а не с поворотом корпуса (yaw), чтобы стрелка точно указывала на стрелка.
      const lookYaw = target.aimYaw ?? target.yaw;
      const fs = Math.sin(lookYaw);
      const fc = Math.cos(lookYaw);
      const dir = (dx * dx + dz * dz) > 0.01
        ? Math.atan2(dx * fc - dz * fs, dx * fs + dz * fc)
        : 0;
      this.deps.emit({ type: 'playerHit', dir });
    } else {
      this.deps.audio.hitEnemy();
      if (owner.isPlayer) {
        this.deps.emit({ type: 'enemyHit', killed: !target.alive });
        // Числа урона видит стрелок (канон Tanki): белый / оранжевый крит /
        // красный добивающий. Входящий урон по себе числами не дублируется.
        const kind: DamageFloatKind = !target.alive
          ? 'kill'
          : info?.crit ? 'crit' : 'normal';
        this.pushFloat(target, dmg, kind);
        if (info?.crit) this.deps.audio.critHit();
      }
    }

    if (!target.alive) this.onTankDestroyed(target, owner);
  }

  /**
   * Попадание в респавн-щит: урон поглотила неуязвимость (п.15). Стрелок-игрок
   * получает число «ИММУНИТЕТ» и сухой щелчок — без этого выстрел в щит
   * выглядит как сломавшееся оружие. Купол над целью рисует TankAnimationSystem.
   *
   * Частота ограничена: огнемёт даёт 10 тиков/с, а cue — один на «событие
   * попадания в щит», а не на тик.
   */
  private onDamageIgnored(target: TankLike, owner: TankLike) {
    if (!owner.isPlayer) return;
    const now = performance.now();
    if (now - this.lastImmunityCue < IMMUNITY_CUE_MS) return;
    this.lastImmunityCue = now;
    this.pushFloat(target, 0, 'immunity');
    this.deps.audio.click();
  }

  private onTankDestroyed(target: TankLike, owner: TankLike | null) {
    const p = target.position.clone().setY(1.4);
    this.deps.effects.explosion(p, target.isPlayer ? COLORS.player : 0xff7a3d, 1.9);
    this.deps.effects.debris(p, 0xffa050, 26);
    if (target.isPlayer) {
      this.deps.audio.explosion();
    } else {
      this.deps.audio.explosion(target.position);
    }

    // Горящие обломки на месте гибели
    this.deps.effects.spawnWreck(target.position.clone(), target.yaw, target.isPlayer ? COLORS.player : 0xff7a3d);

    // Hit-stop + slow-mo для драматичности убийства
    const byPlayer = owner?.isPlayer ?? false;
    this.deps.onKillPunch?.(byPlayer);
    // Усиленная тряска камеры на убийстве
    this.deps.effects.addShake(byPlayer ? 0.55 : 0.35);

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

    // Kill streak tracking (только для игрока)
    if (byPlayer) {
      const streak = this.streakTracker.registerKill(this.matchTime);
      this.playerBest = Math.max(this.playerBest, this.streakTracker.windowCount);
      if (streak) {
        this.deps.emit({ type: 'killStreak', count: streak.count, label: streak.label });
      }
    }

    if (target.isPlayer) {
      this.deps.audio.death();
      this.deps.audio.stopEngine();
      this.deps.onPlayerDeath();
      // Сбрасываем streak при смерти игрока
      this.streakTracker.reset();
    }
  }

  onBlockDestroyed = (pos: THREE.Vector3, size: number) => {
    this.deps.effects.explosion(pos, 0xffb02e, size);
    this.deps.effects.debris(pos, 0x6b7688, 18);
    this.deps.audio.explosion(pos);
  };
}
