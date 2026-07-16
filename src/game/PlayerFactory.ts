import * as THREE from 'three';
import { HULLS, TURRETS } from './constants';
import type { HullId, TurretId } from './constants';
import { TankEntity, buildTankMesh } from './Tank';
import type { TankParams, TankStyle } from './Tank';
import type { WeaponType } from './Projectile';
import { RailgunWeapon } from './weapons/RailgunWeapon';
import { FlamethrowerWeapon } from './weapons/FlamethrowerWeapon';
import { CannonWeapon } from './weapons/CannonWeapon';
import type { Weapon, WeaponDeps } from './weapons/types';
import type { Effects } from './effects';
import type { AudioFX } from './audio';
import type { DamageSystem } from './weapons/types';
import type { ProjectileManager } from './Projectile';
import { buildPlayerStyle } from '../core/TankCatalog';

export interface WeaponFactoryDeps {
  scene: THREE.Scene;
  effects: Effects;
  audio: AudioFX;
  damageSystem: DamageSystem;
  projectiles: ProjectileManager;
  onShotFired: () => void;
}

export function createWeapon(tank: TankEntity, type: WeaponType, deps: WeaponFactoryDeps): Weapon {
  const wdeps: WeaponDeps = {
    scene: deps.scene,
    effects: deps.effects,
    audio: deps.audio,
    damageSystem: deps.damageSystem,
    projectiles: deps.projectiles,
    onShotFired: deps.onShotFired,
  };
  if (type === 'railgun') return new RailgunWeapon(tank, wdeps);
  if (type === 'flamethrower') return new FlamethrowerWeapon(tank, wdeps);
  return new CannonWeapon(tank, wdeps);
}

export function buildPlayerTank(hullId: HullId, turretId: TurretId): TankEntity {
  const hull = HULLS[hullId];
  const turret = TURRETS[turretId];
  const style: TankStyle = buildPlayerStyle();
  const params: TankParams = {
    maxHealth: hull.maxHealth, speed: hull.speed, reverseSpeed: hull.reverseSpeed,
    turnSpeed: hull.turnSpeed, turretSpeed: turret.turretSpeed,
    damage: turret.damage, shotCooldown: turret.shotCooldown,
    weaponType: turret.weaponType, range: turret.range,
  };
  const visual = buildTankMesh(style, hullId, turretId);
  const entity = new TankEntity('ВЫ', true, params, visual);
  entity.hullId = hullId;
  entity.turretId = turretId;
  entity.ammo = turret.magazine;
  entity.magazine = turret.magazine;
  entity.fullReloadTime = turret.fullReload;
  entity.visual.group.position.set(0, 0, -58);
  entity.yaw = 0;
  entity.aimYaw = 0;
  return entity;
}
