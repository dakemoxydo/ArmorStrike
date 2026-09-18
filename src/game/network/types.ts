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

export interface RoomPlayer {
  id?: string;
  room_id: string;
  user_id: string;
  username: string;
  hull_id: HullId;
  turret_id: TurretId;
  team: TeamId;
  is_host: boolean;
  ping: number;
  joined_at?: string;
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
  z: number;
  yaw: number;
  aimYaw: number;
  barrelPitch: number;
  speed: number;
  boosting: boolean;
  timestamp: number;
}

export interface WeaponFirePacket {
  userId: string;
  turretId: TurretId;
  origin: [number, number, number];
  dir: [number, number, number];
  barrelPitch: number;
  timestamp: number;
}

export interface TankDamagePacket {
  targetUserId: string;
  attackerUserId: string;
  damage: number;
  remainingHealth: number;
  isKill: boolean;
}

export interface MatchSyncPacket {
  timeSec: number;
  teamScore?: { alpha: number; bravo: number };
  teamKills?: { alpha: number; bravo: number };
  captures?: { id: string; owner: TeamId; progress: number }[];
}

export interface RemoteTankState {
  userId: string;
  username: string;
  hullId: HullId;
  turretId: TurretId;
  team: TeamId;
  x: number;
  z: number;
  yaw: number;
  aimYaw: number;
  barrelPitch: number;
  speed: number;
  boosting: boolean;
  health: number;
  maxHealth: number;
  alive: boolean;
  lastPacketTime: number;
}
