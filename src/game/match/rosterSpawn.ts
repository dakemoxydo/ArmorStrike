// ===== Match roster spawn (DM / TDM / CP) =====
import * as THREE from 'three';
import { HULL_IDS, TURRET_IDS, TURRETS } from '../../core/catalog';
import type { HullId, TurretId } from '../../core/catalog';
import { COLORS } from '../../core/constants';
import { buildBotStyle, buildPlayerStyle } from '../../core/TankCatalog';
import { AIController } from '../AI';
import { roleForBot, roleLabel, personaForRole } from '../aiRoles';
import type { BotEntry } from '../botSpawn';
import { Nameplate } from '../nameplate';
import { createTankEntity, createWeapon, type WeaponFactoryDeps } from '../PlayerFactory';
import type { TankEntity } from '../Tank';
import { BOT_NORMAL } from './matchConfig';
import type { MatchConfig, TeamId } from './matchTypes';
import {
  ALPHA_SPAWN_POINTS,
  BRAVO_SPAWN_POINTS,
  FFA_SPAWN_POINTS,
  MIN_BOT_SPAWN_DIST,
  pickPointIndex,
} from './spawnPoints';
import { isTeamMode } from './teams';
import { isObjectiveDuty } from './aiObjective';

export interface RosterSpawnCtx {
  scene: THREE.Scene;
  weaponDeps: WeaponFactoryDeps;
  tanks: TankEntity[];
  nameplates: Map<number, { plate: Nameplate; color: number }>;
  hullId: HullId;
  turretId: TurretId;
}

export interface RosterSpawnResult {
  player: TankEntity;
  bots: BotEntry[];
}

function placeTank(tank: TankEntity, x: number, z: number, yaw: number) {
  tank.visual.group.position.set(x, 0, z);
  tank.yaw = yaw;
  tank.aimYaw = yaw;
  tank.turretYaw = 0;
}

/** Palette for FFA bots; team modes tint Alpha blue / Bravo red. */
function botStyleColor(index: number, teamId: TeamId): THREE.Color {
  if (teamId === 'alpha') return new THREE.Color(COLORS.teamAlpha);
  if (teamId === 'bravo') return new THREE.Color(COLORS.teamBravo);
  return new THREE.Color(COLORS.bots[index % COLORS.bots.length]);
}

function applyTeamRing(tank: TankEntity, teamId: TeamId) {
  if (!teamId) return;
  const mat = tank.visual.ring.material as THREE.MeshBasicMaterial;
  mat.color.setHex(teamId === 'alpha' ? COLORS.teamAlpha : COLORS.teamBravo);
}

function makeBot(
  index: number,
  teamId: TeamId,
  x: number,
  z: number,
  ctx: RosterSpawnCtx,
): BotEntry {
  const botHulls: HullId[] = HULL_IDS;
  const botTurrets: TurretId[] = TURRET_IDS;

  let bHull = botHulls[index % botHulls.length];
  const bTurret = botTurrets[index % botTurrets.length];
  const role = roleForBot(BOT_NORMAL.roleWave, index, bTurret);

  if (role === 'assault' && bHull === 'mammoth') bHull = 'viking';
  if (role === 'sniper' && bHull === 'viking') bHull = 'hunter';

  const c = botStyleColor(index, teamId);
  const teamTag = teamId === 'alpha' ? 'А' : teamId === 'bravo' ? 'Б' : '';
  const name = teamTag
    ? `${teamTag}-${roleLabel(role).toUpperCase()}-${index + 1}`
    : `${roleLabel(role).toUpperCase()}-${index + 1}`;

  const bot = createTankEntity({
    name,
    isPlayer: false,
    hullId: bHull,
    turretId: bTurret,
    style: buildBotStyle(c),
    healthScale: BOT_NORMAL.healthScale,
    damageScale: BOT_NORMAL.damageScale,
    shotCooldownScale:
      role === 'assault' ? 1.15 : role === 'sniper' ? 1.35 : BOT_NORMAL.shotCooldownScale,
  });
  bot.teamId = teamId;
  bot.kills = 0;
  bot.deaths = 0;
  bot.invulnT = 0;
  applyTeamRing(bot, teamId);

  const yaw = Math.atan2(-x, -z);
  placeTank(bot, x, z, yaw);

  const plate = new Nameplate(bot.name, c.getHex());
  ctx.scene.add(plate.sprite);
  ctx.nameplates.set(bot.id, { plate, color: c.getHex() });
  ctx.scene.add(bot.visual.group);
  ctx.tanks.push(bot);

  bot.weapon = createWeapon(bot, TURRETS[bTurret].weaponType, ctx.weaponDeps);

  const persona = personaForRole(role, BOT_NORMAL.roleWave);
  return {
    tank: bot,
    ai: new AIController(
      bot,
      BOT_NORMAL.sightRange,
      TURRETS[bTurret].range,
      BOT_NORMAL.aimError,
      persona,
      role,
    ),
    // CP roster: ~50% push objectives; harmless flag in DM/TDM.
    objectiveDuty: isObjectiveDuty(index),
  };
}

