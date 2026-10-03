import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import { CombatSystem } from '../game/CombatSystem';
import type { TankEntity } from '../game/Tank';
import type { TankDamagePacket } from '../game/network/types';

/**
 * Репликация урона: порядок доставки tank_damage между отправителями не
 * гарантирован (Supabase broadcast упорядочен только внутри одного
 * отправителя), поэтому damage-снапшот умеет ТОЛЬКО понижать HP.
 * Ветвление по величине remainingHealth раздувало HP и включало healFlash.
 */
function makeCombat() {
  const packets: TankDamagePacket[] = [];
  const events: string[] = [];
  const combat = new CombatSystem({
    arena: { damageBlock: () => null } as any,
    effects: {
      addShake: vi.fn(), explosion: vi.fn(), debris: vi.fn(), spawnWreck: vi.fn(),
    } as any,
    audio: {
      hitPlayer: vi.fn(), hitEnemy: vi.fn(), critHit: vi.fn(), click: vi.fn(),
      explosion: vi.fn(), death: vi.fn(), stopEngine: vi.fn(),
    } as any,
    emit: (e) => events.push(e.type),
    onPlayerDeath: vi.fn(),
    getMatch: () => null,
    getTanks: () => [],
  });
  combat.setNetworkBridge({
    onNetworkDamage: (p) => packets.push(p),
    getLocalNetworkId: () => 'local',
    isNetworkHost: () => false,
  });
  return { combat, packets, events };
}

let _tid = 10;
function makeTank(over: Partial<TankEntity> & { networkId: string }): TankEntity {
  const base = {
    id: _tid++,
    name: over.networkId,
    isPlayer: false,
    isRemote: false,
    health: 100,
    maxHealth: 100,
    alive: true,
    radius: 1.5,
    position: new THREE.Vector3(),
    yaw: 0,
    aimYaw: 0,
    hullId: 'hunter',
    turretId: 'cannon',
    teamId: null,
    networkId: over.networkId,
    knockback: new THREE.Vector3(),
    fx: { hitFlash: 0, healFlash: 0 },
    timeSinceDamaged: 5,
    lastAttackerId: -1,
    invulnT: 0,
    takeDamage(this: TankEntity, d: number, attackerId: number) {
      this.health -= d;
      this.lastAttackerId = attackerId;
      if (this.health <= 0) {
        this.health = 0;
        this.alive = false;
      }
    },
  };
  return { ...base, ...over } as unknown as TankEntity;
}

/** Локальный игрок (target) и удалённый стрелок-владелец (attacker). */
function makePair(health = 100, maxHealth = 100) {
  return {
    local: makeTank({ networkId: 'local', isPlayer: true, health, maxHealth }),
    attacker: makeTank({ networkId: 'peer', isRemote: true }),
  };
}

function dmgPacket(over: Partial<TankDamagePacket> = {}): TankDamagePacket {
  return {
    targetUserId: 'local',
    attackerUserId: 'peer',
    damage: 30,
    remainingHealth: 70,
    isKill: false,
    ...over,
  };
}

