import * as THREE from 'three';
import { HULLS, TURRETS } from '../core/catalog';
import type { HullId, TurretId, WeaponType } from '../core/catalog';
import { TankEntity, buildTankMesh } from './Tank';
import type { TankParams } from './Tank';
import type { TankStyle } from '../core/types';
import { RailgunWeapon } from './weapons/RailgunWeapon';
import { FlamethrowerWeapon } from './weapons/FlamethrowerWeapon';
import { CannonWeapon } from './weapons/CannonWeapon';
import type { Weapon, WeaponDeps, WeaponOwner, DamageSystem } from './weapons/types';
import type { EffectsPort } from './ports/EffectsPort';
import type { AudioPort } from './ports/AudioPort';
import type { ProjectileManager } from './engine/Projectile';
import { buildPlayerStyle } from '../core/TankCatalog';

export interface WeaponFactoryDeps {
  scene: THREE.Scene;
  effects: EffectsPort;
  audio: AudioPort;
  damageSystem: DamageSystem;
  projectiles: ProjectileManager;
  onShotFired: () => void;
}

export function createWeapon(owner: WeaponOwner, type: WeaponType, deps: WeaponFactoryDeps): Weapon {
  const wdeps: WeaponDeps = {
    scene: deps.scene,
    effects: deps.effects,
    audio: deps.audio,
    damageSystem: deps.damageSystem,
    projectiles: deps.projectiles,
    onShotFired: deps.onShotFired,
  };
  if (type === 'railgun') return new RailgunWeapon(owner, wdeps);
  if (type === 'flamethrower') return new FlamethrowerWeapon(owner, wdeps);
  return new CannonWeapon(owner, wdeps);
}

export interface TankBuildInput {
  name: string;
  isPlayer: boolean;
  hullId: HullId;
  turretId: TurretId;
  style: TankStyle;
  /** Множители волны (для ботов). По умолчанию 1 — фиксированный игрок. */
  healthScale?: number;
  damageScale?: number;
  shotCooldownScale?: number;
}

/** Единая точка сборки TankEntity из корпуса + башни (игрок и боты). */
export function createTankEntity(input: TankBuildInput): TankEntity {
  const hull = HULLS[input.hullId];
  const turret = TURRETS[input.turretId];
  const params: TankParams = {
    maxHealth: Math.round(hull.maxHealth * (input.healthScale ?? 1)),
    speed: hull.speed, reverseSpeed: hull.reverseSpeed, turnSpeed: hull.turnSpeed,
    turretSpeed: turret.turretSpeed,
    damage: Math.round(turret.damage * (input.damageScale ?? 1)),
    shotCooldown: turret.shotCooldown * (input.shotCooldownScale ?? 1),
    weaponType: turret.weaponType, range: turret.range,
  };
  const visual = buildTankMesh(input.style, input.hullId, input.turretId);
  const entity = new TankEntity(input.name, input.isPlayer, params, visual);
  entity.hullId = input.hullId;
  entity.turretId = input.turretId;
  return entity;
}

export function buildPlayerTank(hullId: HullId, turretId: TurretId): TankEntity {
  const entity = createTankEntity({
    name: 'ВЫ', isPlayer: true, hullId, turretId, style: buildPlayerStyle(),
  });
  entity.visual.group.position.set(0, 0, -120);
  entity.yaw = 0;
  entity.aimYaw = 0;
  return entity;
}
