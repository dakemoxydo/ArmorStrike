// ===== Multiplayer session: pose, combat, match, host bots =====
import type { FrameContext } from '../engine/stages/types';
import type { GameSimulation } from '../engine/GameSimulation';
import type { CombatSystem } from '../CombatSystem';
import type { WeaponFactoryDeps } from '../PlayerFactory';
import type { TankEntity } from '../Tank';
import type { TeamId } from '../match/matchTypes';
import { isTeamMode } from '../match/teams';
import { makeBot } from '../match/rosterSpawn';
import {
  ALPHA_SPAWN_POINTS,
  BRAVO_SPAWN_POINTS,
  FFA_SPAWN_POINTS,
  MIN_BOT_SPAWN_DIST,
  pickPointIndex,
} from '../match/spawnPoints';
import type {
  BlockDestroyPacket,
  MatchSyncPacket,
  PeerDespawnPacket,
  RoomData,
  TankDamagePacket,
  TankTransformPacket,
  WeaponFirePacket,
} from './types';
import type { MultiplayerService, PlayerProfileInfo } from './multiplayerService';
import type { RemotePlayerManager } from './RemotePlayerManager';
import {
  botNetworkId,
  desiredBotCount,
  isRemoteSource,
  packTransform,
  parseHullId,
  parseTeamId,
  parseTurretId,
} from './replication';
import type { HullId, TurretId } from '../../core/catalog';
import type { GameEvent } from '../types';
import type * as THREE from 'three';

export class NetworkSession {
  private service: MultiplayerService;
  private remotes: RemotePlayerManager;
  private isHost: boolean;
  private localId: string;
  private room: RoomData;
  private syncTimer = 0;
  private readonly syncInterval = 0.05;
  private readonly matchInterval = 0.5;
  private matchTimer = 0;
  private localWasFiring = false;
  private readonly botWasFiring = new Map<string, boolean>();
  private nextBotSlot = 0;
  private fillingBots = false;

  constructor(
    private readonly deps: {
      sim: GameSimulation;
      scene: THREE.Scene;
      weaponDeps: WeaponFactoryDeps;
      combat: CombatSystem;
      room: RoomData;
      isHost: boolean;
      localId: string;
      localTeam: TeamId;
      service: MultiplayerService;
      remotes: RemotePlayerManager;
      emitEvent?: (e: GameEvent) => void;
    },
  ) {
    this.service = deps.service;
    this.remotes = deps.remotes;
    this.isHost = deps.isHost;
    this.localId = deps.localId;
    this.room = deps.room;

    this.remotes.onSilentDeath = (tank) => deps.combat.playDeathPresentation(tank);
    deps.combat.setNetworkBridge({
      onNetworkDamage: (pkt) => this.service.sendDamage(pkt),
      onNetworkBlock: (blockId) => this.service.sendBlockDestroy(blockId),
      getLocalNetworkId: () => this.localId,
      isNetworkHost: () => this.isHost,
    });
    if (!deps.weaponDeps.healthNet) {
      deps.weaponDeps.healthNet = { emit: () => undefined };
    }
    deps.weaponDeps.healthNet.emit = (target, remaining, delta) => {
      const tid = target.networkId;
      const aid = deps.sim.player?.networkId;
      if (!tid || !aid) return;
      if (!isRemoteSource(target) && tid !== this.localId) return;
      this.service.sendDamage({
        targetUserId: tid,
        attackerUserId: aid,
        damage: delta,
        remainingHealth: remaining,
        isKill: false,
        kind: 'heal',
      });
    };
  }

  bootstrapRoster() {
    const sim = this.deps.sim;
    if (sim.player) sim.player.networkId = this.localId;
    if (this.isHost) {
      let slot = 0;
      for (const b of sim.bots.bots) {
        b.tank.networkId = botNetworkId(slot++);
      }
      this.nextBotSlot = slot;
      void this.reconcileBots(1);
    }
  }

  connect(profile: PlayerProfileInfo) {
    this.service.connectToRoom(this.room.id, profile, (event, payload) => {
      this.handleEvent(event, payload);
    });
  }

  notifyMatchOver() {
    if (!this.isHost) return;
    this.service.sendMatchSync(this.deps.sim.match.toSyncPacket(true));
  }

  dispose() {
    this.deps.combat.setNetworkBridge(null);
    if (this.deps.weaponDeps.healthNet) {
      this.deps.weaponDeps.healthNet.emit = () => undefined;
    }
    this.remotes.onSilentDeath = null;
  }

