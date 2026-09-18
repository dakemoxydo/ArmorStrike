import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import {
  botNetworkId,
  desiredBotCount,
  isBotNetworkId,
  isRemoteSource,
  localPlayerWonFromSync,
  netRound,
  ownsCombatSource,
  packTransform,
  parseHullId,
  parseTeamId,
  shortestAngleDelta,
} from '../game/network/replication';
import { combatAllowsImpulse } from '../game/engine/applyHit';
import { CombatSystem } from '../game/CombatSystem';
import type { TankEntity } from '../game/Tank';
import type { TankDamagePacket } from '../game/network/types';

describe('replication helpers', () => {
  it('bot ids are stable and detectable', () => {
    expect(botNetworkId(3)).toBe('bot:3');
    expect(isBotNetworkId('bot:3')).toBe(true);
    expect(isBotNetworkId('user-1')).toBe(false);
  });

  it('desiredBotCount fills to cap and yields as humans join', () => {
    expect(desiredBotCount({
      botsEnabled: false, maxPlayers: 8, humanCount: 1,
      mode: 'deathmatch', dmBotCount: 7, teamSize: 5,
    })).toBe(0);
    expect(desiredBotCount({
      botsEnabled: true, maxPlayers: 8, humanCount: 1,
      mode: 'deathmatch', dmBotCount: 7, teamSize: 5,
    })).toBe(7);
    expect(desiredBotCount({
      botsEnabled: true, maxPlayers: 8, humanCount: 3,
      mode: 'deathmatch', dmBotCount: 7, teamSize: 5,
    })).toBe(5);
    expect(desiredBotCount({
      botsEnabled: true, maxPlayers: 8, humanCount: 8,
      mode: 'team_deathmatch', dmBotCount: 7, teamSize: 5,
    })).toBe(0);
  });

  it('ownsCombatSource: local player and host bots, not remotes', () => {
    expect(ownsCombatSource({ networkId: 'me', isPlayer: true }, 'me', false)).toBe(true);
    expect(ownsCombatSource({ networkId: 'peer', isRemote: true }, 'me', true)).toBe(false);
    expect(ownsCombatSource({ networkId: 'bot:0', isRemote: false }, 'me', true)).toBe(true);
    expect(ownsCombatSource({ networkId: 'bot:0', isRemote: false }, 'me', false)).toBe(false);
  });

  it('packTransform includes combat snapshot', () => {
    const pkt = packTransform('u1', {
      x: 1.234, y: 0.5, z: -8.76, yaw: 1.2345, aimYaw: 0, barrelPitch: 0.12,
      speed: 9.87, boosting: true, health: 88.2, maxHealth: 120, alive: true,
      invulnT: 1.25, kills: 2, deaths: 1, team: 'alpha', hullId: 'hunter',
      turretId: 'railgun', username: 'Ace',
    }, 10);
    expect(pkt.userId).toBe('u1');
    expect(pkt.y).toBe(0.5);
    expect(pkt.health).toBe(88.2);
    expect(pkt.alive).toBe(true);
    expect(pkt.team).toBe('alpha');
    expect(pkt.hullId).toBe('hunter');
  });

  it('parse helpers and angle wrap', () => {
    expect(parseHullId('nope')).toBe('hunter');
    expect(parseTeamId('bravo')).toBe('bravo');
    expect(parseTeamId('x')).toBe(null);
    expect(shortestAngleDelta(Math.PI * 2 - 0.1, 0.1)).toBeCloseTo(-0.2, 5);
    expect(netRound(1.239, 2)).toBe(1.24);
    expect(isRemoteSource({ isRemote: true })).toBe(true);
  });

  it('localPlayerWonFromSync uses team then name', () => {
    expect(localPlayerWonFromSync(
      { winnerTeam: 'bravo', winnerName: null },
      { teamId: 'bravo', name: 'Me' },
    )).toBe(true);
    expect(localPlayerWonFromSync(
      { winnerTeam: null, winnerName: 'Me' },
      { teamId: null, name: 'Me' },
    )).toBe(true);
  });
});