describe('CombatSystem.applyReplicatedHit — порядок tank_damage', () => {
  it('переупорядоченный damage-пакет с БОЛЬШИМ остатком не поднимает HP и не лечит', () => {
    // Два бота-хоста выстрелили в одну цель в одном кадре: оба посчитали
    // урон от 100 HP и заэмитили независимые снапшоты (70 и 65).
    const { combat, packets, events } = makeCombat();
    const { local, attacker } = makePair();

    combat.applyReplicatedHit(local, attacker, dmgPacket({ remainingHealth: 65, damage: 35 }));
    expect(local.health).toBe(65);
    expect(local.fx.hitFlash).toBe(1);

    // Второй (задержанный) пакет от ДРУГОГО отправителя: остаток выше
    // локального — раньше он уезжал в ветку хила (70 вместо 35).
    local.timeSinceDamaged = 1.5;
    local.fx.hitFlash = 0;
    combat.applyReplicatedHit(local, attacker, dmgPacket({ remainingHealth: 70, damage: 30 }));

    expect(local.health).toBe(65);
    expect(local.fx.healFlash).toBe(0);
    // Полный no-op: ни hitFlash, ни сброса timeSinceDamaged (иначе ремонт
    // вне боя откладывался бы), ни ре-эмита, ни хит-событий.
    expect(local.fx.hitFlash).toBe(0);
    expect(local.timeSinceDamaged).toBe(1.5);
    expect(packets).toHaveLength(0);
    expect(events).toEqual(['playerHit']);
  });

  it('damage-пакет с остатком === локальному HP — тоже no-op (граница «только вниз»)', () => {
    const { combat, events } = makeCombat();
    const { local, attacker } = makePair(70);

    combat.applyReplicatedHit(local, attacker, dmgPacket({ remainingHealth: 70 }));

    expect(local.health).toBe(70);
    expect(local.fx.healFlash).toBe(0);
    expect(local.fx.hitFlash).toBe(0);
    expect(local.timeSinceDamaged).toBe(5);
    expect(events).toEqual([]);
  });

  it('нефинитный остаток в damage-пакете не поднимает HP и не даёт эффектов', () => {
    const { combat, events } = makeCombat();
    const { local, attacker } = makePair(65);

    combat.applyReplicatedHit(local, attacker, dmgPacket({ remainingHealth: Number.NaN }));
    combat.applyReplicatedHit(local, attacker, dmgPacket({ remainingHealth: Number.POSITIVE_INFINITY }));

    expect(local.health).toBe(65);
    expect(Number.isNaN(local.health)).toBe(false);
    expect(local.fx.healFlash).toBe(0);
    expect(local.fx.hitFlash).toBe(0);
    expect(local.timeSinceDamaged).toBe(5);
    expect(events).toEqual([]);
  });

  it('настоящий heal-пакет поднимает HP и ставит healFlash', () => {
    const { combat, packets, events } = makeCombat();
    const { local, attacker } = makePair(40);

    combat.applyReplicatedHit(local, attacker, dmgPacket({
      damage: 20, remainingHealth: 60, kind: 'heal',
    }));

    expect(local.health).toBe(60);
    expect(local.fx.healFlash).toBe(1);
    // Лечение не хит: ни hitFlash, ни хит-события, ни ре-эмит.
    expect(local.fx.hitFlash).toBe(0);
    expect(local.timeSinceDamaged).toBe(5);
    expect(packets).toHaveLength(0);
    expect(events).toEqual([]);
  });

  it('heal-пакет клампится к maxHealth и не оживает мёртвую цель', () => {
    const { combat } = makeCombat();
    const { local, attacker } = makePair(40, 50);
    combat.applyReplicatedHit(local, attacker, dmgPacket({ remainingHealth: 90, kind: 'heal' }));
    expect(local.health).toBe(50);
    expect(local.fx.healFlash).toBe(1);

    const dead = makeTank({ networkId: 'local', isPlayer: true, health: 0, alive: false });
    combat.applyReplicatedHit(dead, attacker, dmgPacket({ remainingHealth: 80, kind: 'heal' }));
    expect(dead.health).toBe(0);
    expect(dead.alive).toBe(false);
    expect(dead.fx.healFlash).toBe(0);
  });

  it('heal-пакет с НИЖКИМ остатком применяется как авторитетный снапшот', () => {
    // Вне боя TankCombatTimersSystem чинит хп локально, поэтому локальный HP
    // бывает ВЫШЕ остатка из пакета. Это норма, а не повод судить по
    // величине: решение принимается по kind.
    const { combat } = makeCombat();
    const { local, attacker } = makePair(90);

    combat.applyReplicatedHit(local, attacker, dmgPacket({ remainingHealth: 60, kind: 'heal' }));

    expect(local.health).toBe(60);
    expect(local.fx.healFlash).toBe(1);
  });

  it('мусорный остаток в heal-пакете не лечит и не обнуляет HP', () => {
    const { combat } = makeCombat();
    const { local, attacker } = makePair(40);

    combat.applyReplicatedHit(local, attacker, dmgPacket({ remainingHealth: Number.NaN, kind: 'heal' }));
    combat.applyReplicatedHit(local, attacker, dmgPacket({ remainingHealth: -5, kind: 'heal' }));

    expect(local.health).toBe(40);
    expect(local.fx.healFlash).toBe(0);
  });

  it('обычный damage-пакет понижает HP, ставит hitFlash и сбрасывает timeSinceDamaged', () => {
    const { combat, packets, events } = makeCombat();
    const { local, attacker } = makePair();
    local.timeSinceDamaged = 7;

    combat.applyReplicatedHit(local, attacker, dmgPacket({ damage: 30, remainingHealth: 70 }));

    expect(local.health).toBe(70);
    expect(local.fx.hitFlash).toBe(1);
    expect(local.fx.healFlash).toBe(0);
    expect(local.timeSinceDamaged).toBe(0);
    expect(packets).toHaveLength(0);
    expect(events).toEqual(['playerHit']);
  });

  it('убитый целью остаток 0 без isKill тоже убивает (тот же путь)', () => {
    const { combat } = makeCombat();
    const { local, attacker } = makePair(25);

    combat.applyReplicatedHit(local, attacker, dmgPacket({ damage: 25, remainingHealth: 0 }));

    expect(local.alive).toBe(false);
    expect(local.health).toBe(0);
  });

  it('kill-пакет корректно убивает цель', () => {
    const { combat, events } = makeCombat();
    const { local, attacker } = makePair(40);

    combat.applyReplicatedHit(local, attacker, dmgPacket({
      damage: 40, remainingHealth: 0, isKill: true,
    }));

    expect(local.alive).toBe(false);
    expect(local.health).toBe(0);
    expect(events).toEqual(['playerHit', 'kill']);
  });

  it('отдача (kx/kz) применяется и на устаревшем damage-пакете, не поднимая HP', () => {
    const { combat } = makeCombat();
    const { local, attacker } = makePair(65);

    combat.applyReplicatedHit(local, attacker, dmgPacket({
      remainingHealth: 70, kx: 0.5, kz: -1.5,
    }));

    expect(local.knockback.x).toBeCloseTo(0.5, 6);
    expect(local.knockback.z).toBeCloseTo(-1.5, 6);
    expect(local.health).toBe(65);
  });
});