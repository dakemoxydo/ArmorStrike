// ===== Спавн одного бота волны (отделён от lifecycle WaveManager) =====
import * as THREE from 'three';
import { botAiForWave } from './constants';
import { COLORS } from '../core/constants';
import { HULL_IDS, TURRET_IDS, TURRETS } from '../core/catalog';
import type { HullId, TurretId, WeaponType } from '../core/catalog';
import { TankEntity } from './Tank';
import { AIController, randomPersona } from './AI';
import { Nameplate } from './nameplate';
import type { Weapon } from './weapons/types';
import { buildBotStyle } from '../core/TankCatalog';
import { createTankEntity } from './PlayerFactory';

export interface BotEntry { tank: TankEntity; ai: AIController }

export const SPAWN_POINTS: [number, number][] = [
  [64, 64], [-64, 64], [64, -64], [-64, -64],
  [0, -66], [67, 0], [-67.5, 18],
];

export interface BotSpawnDeps {
  scene: THREE.Scene;
  createWeapon: (tank: TankEntity, type: WeaponType) => Weapon;
}

/**
 * Создаёт одного бота: entity, mesh, nameplate, weapon, AI.
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
  const ai = botAiForWave(wave);
  const botHulls: HullId[] = HULL_IDS;
  const botTurrets: TurretId[] = TURRET_IDS;
  const botColors = COLORS.bots.map((h: number) => new THREE.Color(h));

  const [x, z] = SPAWN_POINTS[spawnIdx];
  const yaw = Math.atan2(-x, -z);
  const c = botColors[index % botColors.length];
  const bHull = botHulls[index % botHulls.length];
  const bTurret = botTurrets[(index + wave) % botTurrets.length];

  const bot = createTankEntity({
    name: `БОТ-${wave}${index + 1}`, isPlayer: false,
    hullId: bHull, turretId: bTurret, style: buildBotStyle(c),
    healthScale: 0.8 + wave * 0.1,
    damageScale: 0.7 + wave * 0.08,
    shotCooldownScale: 1.3,
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

  return {
    tank: bot,
    ai: new AIController(bot, ai.sightRange, TURRETS[bTurret].range, ai.aimError, randomPersona(wave)),
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