describe('remote source combat gates', () => {
  it('applyHit does not shove a hull when the shooter is remote', () => {
    const target = {
      alive: true, id: 2, invulnT: 0, teamId: null,
      knockback: new THREE.Vector3(),
    };
    const source = { alive: true, id: 1, isRemote: true, teamId: null };
    expect(combatAllowsImpulse(target as any, source as any)).toBe(false);
  });
});

describe('CombatSystem.applyReplicatedHit', () => {
  function makeCombat() {
    const packets: TankDamagePacket[] = [];
    const combat = new CombatSystem({
      arena: { damageBlock: () => null } as any,
      effects: {
        addShake: vi.fn(), explosion: vi.fn(), debris: vi.fn(), spawnWreck: vi.fn(),
      } as any,
      audio: { hitPlayer: vi.fn(), hitEnemy: vi.fn(), explosion: vi.fn(), death: vi.fn(), stopEngine: vi.fn(), critHit: vi.fn(), click: vi.fn() } as any,
      emit: vi.fn(),
      onPlayerDeath: vi.fn(),
      getMatch: () => null,
      getTanks: () => [],
    });
    combat.setNetworkBridge({
      onNetworkDamage: (p) => packets.push(p),
      getLocalNetworkId: () => 'local',
      isNetworkHost: () => false,
    });
    return { combat, packets };
  }

  function tank(over: Partial<TankEntity> & { id: number; networkId: string }): TankEntity {
    const base = {
      name: over.networkId,
      isPlayer: false,
      isRemote: false,
      health: 100,
      maxHealth: 100,
      alive: true,
      position: new THREE.Vector3(),
      yaw: 0,
      knockback: new THREE.Vector3(),
      fx: { hitFlash: 0, healFlash: 0 },
      timeSinceDamaged: 99,
      lastAttackerId: -1,
      takeDamage(this: TankEntity, d: number) {
        this.health -= d;
        if (this.health <= 0) {
          this.health = 0;
          this.alive = false;
        }
      },
    };
    return { ...base, ...over } as unknown as TankEntity;
  }

  it('applies remainingHealth on the local player and does not re-broadcast', () => {
    const { combat, packets } = makeCombat();
    const local = tank({ id: 1, networkId: 'local', isPlayer: true, health: 100 });
    const attacker = tank({ id: 2, networkId: 'peer', isRemote: true });
    combat.applyReplicatedHit(local, attacker, {
      targetUserId: 'local',
      attackerUserId: 'peer',
      damage: 25,
      remainingHealth: 75,
      isKill: false,
    });
    expect(local.health).toBe(75);
    expect(packets).toHaveLength(0);
  });

  it('skips apply when this client already simulated the shot', () => {
    const { combat } = makeCombat();
    const remote = tank({ id: 2, networkId: 'peer', isRemote: true, health: 80 });
    const local = tank({ id: 1, networkId: 'local', isPlayer: true });
    combat.applyReplicatedHit(remote, local, {
      targetUserId: 'peer',
      attackerUserId: 'local',
      damage: 20,
      remainingHealth: 60,
      isKill: false,
    });
    expect(remote.health).toBe(80);
  });

  it('kill snapshot destroys a still-living target', () => {
    const { combat } = makeCombat();
    const local = tank({ id: 1, networkId: 'local', isPlayer: true, health: 10 });
    const attacker = tank({ id: 2, networkId: 'peer', isRemote: true });
    combat.applyReplicatedHit(local, attacker, {
      targetUserId: 'local',
      attackerUserId: 'peer',
      damage: 40,
      remainingHealth: 0,
      isKill: true,
    });
    expect(local.alive).toBe(false);
    expect(local.health).toBe(0);
  });
});
