// ===== Pure multiplayer replication helpers (unit-tested, no I/O) =====
import type { HullId, TurretId } from '../../core/catalog';
import { HULLS, TURRETS } from '../../core/catalog';
import type { MatchModeId, TeamId } from '../match/matchTypes';
import type { MatchPlayerSync, MatchSyncPacket, TankTransformPacket } from './types';
import { SCORE } from '../constants';

export const BOT_NET_PREFIX = 'bot:';

export function botNetworkId(slot: number): string {
  return `${BOT_NET_PREFIX}${slot}`;
}

export function isBotNetworkId(id: string): boolean {
  return id.startsWith(BOT_NET_PREFIX);
}

/** Round a number for compact broadcast payloads. */
export function netRound(n: number, places: number): number {
  const k = 10 ** places;
  return Math.round(n * k) / k;
}

export function isRemoteSource(source: { isRemote?: boolean } | null | undefined): boolean {
  return Boolean(source?.isRemote);
}

/**
 * Shooter-authority: the local player and host-simulated bots own combat
 * mutation. Remote peers are cosmetic (HP arrives via tank_damage / transform).
 */
export function ownsCombatSource(
  source: { networkId?: string | null; isRemote?: boolean; isPlayer?: boolean },
  localId: string,
  isHost: boolean,
): boolean {
  if (source.isRemote) return false;
  if (source.networkId && source.networkId === localId) return true;
  if (source.isPlayer) return true;
  if (isHost && source.networkId && isBotNetworkId(source.networkId)) return true;
  // Host bots assigned before the first packet.
  if (isHost && !source.networkId && !source.isPlayer) return true;
  return false;
}

export function desiredBotCount(opts: {
  botsEnabled: boolean;
  maxPlayers: number;
  humanCount: number;
  mode: MatchModeId;
  dmBotCount: number;
  teamSize: number;
}): number {
  if (!opts.botsEnabled) return 0;
  const rosterCap = opts.mode === 'deathmatch'
    ? opts.dmBotCount + 1
    : opts.teamSize * 2;
  const cap = Math.max(1, Math.min(opts.maxPlayers, rosterCap));
  return Math.max(0, cap - Math.max(0, opts.humanCount));
}

export function parseHullId(id: unknown, fallback: HullId = 'hunter'): HullId {
  return typeof id === 'string' && id in HULLS ? (id as HullId) : fallback;
}

export function parseTurretId(id: unknown, fallback: TurretId = 'railgun'): TurretId {
  return typeof id === 'string' && id in TURRETS ? (id as TurretId) : fallback;
}

export function parseTeamId(value: unknown, fallback: TeamId = null): TeamId {
  return value === 'alpha' || value === 'bravo' ? value : fallback;
}

export function shortestAngleDelta(target: number, current: number): number {
  let diff = (target - current) % (Math.PI * 2);
  if (diff < -Math.PI) diff += Math.PI * 2;
  if (diff > Math.PI) diff -= Math.PI * 2;
  return diff;
}

export function localPlayerWonFromSync(
  packet: Pick<MatchSyncPacket, 'winnerTeam' | 'winnerName' | 'winnerId'>,
  local: { teamId: TeamId; name: string; networkId?: string | null },
): boolean {
  if (packet.winnerTeam) return packet.winnerTeam === local.teamId;
  // DM: сравнение по networkId. Имя — свободно меняемый label, по нему можно
  // выдать себя за победителя; фолбэк на имя только для старого хоста без winnerId.
  if (packet.winnerId && local.networkId) return packet.winnerId === local.networkId;
  if (packet.winnerName) return packet.winnerName === local.name;
  return false;
}

/** Нефинитная поза отравляет интерполяцию и CP-математику — пакет отбрасываем. */
export function isFinitePosePacket(packet: TankTransformPacket): boolean {
  return Number.isFinite(packet.x)
    && Number.isFinite(packet.z)
    && Number.isFinite(packet.y ?? 0)
    && Number.isFinite(packet.yaw)
    && Number.isFinite(packet.aimYaw)
    && Number.isFinite(packet.barrelPitch)
    && Number.isFinite(packet.speed);
}

