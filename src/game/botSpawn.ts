// ===== Спавн одного бота волны (отделён от lifecycle WaveManager) =====
import * as THREE from 'three';
import { botAiForWave } from './constants';
import { COLORS } from '../core/constants';
import { HULL_IDS, TURRET_IDS, TURRETS } from '../core/catalog';
import type { HullId, TurretId, WeaponType } from '../core/catalog';
import { TankEntity } from './Tank';
import { AIController } from './AI';
import { Nameplate } from './nameplate';
import type { Weapon } from './weapons/types';
import { buildBotStyle } from '../core/TankCatalog';
import { createTankEntity } from './PlayerFactory';
import { personaForRole, roleForBot, roleLabel } from './aiRoles';

export interface BotEntry { tank: TankEntity; ai: AIController }

export const SPAWN_POINTS: [number, number][] = [
  [64, 64], [-64, 64], [64, -64], [-64, -64],
  // North edge (was [0, -66] — ~8m from player start at z≈-58)
  [0, 66], [67, 0], [-67.5, 18],
];

/** Min planar distance from player so bots never drop on top of them. */
export const MIN_BOT_SPAWN_DIST = 32;

export interface BotSpawnDeps {
  scene: THREE.Scene;
  createWeapon: (tank: TankEntity, type: WeaponType) => Weapon;
}

/**
 * Pick a spawn-point index that is unused and far enough from the player.
 * Fallback: furthest unused point, then furthest overall.
 */
export function pickSpawnIndex(
  used: ReadonlySet<number>,
  playerX: number,
  playerZ: number,
  minDist: number = MIN_BOT_SPAWN_DIST,
  rng: () => number = Math.random,
): number {
  const scored = SPAWN_POINTS.map(([x, z], i) => ({
    i,
    d: Math.hypot(x - playerX, z - playerZ),
  }));

  const farUnused = scored.filter((s) => !used.has(s.i) && s.d >= minDist);
  if (farUnused.length > 0) {
    return farUnused[Math.floor(rng() * farUnused.length) % farUnused.length].i;
  }

  const unused = scored.filter((s) => !used.has(s.i)).sort((a, b) => b.d - a.d);
  if (unused.length > 0) return unused[0].i;

  return scored.slice().sort((a, b) => b.d - a.d)[0]?.i ?? 0;
}

/**
 * Создаёт одного бота: entity, mesh, nameplate, weapon, AI с ролью.
 * Скоринг/wave horn/emit остаются в WaveManager.
 */
export function spawnBot(
  wave: number,
  index: number,
  spawnIdx: number,
  deps: BotSpawnDeps,
  tanks: TankEntity[],
  nameplates: Map<number, { plate: Nameplate; color: number }>,
): BotEntry {
  const aiTune = botAiForWave(wave);
  const botHulls: HullId[] = HULL_IDS;
  const botTurrets: TurretId[] = TURRET_IDS;
  const botColors = COLORS.bots.map((h: number) => new THREE.Color(h));

  const safeIdx = ((spawnIdx % SPAWN_POINTS.length) + SPAWN_POINTS.length) % SPAWN_POINTS.length;
  const [x, z] = SPAWN_POINTS[safeIdx];
  const yaw = Math.atan2(-x, -z);
  const c = botColors[index % botColors.length];
  let bHull = botHulls[index % botHulls.length];
  const bTurret = botTurrets[(index + wave) % botTurrets.length];
  const role = roleForBot(wave, index, bTurret);

  let healthScale = 0.8 + wave * 0.1;
  let damageScale = 0.7 + wave * 0.08;
  let name = `${roleLabel(role).toUpperCase()}-${wave}${index + 1}`;

  if (role === 'elite') {
    bHull = 'mammoth';
    healthScale *= 1.35;
    damageScale *= 1.2;
    name = `ЭЛИТ-${wave}`;
  } else if (role === 'assault') {
    // Prefer lighter hull for rush if rotation allowed, keep formula hull otherwise.
    if (bHull === 'mammoth') bHull = 'viking';
  } else if (role === 'sniper') {
    // Prefer medium hull for long-range hold.
    if (bHull === 'viking') bHull = 'hunter';
  }

  const bot = createTankEntity({
    name, isPlayer: false,
    hullId: bHull, turretId: bTurret, style: buildBotStyle(c),
    healthScale,
    damageScale,
    shotCooldownScale: role === 'assault' ? 1.15 : role === 'sniper' ? 1.4 : 1.3,
  });
  bot.visual.group.position.set(x, 0, z);
  bot.yaw = yaw;
  bot.aimYaw = yaw;

  const plate = new Nameplate(bot.name, c.getHex());
  deps.scene.add(plate.sprite);
  nameplates.set(bot.id, { plate, color: c.getHex() });
  deps.scene.add(bot.visual.group);
  tanks.push(bot);

  bot.weapon = deps.createWeapon(bot, TURRETS[bTurret].weaponType);

  const persona = personaForRole(role, wave);
  return {
    tank: bot,
    ai: new AIController(
      bot,
      aiTune.sightRange,
      TURRETS[bTurret].range,
      aiTune.aimError,
      persona,
      role,
    ),
  };
}

/** Очистка ботов (меши + nameplates + tanks list без игрока). */
export function disposeBots(
  bots: BotEntry[],
  tanks: TankEntity[],
  nameplates: Map<number, { plate: Nameplate; color: number }>,
  scene: THREE.Scene,
) {
  for (const b of bots) {
    const np = nameplates.get(b.tank.id);
    if (np) { np.plate.dispose(scene); nameplates.delete(b.tank.id); }
    b.tank.dispose(scene);
  }
  for (let i = tanks.length - 1; i >= 0; i--) {
    if (!tanks[i].isPlayer) tanks.splice(i, 1);
  }
}
