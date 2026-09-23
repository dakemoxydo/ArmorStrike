import type { HullId, TurretId } from '../../core/catalog';
import type { MatchModeId, TeamId } from '../match/matchTypes';
import type { MapId } from '../maps/mapCatalog';

export interface RoomData {
  id: string;
  name: string;
  host_id: string;
  host_name: string;
  mode: MatchModeId;
  map_id: MapId;
  max_players: number;
  player_count: number;
  has_password: boolean;
  bots_enabled: boolean;
  status: 'waiting' | 'in_progress' | 'ended';
  created_at?: string;
  last_heartbeat?: string;
}

export interface CreateRoomOptions {
  name: string;
  mode: MatchModeId;
  map_id: MapId;
  max_players?: number;
  password?: string;
  bots_enabled?: boolean;
}

export interface TankTransformPacket {
  userId: string;
  x: number;
  /** Vertical pose (ramps). Omitted packets read as 0. */
  y?: number;
  z: number;
  yaw: number;
  aimYaw: number;
  barrelPitch: number;
  speed: number;
  boosting: boolean;
  timestamp: number;
  /** Owner-reconciled combat snapshot (lossy broadcast recovery). */
  health?: number;
  maxHealth?: number;
  alive?: boolean;
  invulnT?: number;
  kills?: number;
  deaths?: number;
  team?: TeamId;
  hullId?: HullId;
  turretId?: TurretId;
  username?: string;
}

export interface WeaponFirePacket {
  userId: string;
  turretId: TurretId;
  origin: [number, number, number];
  dir: [number, number, number];
  barrelPitch: number;
  timestamp: number;
  /** false = release trigger (required for flame/Isida stop). Omitted = fire. */
  firing?: boolean;
}

export interface TankDamagePacket {
  targetUserId: string;
  attackerUserId: string;
  damage: number;
  remainingHealth: number;
  isKill: boolean;
  /** Heal ticks (Isida) reuse this packet with kind='heal'. */
  kind?: 'damage' | 'heal';
  kx?: number;
  kz?: number;
}

export interface MatchSyncPacket {
  timeSec: number;
  teamScore?: { alpha: number; bravo: number };
  teamKills?: { alpha: number; bravo: number };
  captures?: {
    id: string;
    owner: TeamId;
    progress: number;
    contested?: boolean;
    actor?: TeamId;
  }[];
  ended?: boolean;
  reason?: 'score' | 'time';
  winnerName?: string | null;
  winnerTeam?: TeamId;
}

export interface PeerDespawnPacket {
  userId: string;
}

export interface BlockDestroyPacket {
  blockId: number;
}