/** Неотрицательное конечное число из недоверенного пакета (иначе null). */
function nonNegNum(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

/**
 * Валидация авторитетного списка игроков из недоверенного `match_sync`.
 * Битые строки отбрасываются, частично-битые — числовые поля заменяются на 0,
 * чтобы один кривой элемент не обнулял весь список.
 */
export function sanitizeSyncPlayers(raw: unknown): MatchPlayerSync[] {
  if (!Array.isArray(raw)) return [];
  const out: MatchPlayerSync[] = [];
  for (const item of raw as Array<Record<string, unknown>>) {
    if (!item || typeof item !== 'object') continue;
    const networkId = typeof item.networkId === 'string' ? item.networkId : '';
    if (!networkId) continue;
    const row: MatchPlayerSync = {
      networkId,
      name: typeof item.name === 'string' ? item.name : '',
      kills: nonNegNum(item.kills) ?? 0,
      deaths: nonNegNum(item.deaths) ?? 0,
    };
    const score = nonNegNum(item.score);
    if (score !== null) row.score = score;
    const bestStreak = nonNegNum(item.bestStreak);
    if (bestStreak !== null) row.bestStreak = bestStreak;
    out.push(row);
  }
  return out;
}

/** Строка локального игрока в авторитетном списке (null — строки нет). */
export function findSyncPlayer(
  players: readonly MatchPlayerSync[] | undefined,
  networkId: string | null | undefined,
): MatchPlayerSync | null {
  if (!players || !networkId) return null;
  return players.find((p) => p.networkId === networkId) ?? null;
}

/**
 * Сверка очков: фраги приходят от хоста, а support-очки («Изида», лечение
 * союзников) хост не видит — их клиент добавляет сам. Без hostScore берём
 * локальное значение целиком (старый хост).
 *
 * Известный остаточный риск: support-часть по-прежнему доверяет клиенту
 * (счёт лечения хоста не воспроизводится). Чтобы закрыть его, хост должен
 * учитывать heal-пакеты по networkId — это зона NetworkSession/CombatSystem.
 */
export function reconcilePlayerScore(
  hostScore: number | undefined,
  localScore: number,
  localKills: number,
): number {
  if (typeof hostScore !== 'number' || !Number.isFinite(hostScore)) return localScore;
  const support = Math.max(0, localScore - Math.max(0, localKills) * SCORE.kill);
  return hostScore + support;
}

export interface TransformPose {
  x: number;
  y: number;
  z: number;
  yaw: number;
  aimYaw: number;
  barrelPitch: number;
  speed: number;
  boosting: boolean;
  health: number;
  maxHealth: number;
  alive: boolean;
  invulnT: number;
  kills: number;
  deaths: number;
  team: TeamId;
  hullId?: HullId;
  turretId?: TurretId;
  username?: string;
}

export function packTransform(
  userId: string,
  pose: TransformPose,
  timestamp: number,
): TankTransformPacket {
  return {
    userId,
    x: netRound(pose.x, 2),
    y: netRound(pose.y, 2),
    z: netRound(pose.z, 2),
    yaw: netRound(pose.yaw, 3),
    aimYaw: netRound(pose.aimYaw, 3),
    barrelPitch: netRound(pose.barrelPitch, 3),
    speed: netRound(pose.speed, 1),
    boosting: Boolean(pose.boosting),
    health: netRound(pose.health, 1),
    maxHealth: pose.maxHealth,
    alive: Boolean(pose.alive),
    invulnT: netRound(pose.invulnT, 2),
    kills: pose.kills,
    deaths: pose.deaths,
    team: pose.team,
    hullId: pose.hullId,
    turretId: pose.turretId,
    username: pose.username,
    timestamp,
  };
}