/**
 * Build full match roster: player + bots for config.mode.
 * Clears nothing — caller must clear tanks first.
 */
export function spawnMatchRoster(cfg: MatchConfig, ctx: RosterSpawnCtx): RosterSpawnResult {
  const bots: BotEntry[] = [];
  const used = new Set<number>();
  const team = isTeamMode(cfg.mode);

  // --- Player ---
  const player = createTankEntity({
    name: 'ВЫ',
    isPlayer: true,
    hullId: ctx.hullId,
    turretId: ctx.turretId,
    style: buildPlayerStyle(),
  });
  player.teamId = team ? 'alpha' : null;
  player.kills = 0;
  player.deaths = 0;
  player.invulnT = 0;
  if (team) applyTeamRing(player, 'alpha');

  if (team) {
    const idx = pickPointIndex(ALPHA_SPAWN_POINTS, used, 0, 0, 0);
    used.add(idx);
    const [px, pz] = ALPHA_SPAWN_POINTS[idx];
    placeTank(player, px, pz, 0);
  } else {
    placeTank(player, 0, -120, 0);
  }

  player.weapon = createWeapon(player, TURRETS[ctx.turretId].weaponType, ctx.weaponDeps);
  ctx.scene.add(player.visual.group);
  ctx.tanks.push(player);

  if (!team) {
    // DM: 7 FFA bots
    for (let i = 0; i < cfg.dmBotCount; i++) {
      const idx = pickPointIndex(
        FFA_SPAWN_POINTS,
        used,
        player.position.x,
        player.position.z,
        MIN_BOT_SPAWN_DIST,
      );
      used.add(idx);
      const [x, z] = FFA_SPAWN_POINTS[idx];
      bots.push(makeBot(i, null, x, z, ctx));
    }
    return { player, bots };
  }

  // TDM / CP: alpha allies + bravo enemies
  const allyCount = cfg.teamSize - 1;
  const enemyCount = cfg.teamSize;
  const alphaUsed = new Set<number>(used);
  const bravoUsed = new Set<number>();

  for (let i = 0; i < allyCount; i++) {
    const idx = pickPointIndex(
      ALPHA_SPAWN_POINTS,
      alphaUsed,
      player.position.x,
      player.position.z,
      12,
    );
    alphaUsed.add(idx);
    const [x, z] = ALPHA_SPAWN_POINTS[idx];
    bots.push(makeBot(i, 'alpha', x, z, ctx));
  }

  for (let i = 0; i < enemyCount; i++) {
    const idx = pickPointIndex(BRAVO_SPAWN_POINTS, bravoUsed, 0, 0, 0);
    bravoUsed.add(idx);
    const [x, z] = BRAVO_SPAWN_POINTS[idx];
    bots.push(makeBot(allyCount + i, 'bravo', x, z, ctx));
  }

  return { player, bots };
}

/** Points pool for respawning a tank of given team / FFA. */
export function respawnPoolFor(teamId: TeamId): readonly [number, number][] {
  if (teamId === 'alpha') return ALPHA_SPAWN_POINTS;
  if (teamId === 'bravo') return BRAVO_SPAWN_POINTS;
  return FFA_SPAWN_POINTS;
}
