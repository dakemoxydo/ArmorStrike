import * as THREE from 'three';
import { COLORS } from '../../core/constants';
import type { HullId, TurretId } from '../../core/catalog';
import { TURRETS } from '../../core/catalog';
import { buildBotStyle } from '../../core/TankCatalog';
import { Nameplate } from '../nameplate';
import { createTankEntity, createWeapon, type WeaponFactoryDeps } from '../PlayerFactory';
import type { TankEntity } from '../Tank';
import type { TeamId } from '../match/matchTypes';
import type { TankDamagePacket, TankTransformPacket, WeaponFirePacket } from './types';

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
      return tank;
    } catch (err) {
      console.error('[RemotePlayerManager] Failed to spawn peer:', err);
      return null;
    } finally {
      this.pendingSpawns.delete(userId);
    }
  }

  handleTransform(packet: TankTransformPacket) {
    const peer = this.peers.get(packet.userId);
    if (!peer) return;

    peer.targetPos.set(packet.x, 0, packet.z);
    peer.targetYaw = packet.yaw;
    peer.targetAimYaw = packet.aimYaw;
    peer.targetPitch = packet.barrelPitch;
    peer.targetSpeed = packet.speed;
    peer.tank.boosting = packet.boosting;
    peer.lastPacketTime = performance.now();
  }

  handleFire(packet: WeaponFirePacket) {
    const peer = this.peers.get(packet.userId);
    if (!peer || !peer.tank.alive || !peer.tank.weapon) return;

    // Direct fire trigger
    peer.tank.aimYaw = packet.dir ? Math.atan2(packet.dir[0], packet.dir[2]) : peer.tank.aimYaw;
    peer.tank.barrelPitch = packet.barrelPitch;
    peer.tank.weapon.setFire(true);

    // Auto-release trigger on next tick for discrete shot weapons
    if (peer.tank.turretId !== 'flamethrower' && peer.tank.turretId !== 'isida') {
      setTimeout(() => {
        peer.tank.weapon?.setFire(false);
      }, 50);
    }
  }

  handleDamage(packet: TankDamagePacket) {
    const peer = this.peers.get(packet.targetUserId);
    if (!peer) return;

    peer.tank.combat.health = packet.remainingHealth;
    if (packet.isKill && peer.tank.alive) {
      peer.tank.combat.health = 0;
      peer.tank.alive = false;
    }
  }

  removePeer(userId: string) {
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
      t.yaw += this.diffAngle(peer.targetYaw, t.yaw) * lerpFactor;
      t.aimYaw += this.diffAngle(peer.targetAimYaw, t.aimYaw) * lerpFactor;
      t.barrelPitch += (peer.targetPitch - t.barrelPitch) * lerpFactor;
      t.speed = peer.targetSpeed;
    }
  }

  private diffAngle(target: number, current: number): number {
    let diff = (target - current) % (Math.PI * 2);
    if (diff < -Math.PI) diff += Math.PI * 2;
    if (diff > Math.PI) diff -= Math.PI * 2;
    return diff;
  }

  clear() {
    for (const userId of Array.from(this.peers.keys())) {
      this.removePeer(userId);
    }
    this.peers.clear();
    this.pendingSpawns.clear();
  }
}
