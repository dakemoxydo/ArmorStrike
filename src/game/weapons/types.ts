// ===== Общий контракт оружия: единый интерфейс для рельсотрона, огнемёта и пушки =====
import type * as THREE from 'three';
import type { TankEntity } from '../Tank';
import type { Arena } from '../Arena';
import type { Effects } from '../effects';
import type { AudioFX } from '../audio';
import type { ProjectileManager } from '../Projectile';

/** Централизованная система урона (реализуется в Game). */
export interface DamageSystem {
  applyDamage: (target: TankEntity, dmg: number, source: TankEntity) => void;
  applyKnockback: (target: TankEntity, dir: THREE.Vector3, force: number) => void;
  damageBlock: (blockId: number, dmg: number, hitPos: THREE.Vector3) => void;
}

export interface WeaponAmmoState {
  ammo: number;
  magazine: number;
  reloading: boolean;
  reloadProgress: number;
  isCharging: boolean;
}

/** Контекст кадра, доступный оружию при обновлении. */
export interface WeaponContext {
  tanks: TankEntity[];
  arena: Arena;
}

/** Зависимости, необходимые оружию для работы. */
export interface WeaponDeps {
  scene: THREE.Scene;
  effects: Effects;
  audio: AudioFX;
  damageSystem: DamageSystem;
  projectiles: ProjectileManager;
  /** Колбэк для события «игрок выстрелил» (используется HUD). */
  onShotFired?: () => void;
}

/** Единый интерфейс оружия — устраняет разветвления по weaponType в Game. */
export interface Weapon {
  readonly owner: TankEntity;
  /** Установить состояние спуска (зажат/отпущен). Каждое оружие интерпретирует по-своему. */
  setFire(active: boolean): void;
  update(dt: number, ctx: WeaponContext): void;
  dispose(): void;
  getAmmoState(): WeaponAmmoState;
}
