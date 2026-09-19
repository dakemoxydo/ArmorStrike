// ===== Узкие порты танка для sim-систем (ISP) =====
// Runtime storage: TankEntity composes TankMotionState / TankCombatState / TankBuffState / fx / visual.
// Flat projections on TankEntity still satisfy these ports (structural typing).
import type * as THREE from 'three';
import type { Weapon } from '../weapons/types';
import type { TankFxState, TankParams, TankVisual } from './types';

/** Движение корпуса + boost + knockback. */
export interface MotionBody {
  /** Network peer: skip local integration. Optional for tests/stubs. */
  isRemote?: boolean;
  position: THREE.Vector3;
  params: Pick<TankParams, 'speed' | 'reverseSpeed' | 'turnSpeed'>;
  boosting: boolean;
  boostEnergy: number;
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
  isRemote?: boolean;
}

/** Поворот башни к aimYaw + вертикальная автонаводка ствола (barrelPitch). */
export interface AimBody {
  params: Pick<TankParams, 'turretSpeed' | 'elevationAngle' | 'depressionAngle' | 'pitchSpeed'>;
  aimYaw: number;
  yaw: number;
  turretYaw: number;
  /** Текущий тангаж ствола (рад) — читается/доводится TankAimSystem. */
  barrelPitch: number;
  /** Вход питч-аима: есть ли валидная цель в этом тике. */
  pitchLocked: boolean;
  /** Вход питч-аима: dy цели относительно дула (рад-аргумент atan2). */
  pitchDy: number;
  /** Вход питч-аима: XZ-дистанция до цели (знаменатель atan2). */
  pitchDistXZ: number;
}

/** Таймеры боя и обслуживание здоровья: fireTimer, reload, ремонт вне боя. */
export interface CombatTimerBody {
  fireTimer: number;
  weapon?: Weapon;
  alive?: boolean;
  health?: number;
  maxHealth?: number;
  timeSinceDamaged?: number;
}

/** Синхронизация yaw/turretYaw → mesh. */
export interface PresentationBody {
  yaw: number;
  turretYaw: number;
  visual: Pick<TankVisual, 'hull' | 'turret'>;
}

/** Дым повреждений / пыль гусениц / следы траков. */
export interface FxBody {
  alive: boolean;
  health: number;
  maxHealth: number;
  position: THREE.Vector3;
  speed: number;
  yaw: number;
  steer?: number;
  boostActive?: boolean;
  params: Pick<TankParams, 'speed'> & Partial<Pick<TankParams, 'turnSpeed'>>;
  fx: Pick<TankFxState, 'smokeAcc' | 'dustAcc'> & Partial<Pick<TankFxState, 'trackDist'>>;
}

/** Анимация ствола, гусениц, death pose, damage state. */
export interface AnimBody {
  id: number;
  alive: boolean;
  boostActive: boolean;
  deathT: number;
  speed: number;
  steer?: number;
  yaw?: number;
  turretYaw?: number;
  /** Текущий тангаж ствола (рад) — пишется в barrelGroup.rotation.x (см. знак). */
  barrelPitch?: number;
  knockback?: THREE.Vector3;
  params?: Pick<TankParams, 'speed' | 'turnSpeed'>;
  health: number;
  maxHealth: number;
  position: THREE.Vector3;
  /** Секунды респавн-неуязвимости — видно по куполу щита (п.15). */
  invulnT?: number;
  fx: Pick<TankFxState, 'barrelKick' | 'hitFlash' | 'healFlash' | 'smokeAcc'> &
    Partial<Pick<TankFxState, 'pitch' | 'pitchVel' | 'roll' | 'rollVel' | 'prevSpeed'>>;
  visual: Pick<
    TankVisual,
    'barrelGroup' | 'turret' | 'bodyMats' | 'bodyBaseColors' | 'ring' | 'shield' | 'trackTex'
  > & {
    hull?: THREE.Group;
    trackLeftTex?: THREE.CanvasTexture;
    trackRightTex?: THREE.CanvasTexture;
  };
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
  yaw?: number;
  weapon?: Weapon;
}

/** Строка scoreboard / HUD без полного entity. */
export interface HudUnit {
  id?: number;
  name: string;
  hullId?: string;
  turretId?: string;
  params: { weaponType?: string };
  health: number;
  maxHealth: number;
  isPlayer: boolean;
  alive: boolean;
  /** Seconds since death — HUD respawn countdown (`respawnInSec`). */
  deathT?: number;
  position: { x: number; z: number };
  yaw: number;
  turretYaw: number;
  /** null = FFA; set in team modes for scoreboard / minimap. */
  teamId?: import('../match/matchTypes').TeamId;
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
