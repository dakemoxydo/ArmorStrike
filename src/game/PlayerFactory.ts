import * as THREE from 'three';
import { HULLS, TURRETS, WEAPON_TUNING } from '../core/catalog';
import type { HullId, TurretId, WeaponType } from '../core/catalog';
import { TankEntity, buildTankMesh } from './Tank';
import type { TankParams } from './Tank';
import type { TankLike, TankStyle } from '../core/types';
import { RailgunWeapon } from './weapons/RailgunWeapon';
import { FlamethrowerWeapon } from './weapons/FlamethrowerWeapon';
import { CannonWeapon } from './weapons/CannonWeapon';
import { GaussWeapon } from './weapons/GaussWeapon';
import { IsidaWeapon } from './weapons/IsidaWeapon';
import type { Weapon, WeaponDeps, WeaponOwner, DamageSystem } from './weapons/types';
import type { EffectsPort } from './ports/EffectsPort';
import type { AudioPort } from './ports/AudioPort';
import type { ProjectileManager } from './engine/Projectile';
import type { LightRig } from './effects/LightRig';
import type { DamageFloatSink } from './damageFloats';

export interface WeaponFactoryDeps {
  scene: THREE.Scene;
  effects: EffectsPort;
  audio: AudioPort;
  damageSystem: DamageSystem;
  projectiles: ProjectileManager;
  lights: LightRig;
  onShotFired?: () => void;
  onSupportScore?: (points: number) => void;
  onDamageFloat?: DamageFloatSink;
  /** Mutable box so MP can attach a sink after weapons are already built. */
  healthNet?: { emit: (target: TankLike, remainingHealth: number, delta: number) => void };
}

export function createWeapon(owner: WeaponOwner, type: WeaponType, deps: WeaponFactoryDeps): Weapon {
  const wdeps: WeaponDeps = {
    scene: deps.scene,
    effects: deps.effects,
    audio: deps.audio,
    damageSystem: deps.damageSystem,
    projectiles: deps.projectiles,
    lights: deps.lights,
    onShotFired: deps.onShotFired,
    onSupportScore: deps.onSupportScore,
    onDamageFloat: deps.onDamageFloat,
    onHealthNet: (target, remaining, delta) => deps.healthNet?.emit(target, remaining, delta),
  };
  if (type === 'railgun') return new RailgunWeapon(owner, wdeps);
  if (type === 'flamethrower') return new FlamethrowerWeapon(owner, wdeps);
  if (type === 'gauss') return new GaussWeapon(owner, wdeps);
  if (type === 'isida') return new IsidaWeapon(owner, wdeps);
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
export async function createTankEntity(input: TankBuildInput): Promise<TankEntity> {
  const hull = HULLS[input.hullId];
  const turret = TURRETS[input.turretId];
  const params: TankParams = {
    maxHealth: Math.round(hull.maxHealth * (input.healthScale ?? 1)),
    speed: hull.speed, reverseSpeed: hull.reverseSpeed, turnSpeed: hull.turnSpeed,
    turretSpeed: turret.turretSpeed,
    damage: Math.round(turret.damage * (input.damageScale ?? 1)),
    shotCooldown: turret.shotCooldown * (input.shotCooldownScale ?? 1),
    weaponType: turret.weaponType, range: turret.range,
    elevationAngle: turret.elevationAngle,
    depressionAngle: turret.depressionAngle,
    pitchSpeed: turret.pitchSpeed,
    // Контр-пики и крит (п.2/3): берём из каталога 1:1, масштабы волны на них
    // НЕ влияют (damageScale меняет базовое число, резист/крит — множители).
    damageType: turret.damageType,
    // Объект-таблица резистов общая на корпус (только читается) — не клонируем.
    damageResist: hull.resist,
    critTuning: WEAPON_TUNING[turret.weaponType].crit,
  };
  const visual = await buildTankMesh(input.style, input.hullId, input.turretId);
  const entity = new TankEntity(input.name, input.isPlayer, params, visual);
  entity.hullId = input.hullId;
  entity.turretId = input.turretId;
  return entity;
}
