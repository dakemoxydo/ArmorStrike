// ===== Превью состава волны + опции баффов (детерминировано, как botSpawn) =====
import { botsForWave } from './constants';
import { HULL_IDS, TURRET_IDS, TURRETS, HULLS } from '../core/catalog';
import type { HullId, TurretId, WeaponType } from '../core/catalog';
import { roleForBot, roleLabel, type AIRole } from './aiRoles';

export type WaveBuffId = 'damage' | 'speed' | 'reload';

export interface WaveUnitPreview {
  index: number;
  hullId: HullId;
  turretId: TurretId;
  weapon: WeaponType;
  hullName: string;
  turretName: string;
  role: AIRole;
  roleName: string;
}

export interface WeaponTally {
  weapon: WeaponType;
  label: string;
  count: number;
}

export interface RoleTally {
  role: AIRole;
  label: string;
  count: number;
}

/** Состав волны N — та же логика, что spawnBot (hull/turret/role). */
export function previewWaveComposition(wave: number): WaveUnitPreview[] {
  const count = botsForWave(wave);
  const out: WaveUnitPreview[] = [];
  for (let i = 0; i < count; i++) {
    let hullId = HULL_IDS[i % HULL_IDS.length];
    const turretId = TURRET_IDS[(i + wave) % TURRET_IDS.length];
    const role = roleForBot(wave, i, turretId);
    if (role === 'elite') hullId = 'mammoth';
    out.push({
      index: i,
      hullId,
      turretId,
      weapon: TURRETS[turretId].weaponType,
      hullName: HULLS[hullId].name,
      turretName: TURRETS[turretId].name,
      role,
      roleName: roleLabel(role),
    });
  }
  return out;
}

/** Сводка «2× Рельсотрон, 1× Пушка» для баннера. */
export function tallyWeapons(units: readonly WaveUnitPreview[]): WeaponTally[] {
  const map = new Map<WeaponType, number>();
  for (const u of units) {
    map.set(u.weapon, (map.get(u.weapon) ?? 0) + 1);
  }
  const label: Record<WeaponType, string> = {
    railgun: 'Рельса',
    flamethrower: 'Огонь',
    cannon: 'Пушка',
  };
  const order: WeaponType[] = ['railgun', 'cannon', 'flamethrower'];
  return order
    .filter((w) => (map.get(w) ?? 0) > 0)
    .map((w) => ({ weapon: w, label: label[w], count: map.get(w)! }));
}

/** Сводка ролей «1× Элит, 2× Снайпер». */
export function tallyRoles(units: readonly WaveUnitPreview[]): RoleTally[] {
  const map = new Map<AIRole, number>();
  for (const u of units) {
    map.set(u.role, (map.get(u.role) ?? 0) + 1);
  }
  const order: AIRole[] = ['elite', 'sniper', 'assault', 'standard'];
  return order
    .filter((r) => (map.get(r) ?? 0) > 0)
    .map((r) => ({ role: r, label: roleLabel(r), count: map.get(r)! }));
}

export interface WaveBuffOption {
  id: WaveBuffId;
  title: string;
  desc: string;
}

/** Боевые баффы на следующую волну: урон / скорость / перезарядка. */
export const WAVE_BUFF_OPTIONS: WaveBuffOption[] = [
  {
    id: 'damage',
    title: 'УРОН',
    desc: '+25% урона оружия на следующую волну',
  },
  {
    id: 'speed',
    title: 'СКОРОСТЬ',
    desc: '+20% хода и +15% поворота корпуса',
  },
  {
    id: 'reload',
    title: 'ПЕРЕЗАРЯДКА',
    desc: '−30% времени перезарядки / КД / заряда',
  },
];
