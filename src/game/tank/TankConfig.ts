import type { HullId, TurretId } from '../../core/catalog';

export type RenderType = 'code' | 'model';

export interface RenderConfig {
  type: RenderType;
  /** Public URL for type: 'model' — стройте через `assetUrl` (учитывает base). */
  path?: string;
}

/**
 * Путь к файлу в `public/` с учётом `base` сборки — иначе деплой в подпапку
 * (`/game/`) ломает загрузку моделей абсолютным `/models/...`.
 */
function assetUrl(relative: string): string {
  const base = import.meta.env.BASE_URL || '/';
  return `${base.replace(/\/$/, '')}/${relative.replace(/^\//, '')}`;
}

/**
 * Hull visuals. `viking` = light / high-speed hull → textured GLB.
 * Turrets stay procedural until dedicated models exist.
 */
export const HULL_CONFIG: Record<HullId, RenderConfig> = {
  hunter: { type: 'code' },
  viking: { type: 'model', path: assetUrl('models/tanks/LightTankHullTextured.glb') },
  mammoth: { type: 'code' },
};

export const TURRET_CONFIG: Record<TurretId, RenderConfig> = {
  railgun: { type: 'code' },
  flamethrower: { type: 'code' },
  cannon: { type: 'code' },
};

/** Default deck height for turret mount (Y on hull local space). */
export const HULL_TURRET_Y: Record<HullId, number> = {
  hunter: 1.9,
  viking: 1.5,
  mammoth: 2.3,
};

/** Target length (Z/X max) when normalizing imported hull GLBs to game units. */
export const MODEL_HULL_TARGET_LENGTH = 4.6;