  handleEvent(event: string, payload: unknown) {
    if (event === 'tank_transform') {
      this.remotes.handleTransform(payload as TankTransformPacket);
    } else if (event === 'weapon_fire') {
      this.remotes.handleFire(payload as WeaponFirePacket);
    } else if (event === 'tank_damage') {
      this.applyDamagePacket(payload as TankDamagePacket);
    } else if (event === 'match_sync') {
      if (!this.isHost) {
        this.deps.sim.match.applyHostSync(payload as MatchSyncPacket, this.deps.sim.player);
      }
    } else if (event === 'block_destroy') {
      const blockId = (payload as BlockDestroyPacket | undefined)?.blockId;
      if (typeof blockId === 'number') this.deps.combat.applyReplicatedBlock(blockId);
    } else if (event === 'peer_despawn') {
      const id = (payload as PeerDespawnPacket | undefined)?.userId;
      if (id) this.remotes.removePeer(id);
    } else if (event === 'presence_sync') {
      this.handlePresence(payload);
    } else if (event === 'player_left') {
      if (Array.isArray(payload)) {
        for (const p of payload as Array<{ userId?: string }>) {
          if (p.userId) this.remotes.removePeer(p.userId);
        }
      }
      if (this.isHost) void this.reconcileBots();
    }
  }

  tick(ctx: FrameContext): void {
    this.remotes.update(ctx.dt);
    if (!ctx.player) return;

    this.syncTimer += ctx.dt;
    if (this.syncTimer >= this.syncInterval) {
      this.syncTimer = 0;
      this.sendOwnedTransforms(ctx.player);
    }

    this.sendOwnedFire(ctx.player);

    if (this.isHost) {
      this.matchTimer += ctx.dt;
      if (this.matchTimer >= this.matchInterval || this.deps.sim.match.ended) {
        this.matchTimer = 0;
        this.service.sendMatchSync(this.deps.sim.match.toSyncPacket());
      }
    }
  }

  findTank(networkId: string): TankEntity | null {
    const sim = this.deps.sim;
    if (sim.player?.networkId === networkId) return sim.player;
    const remote = this.remotes.tankByNetworkId(networkId);
    if (remote) return remote;
    for (const t of sim.tanks) {
      if (t.networkId === networkId) return t;
    }
    return null;
  }

  private applyDamagePacket(packet: TankDamagePacket) {
    const target = this.findTank(packet.targetUserId);
    if (!target) return;
    const attacker = this.findTank(packet.attackerUserId);
    this.deps.combat.applyReplicatedHit(target, attacker, packet);
  }

  private sendOwnedTransforms(player: TankEntity) {
    this.service.sendTransform(this.packTank(player, this.localId));
    if (!this.isHost) return;
    for (const b of this.deps.sim.bots.bots) {
      const id = b.tank.networkId;
      if (!id) continue;
      this.service.sendTransform(this.packTank(b.tank, id));
    }
  }

  private packTank(tank: TankEntity, userId: string): TankTransformPacket {
    return packTransform(userId, {
      x: tank.position.x,
      y: tank.position.y,
      z: tank.position.z,
      yaw: tank.yaw,
      aimYaw: tank.aimYaw,
      barrelPitch: tank.barrelPitch,
      speed: tank.speed,
      boosting: Boolean(tank.boosting),
      health: tank.health,
      maxHealth: tank.maxHealth,
      alive: tank.alive,
      invulnT: tank.invulnT,
      kills: tank.kills,
      deaths: tank.deaths,
      team: tank.teamId,
      hullId: tank.hullId,
      turretId: tank.turretId,
      username: tank.name,
    }, performance.now());
  }

  private sendOwnedFire(player: TankEntity) {
    this.sendFireEdge(player, this.localId, this.localWasFiring, (v) => {
      this.localWasFiring = v;
    }, true);
    if (!this.isHost) return;
    for (const b of this.deps.sim.bots.bots) {
      const id = b.tank.networkId;
      if (!id) continue;
      const prev = this.botWasFiring.get(id) ?? false;
      this.sendFireEdge(b.tank, id, prev, (v) => {
        this.botWasFiring.set(id, v);
      }, false);
    }
  }

  private sendFireEdge(
    tank: TankEntity,
    userId: string,
    wasFiring: boolean,
    setWas: (v: boolean) => void,
    usePlayerInput: boolean,
  ) {
    const wants = usePlayerInput
      ? Boolean(tank.alive && this.deps.sim.input.wantsFire && this.deps.sim.input.enabled)
      : Boolean(tank.alive && tank.weapon);
    // Bots: WeaponFireStage already applied setFire from ai.wantsFire.
    const isFiring = usePlayerInput
      ? wants
      : Boolean(tank.alive && this.botWantsFire(tank));
    const continuous = tank.turretId === 'flamethrower' || tank.turretId === 'isida'
      || tank.turretId === 'railgun' || tank.turretId === 'gauss';
    const edge = isFiring !== wasFiring;
    const holdTick = isFiring && continuous && this.syncTimer === 0;
    if ((edge || holdTick) && tank.turretId) {
      const cp = Math.cos(tank.barrelPitch);
      this.service.sendFire({
        userId,
        turretId: tank.turretId,
        origin: [tank.position.x, 1.2, tank.position.z],
        dir: [
          Math.sin(tank.aimYaw) * cp,
          Math.sin(tank.barrelPitch),
          Math.cos(tank.aimYaw) * cp,
        ],
        barrelPitch: tank.barrelPitch,
        timestamp: performance.now(),
        firing: isFiring,
      });
    }
    setWas(isFiring);
  }

  private botWantsFire(tank: TankEntity): boolean {
    for (const b of this.deps.sim.bots.bots) {
      if (b.tank === tank) return Boolean(b.ai.wantsFire);
    }
    return false;
  }

