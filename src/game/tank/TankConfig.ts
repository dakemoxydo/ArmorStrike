import type { HullId, TurretId } from '../../core/catalog';

type RenderType = 'code' | 'model';

export interface RenderConfig {
  type: RenderType;
  /** Public URL for type: 'model' — стройте через `assetUrl` (учитывает base). */
  path?: string;
}

/**
 * Глобальный выключатель системы GLTF-моделей.
 *
 * Единственная модель (`LightTankHullTextured.glb`) удалена — система
 * (AssetManager, modelUtils, ветки TankFactory) сохранена, но отключена:
 * все юниты рендерятся процедурно. Чтобы включить обратно: вернуть файл(ы)
 * в `public/models/…`, прописать их в конфигах ниже и поставить `true`.
 */
export const MODELS_ENABLED = false;

/**
 * Путь к файлу в `public/` с учётом `base` сборки — иначе деплой в подпапку
 * (`/game/`) ломает загрузку моделей абсолютным `/models/...`.
 * Экспортирован для возврата моделей: см. шаблон в HULL_CONFIG.
 */
export function assetUrl(relative: string): string {
  const base = import.meta.env.BASE_URL || '/';
  return `${base.replace(/\/$/, '')}/${relative.replace(/^\//, '')}`;
}

/**
 * Hull visuals. Пока MODELS_ENABLED=false все корпуса процедурные.
 * Шаблон для возврата: `{ type: 'model', path: assetUrl('models/tanks/<name>.glb') }`.
 */
export const HULL_CONFIG: Record<HullId, RenderConfig> = {
  hunter: { type: 'code' },
  viking: { type: 'code' },
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
