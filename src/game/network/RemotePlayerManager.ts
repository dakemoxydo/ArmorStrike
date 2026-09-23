import * as THREE from 'three';
import { COLORS } from '../../core/constants';
import type { HullId, TurretId } from '../../core/catalog';
import { TURRETS } from '../../core/catalog';
import { buildBotStyle } from '../../core/TankCatalog';
import { Nameplate } from '../nameplate';
import { createTankEntity, createWeapon, type WeaponFactoryDeps } from '../PlayerFactory';
import type { TankEntity } from '../Tank';
import type { TeamId } from '../match/matchTypes';
import { applyRespawnCombat, restoreRespawnVisuals } from '../match/respawn';
import type { TankTransformPacket, WeaponFirePacket } from './types';
import { logError } from '../../lib/log';
import {
  parseHullId,
  parseTeamId,
  parseTurretId,
  shortestAngleDelta,
} from './replication';

interface RemotePeer {
  userId: string;
  username: string;
  tank: TankEntity;
  targetPos: THREE.Vector3;
  targetYaw: number;
  targetAimYaw: number;
  targetPitch: number;
  targetSpeed: number;
  lastPacketTime: number;
}

export class RemotePlayerManager {
  private peers = new Map<string, RemotePeer>();
  private pendingSpawns = new Set<string>();
  private fireTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
  private pendingFire = new Map<string, WeaponFirePacket>();
  private pendingTransform = new Map<string, TankTransformPacket>();
  /** Presentation-only wreck when a transform reports death without a damage packet. */
  onSilentDeath: ((tank: TankEntity) => void) | null = null;

  constructor(
    private scene: THREE.Scene,
    private weaponDeps: WeaponFactoryDeps,
    private tanksList: TankEntity[],
    private nameplates: Map<number, { plate: Nameplate; color: number }>,
  ) {}

  get peerCount(): number {
    return this.peers.size;
  }

  getPeers(): readonly RemotePeer[] {
    return Array.from(this.peers.values());
  }

  async spawnPeer(
    userId: string,
    username: string,
    hullId: HullId,
    turretId: TurretId,
    team: TeamId,
  ): Promise<TankEntity | null> {
    if (this.peers.has(userId) || this.pendingSpawns.has(userId)) {
      return this.peers.get(userId)?.tank ?? null;
    }

    this.pendingSpawns.add(userId);
    try {
      const teamColor = team === 'alpha'
        ? new THREE.Color(COLORS.teamAlpha)
        : team === 'bravo'
        ? new THREE.Color(COLORS.teamBravo)
        : new THREE.Color(COLORS.player);

      const tank = await createTankEntity({
        name: username,
        isPlayer: false,
        hullId,
        turretId,
        style: buildBotStyle(teamColor),
      });

      tank.teamId = team;
      tank.isRemote = true;
      tank.networkId = userId;
      tank.kills = 0;
      tank.deaths = 0;

      if (team) {
        const ringMat = tank.visual.ring.material as THREE.MeshBasicMaterial;
        ringMat.color.setHex(team === 'alpha' ? COLORS.teamAlpha : COLORS.teamBravo);
      }

      this.scene.add(tank.visual.group);
      this.tanksList.push(tank);

      const plate = new Nameplate(username, teamColor.getHex());
      this.scene.add(plate.sprite);
      this.nameplates.set(tank.id, { plate, color: teamColor.getHex() });

      tank.weapon = createWeapon(tank, TURRETS[turretId].weaponType, this.weaponDeps);

      const peer: RemotePeer = {
        userId,
        username,
        tank,
        targetPos: new THREE.Vector3(0, 0, 0),
        targetYaw: 0,
        targetAimYaw: 0,
        targetPitch: 0,
        targetSpeed: 0,
        lastPacketTime: performance.now(),
      };

      this.peers.set(userId, peer);

      const queuedTf = this.pendingTransform.get(userId);
      if (queuedTf) {
        this.pendingTransform.delete(userId);
        this.applyTransform(peer, queuedTf);
      }
      const queuedFire = this.pendingFire.get(userId);
      if (queuedFire) {
        this.pendingFire.delete(userId);
        this.handleFire(queuedFire);
      }

      return tank;
    } catch (err) {
      logError('[RemotePlayerManager] Failed to spawn peer:', err);
      return null;
    } finally {
      this.pendingSpawns.delete(userId);
    }
  }

  handleTransform(packet: TankTransformPacket) {
    const peer = this.peers.get(packet.userId);
    if (!peer) {
      this.pendingTransform.set(packet.userId, packet);
      void this.spawnPeer(
        packet.userId,
        packet.username || 'Боец',
        parseHullId(packet.hullId),
        parseTurretId(packet.turretId),
        parseTeamId(packet.team),
      );
      return;
    }
    this.applyTransform(peer, packet);
  }