  private handlePresence(payload: unknown) {
    if (!payload || typeof payload !== 'object') return;
    const dict = payload as Record<string, unknown>;
    const humanIds = new Set<string>();
    for (const key of Object.keys(dict)) {
      const presences = dict[key];
      if (!Array.isArray(presences)) continue;
      for (const raw of presences as Array<{
        userId?: string;
        username?: string;
        hullId?: HullId;
        turretId?: TurretId;
        team?: TeamId;
      }>) {
        const id = raw.userId || key;
        if (!id) continue;
        humanIds.add(id);
        if (id === this.localId) continue;
        void this.remotes.spawnPeer(
          id,
          raw.username || 'Боец',
          parseHullId(raw.hullId),
          parseTurretId(raw.turretId),
          parseTeamId(raw.team, this.fallbackPeerTeam()),
        );
      }
    }
    humanIds.add(this.localId);

    // Удаляем фантомные танки игроков, покинувших Presence (без ожидания 15 сек таймаута)
    for (const peer of this.remotes.getPeers()) {
      if (!peer.userId.startsWith('bot:') && !humanIds.has(peer.userId)) {
        this.remotes.removePeer(peer.userId);
      }
    }

    // Если хост покинул комнату — уведомляем клиентов о разрыве соединения с хостом
    if (!this.isHost && this.room.host_id && !humanIds.has(this.room.host_id)) {
      this.deps.emitEvent?.({ type: 'hostDisconnected' });
    }

    if (this.isHost) void this.reconcileBots(humanIds.size);
  }

  private fallbackPeerTeam(): TeamId {
    if (this.room.mode === 'deathmatch') return null;
    return this.deps.localTeam === 'alpha' ? 'bravo' : 'alpha';
  }

  private async reconcileBots(humanCount?: number) {
    if (!this.isHost || this.fillingBots) return;
    const humans = humanCount ?? this.countHumans();
    const desired = desiredBotCount({
      botsEnabled: this.room.bots_enabled,
      maxPlayers: this.room.max_players,
      humanCount: humans,
      mode: this.room.mode,
      dmBotCount: this.deps.sim.match.config.dmBotCount,
      teamSize: this.deps.sim.match.config.teamSize,
    });
    const bots = this.deps.sim.bots.bots;
    while (bots.length > desired) {
      const entry = bots.pop();
      if (!entry) break;
      this.despawnHostBot(entry.tank);
    }
    if (bots.length >= desired) return;
    this.fillingBots = true;
    try {
      while (this.deps.sim.bots.bots.length < desired) {
        await this.spawnHostBot();
      }
    } finally {
      this.fillingBots = false;
    }
  }

  private countHumans(): number {
    let n = 1;
    for (const t of this.deps.sim.tanks) {
      if (t.isRemote && t.networkId && !t.networkId.startsWith('bot:')) n += 1;
    }
    return n;
  }

  private despawnHostBot(tank: TankEntity) {
    const id = tank.networkId;
    const sim = this.deps.sim;
    const idx = sim.tanks.indexOf(tank);
    if (idx !== -1) sim.tanks.splice(idx, 1);
    sim.bots.bots = sim.bots.bots.filter((b) => b.tank !== tank);
    const np = sim.nameplates.get(tank.id);
    if (np) {
      this.deps.scene.remove(np.plate.sprite);
      np.plate.dispose(this.deps.scene);
      sim.nameplates.delete(tank.id);
    }
    this.deps.scene.remove(tank.visual.group);
    tank.dispose(this.deps.scene);
    if (id) {
      this.botWasFiring.delete(id);
      this.service.sendPeerDespawn(id);
    }
  }

  private async spawnHostBot() {
    const sim = this.deps.sim;
    const team = this.pickFillTeam();
    const pool = team === 'bravo'
      ? BRAVO_SPAWN_POINTS
      : team === 'alpha'
        ? ALPHA_SPAWN_POINTS
        : FFA_SPAWN_POINTS;
    const used = new Set<number>();
    const px = sim.player?.position.x ?? 0;
    const pz = sim.player?.position.z ?? 0;
    const idx = pickPointIndex(pool, used, px, pz, MIN_BOT_SPAWN_DIST);
    const [x, z] = pool[idx];
    const slot = this.nextBotSlot++;
    const entry = await makeBot(slot, team, x, z, {
      scene: this.deps.scene,
      weaponDeps: this.deps.weaponDeps,
      tanks: sim.tanks,
      nameplates: sim.nameplates,
      hullId: sim.run.currentHull,
      turretId: sim.run.currentTurret,
    });
    entry.tank.networkId = botNetworkId(slot);
    sim.bots.bots.push(entry);
  }

  private pickFillTeam(): TeamId {
    if (!isTeamMode(this.room.mode)) return null;
    let alpha = 0;
    let bravo = 0;
    for (const t of this.deps.sim.tanks) {
      if (t.teamId === 'alpha') alpha += 1;
      if (t.teamId === 'bravo') bravo += 1;
    }
    return alpha <= bravo ? 'alpha' : 'bravo';
  }
}
