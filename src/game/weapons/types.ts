// ===== Общий контракт оружия: единый интерфейс для рельсотрона, огнемёта и пушки =====
import type * as THREE from 'three';
import type { Collider } from '../engine/physics';
import type { EffectsPort } from '../ports/EffectsPort';
import type { AudioPort } from '../ports/AudioPort';
import type { ProjectileManager } from '../engine/Projectile';
import type { DamageSystem, TankLike } from '../../core/types';


export type { DamageSystem } from '../../core/types';

export interface WeaponAmmoState {
  ammo: number;
  magazine: number;
  reloading: boolean;
  reloadProgress: number;
  isCharging: boolean;
}

/** Дополняет неполные поля аммуниции значениями по умолчанию.
 *  Устраняет дублирование формы возврата в каждом оружии. */
export function buildAmmoState(partial: Partial<WeaponAmmoState> & { magazine: number }): WeaponAmmoState {
  return {
    ammo: 0,
    reloading: false,
    reloadProgress: 0,
    isCharging: false,
    ...partial,
  };
}

/** Визуальный срез владельца, который трогает оружие (не весь TankVisual). */
export interface WeaponOwnerVisual {
  muzzle: THREE.Object3D;
  barrelGroup: THREE.Group;
  railGlowMat?: THREE.MeshStandardMaterial;
}

export interface WeaponOwnerParams {
  damage: number;
  range?: number;
}

/**
 * Узкий порт владельца оружия. Расширяет TankLike (источник урона/снарядов).
 * Runtime: full tank class implements this.
 */
export interface WeaponOwner extends TankLike {
  fireTimer: number;
  params: WeaponOwnerParams;
  visual: WeaponOwnerVisual;
  /** Wave buff: >1 shortens reload/charge (optional on non-player). */
  reloadSpeedMul?: number;
  muzzleWorld(out: THREE.Vector3): THREE.Vector3;
  aimDir(out: THREE.Vector3): THREE.Vector3;
  onFired(recoil: number): void;
  /**
   * Visual barrel pull (0..~2). Used by railgun charge anticipation;
   * tanks map this to fx.barrelKick. Optional for lightweight mocks.
   */
  setBarrelKick?(amount: number): void;
}

/**
 * Пир в списке tanks для оружия (узкий порт, не полный entity class).
 * Flame: position/alive/TankLike; Railgun hitscan: visual.group.
 */
export interface CombatPeer extends TankLike {
  visual: { group: THREE.Object3D };
}

/** Контекст кадра, доступный оружию при обновлении (без concrete Arena — нет цикла). */
export interface WeaponContext {
  tanks: CombatPeer[];
  /** Shot-blocking / LOS geometry; same list as Arena.colliders. */
  colliders: Collider[];
}

/** Зависимости, необходимые оружию для работы. */
export interface WeaponDeps {
  scene: THREE.Scene;
  effects: EffectsPort;
  audio: AudioPort;
  damageSystem: DamageSystem;
  projectiles: ProjectileManager;
  /** Колбэк для события «игрок выстрелил» (используется HUD). */
  onShotFired?: () => void;
}

/** Единый интерфейс оружия — устраняет разветвления по weaponType в Game. */
export interface Weapon {
  readonly owner: WeaponOwner;
  /** Установить состояние спуска (зажат/отпущен). Каждое оружие интерпретирует по-своему. */
  setFire(active: boolean): void;
  update(dt: number, ctx: WeaponContext): void;
  /** Тик перезарядки магазина (для оружия с боеукладкой). По умолчанию нет. */
  updateReload(dt: number): void;
  /** Запрос ручной перезарядки (клавиша R). По умолчанию нет. */
  requestReload(): void;
  dispose(): void;
  getAmmoState(): WeaponAmmoState;
}