  private applyTransform(peer: RemotePeer, packet: TankTransformPacket) {
    const y = packet.y ?? 0;
    peer.targetPos.set(packet.x, y, packet.z);
    peer.targetYaw = packet.yaw;
    peer.targetAimYaw = packet.aimYaw;
    peer.targetPitch = packet.barrelPitch;
    peer.targetSpeed = packet.speed;
    peer.tank.boosting = packet.boosting;
    peer.lastPacketTime = performance.now();

    const tank = peer.tank;
    if (packet.kills !== undefined) tank.kills = packet.kills;
    if (packet.deaths !== undefined) tank.deaths = packet.deaths;
    if (packet.team !== undefined) tank.teamId = parseTeamId(packet.team, tank.teamId);
    if (packet.invulnT !== undefined) tank.invulnT = packet.invulnT;

    const alive = packet.alive;
    if (alive === false && tank.alive) {
      this.onSilentDeath?.(tank);
    } else if (alive === true && !tank.alive) {
      applyRespawnCombat(tank, packet.invulnT ?? 0);
      restoreRespawnVisuals(tank);
      tank.position.set(packet.x, y, packet.z);
      tank.yaw = packet.yaw;
      tank.aimYaw = packet.aimYaw;
      tank.barrelPitch = packet.barrelPitch;
      tank.weapon?.onRespawn?.();
    } else if (packet.health !== undefined && tank.alive) {
      tank.health = packet.health;
    }
  }

  handleFire(packet: WeaponFirePacket) {
    const peer = this.peers.get(packet.userId);
    if (!peer || !peer.tank.weapon) {
      this.pendingFire.set(packet.userId, packet);
      return;
    }

    const prev = this.fireTimeouts.get(packet.userId);
    if (prev) {
      clearTimeout(prev);
      this.fireTimeouts.delete(packet.userId);
    }

    if (packet.firing === false) {
      peer.tank.weapon.setFire(false);
      return;
    }

    if (!peer.tank.alive) return;

    peer.tank.aimYaw = packet.dir ? Math.atan2(packet.dir[0], packet.dir[2]) : peer.tank.aimYaw;
    peer.tank.barrelPitch = packet.barrelPitch;
    peer.tank.weapon.setFire(true);

    if (peer.tank.turretId !== 'flamethrower' && peer.tank.turretId !== 'isida') {
      const id = setTimeout(() => {
        this.fireTimeouts.delete(packet.userId);
        peer.tank.weapon?.setFire(false);
      }, 50);
      this.fireTimeouts.set(packet.userId, id);
    } else {
      // Hold-timeout: continuous weapons keep firing only while hold packets
      // (every ~50ms sync) arrive — a lost release packet no longer sticks.
      const id = setTimeout(() => {
        this.fireTimeouts.delete(packet.userId);
        peer.tank.weapon?.setFire(false);
      }, 250);
      this.fireTimeouts.set(packet.userId, id);
    }
  }

  removePeer(userId: string) {
    const to = this.fireTimeouts.get(userId);
    if (to) {
      clearTimeout(to);
      this.fireTimeouts.delete(userId);
    }
    const peer = this.peers.get(userId);
    if (!peer) return;

    const tank = peer.tank;
    this.scene.remove(tank.visual.group);
    tank.dispose(this.scene);

    const np = this.nameplates.get(tank.id);
    if (np) {
      this.scene.remove(np.plate.sprite);
      np.plate.dispose(this.scene);
      this.nameplates.delete(tank.id);
    }

    const idx = this.tanksList.indexOf(tank);
    if (idx !== -1) {
      this.tanksList.splice(idx, 1);
    }

    this.peers.delete(userId);
  }

  update(dt: number) {
    const now = performance.now();
    const lerpFactor = Math.min(1, dt * 14);

    for (const [userId, peer] of this.peers) {
      // Timeout check: if no packets for > 15 seconds, remove peer
      if (now - peer.lastPacketTime > 15000) {
        this.removePeer(userId);
        continue;
      }

      const t = peer.tank;
      if (!t.alive) continue;

      // Position interpolation
      t.position.lerp(peer.targetPos, lerpFactor);
      t.visual.group.position.copy(t.position);

      // Yaw angular interpolation
      t.yaw += shortestAngleDelta(peer.targetYaw, t.yaw) * lerpFactor;
      t.aimYaw += shortestAngleDelta(peer.targetAimYaw, t.aimYaw) * lerpFactor;
      t.barrelPitch += (peer.targetPitch - t.barrelPitch) * lerpFactor;
      t.speed = peer.targetSpeed;
    }
  }

  clear() {
    for (const userId of Array.from(this.peers.keys())) {
      this.removePeer(userId);
    }
    this.peers.clear();
    this.pendingSpawns.clear();
    this.pendingFire.clear();
    this.pendingTransform.clear();
  }

  tankByNetworkId(userId: string): TankEntity | null {
    return this.peers.get(userId)?.tank ?? null;
  }
}
