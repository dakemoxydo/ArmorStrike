// ===== Узкие порты танка для sim-систем (ISP) — runtime по-прежнему TankEntity =====
import type * as THREE from 'three';
import type { Weapon } from '../weapons/types';
import type { TankFxState, TankParams, TankVisual } from './types';

/** Движение корпуса + boost + knockback. */
export interface MotionBody {
  position: THREE.Vector3;
  params: Pick<TankParams, 'speed' | 'reverseSpeed' | 'turnSpeed'>;
  boosting: boolean;
  boostEnergy: number;
  boostDrainMul: number;
  boostRechargeMul: number;
  boostActive: boolean;
  throttle: number;
  speed: number;
  yaw: number;
  steer: number;
  knockback: THREE.Vector3;
  vel: THREE.Vector3;
}

/** Коллизии со стенами и танк–танк. */
export interface PhysicsBody {
  alive: boolean;
  position: THREE.Vector3;
  radius: number;
  speed: number;
}

/** Поворот башни к aimYaw. */
export interface AimBody {
  params: Pick<TankParams, 'turretSpeed'>;
  aimYaw: number;
  yaw: number;
  turretYaw: number;
}

/** Таймеры боя: heal, fireTimer, reload. */
export interface CombatTimerBody {
  fx: Pick<TankFxState, 'timeSinceHit'>;
  health: number;
  maxHealth: number;
  fireTimer: number;
  weapon?: Weapon;
}

/** Синхронизация yaw/turretYaw → mesh. */
export interface PresentationBody {
  yaw: number;
  turretYaw: number;
  visual: Pick<TankVisual, 'hull' | 'turret'>;
}

/** Дым повреждений / пыль гусениц. */
export interface FxBody {
  alive: boolean;
  health: number;
  maxHealth: number;
  position: THREE.Vector3;
  speed: number;
  yaw: number;
  params: Pick<TankParams, 'speed'>;
  fx: Pick<TankFxState, 'smokeAcc' | 'dustAcc'>;
}

/** Анимация ствола, гусениц, death pose. */
export interface AnimBody {
  id: number;
  alive: boolean;
  boostActive: boolean;
  deathT: number;
  speed: number;
  fx: Pick<TankFxState, 'barrelKick' | 'hitFlash'>;
  visual: Pick<TankVisual, 'barrelGroup' | 'turret' | 'bodyMats' | 'ring' | 'trackTex'>;
}

/** Владелец оружия для WeaponSystem. */
export interface WeaponHost {
  alive: boolean;
  weapon?: Weapon;
}

/** Ввод игрока → drive/aim поля. */
export interface ControllableTank {
  throttle: number;
  steer: number;
  boosting: boolean;
  aimYaw: number;
  weapon?: Weapon;
}

/** Временные волновые баффы. */
export interface BuffableTank {
  buffBase: {
    damage: number;
    speed: number;
    reverseSpeed: number;
    turnSpeed: number;
    shotCooldown: number;
  } | null;
  reloadSpeedMul: number;
  boostDrainMul: number;
  boostRechargeMul: number;
  params: {
    damage: number;
    speed: number;
    reverseSpeed: number;
    turnSpeed: number;
    shotCooldown: number;
  };
}

/** Строка scoreboard / HUD без полного entity. */
export interface HudUnit {
  name: string;
  hullId?: string;
  turretId?: string;
  params: { weaponType?: string };
  health: number;
  maxHealth: number;
  isPlayer: boolean;
  alive: boolean;
  position: { x: number; z: number };
  yaw: number;
  turretYaw: number;
}

/** Камера следует за позицией/yaw; playing mode also needs speed/boost for FOV. */
export interface CameraFollowable {
  position: THREE.Vector3;
  yaw: number;
  alive: boolean;
  speed: number;
  boostActive: boolean;
  params: { speed: number };
}
