import { supabase } from '../../lib/supabaseClient';
import type { RunState } from '../RunState';
import type { HullId, TurretId } from '../../core/catalog';
import { HULLS, TURRETS } from '../../core/catalog';
import type { QuestProgress } from '../economy/questCatalog';

export interface CloudProfile {
  id: string;
  username: string;
  credits: number;
  unlocked_hulls: string[];
  unlocked_turrets: string[];
  current_hull: string;
  current_turret: string;
  starter_pack_claimed: boolean;
  quests: QuestProgress[];
  stats?: {
    kills: number;
    deaths: number;
    score: number;
    matches: number;
  };
  created_at?: string;
  updated_at?: string;
}

export class CloudSaveService {
  private static saveTimeout: ReturnType<typeof setTimeout> | null = null;
  private static pendingData: Partial<CloudProfile> | null = null;

  /** Загрузить профиль игрока из Supabase */
  static async loadProfile(userId: string): Promise<CloudProfile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error || !data) {
        return null;
      }

      return data as CloudProfile;
    } catch {
      return null;
    }
  }

  /**
   * Немедленное сохранение данных профиля в Supabase.
   */
  static async saveProfileImmediate(
    userId: string,
    data: Partial<CloudProfile>,
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Дебаунсированное сохранение (500мс) для предотвращения спама в БД.
   */
  static scheduleSave(
    userId: string,
    data: Partial<CloudProfile>,
    onSaved?: (success: boolean) => void,
  ) {
    this.pendingData = { ...this.pendingData, ...data };

    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    this.saveTimeout = setTimeout(async () => {
      if (!this.pendingData) return;
      const toSave = this.pendingData;
      this.pendingData = null;
      this.saveTimeout = null;

      const success = await this.saveProfileImmediate(userId, toSave);
      onSaved?.(success);
    }, 500);
  }

  /** Извлечь сохраняемые данные из RunState для сохранения в облако */
  static extractRunStateData(runState: RunState): Partial<CloudProfile> {
    return {
      credits: runState.credits,
      unlocked_hulls: runState.unlockedHulls,
      unlocked_turrets: runState.unlockedTurrets,
      current_hull: runState.currentHull,
      current_turret: runState.currentTurret,
      starter_pack_claimed: runState.starterPackClaimed,
      quests: runState.quests,
    };
  }

  /** Применить данные облачного профиля к локальному экземпляру RunState */
  static applyProfileToRunState(profile: CloudProfile, runState: RunState) {
    runState.username = profile.username;
    runState.isGuest = false;

    if (typeof profile.credits === 'number' && Number.isFinite(profile.credits)) {
      runState.credits = Math.max(0, Math.floor(profile.credits));
    }

    if (Array.isArray(profile.unlocked_hulls)) {
      const validHulls = profile.unlocked_hulls.filter(
        (h): h is HullId =>
          typeof h === 'string' && Object.prototype.hasOwnProperty.call(HULLS, h),
      );
      if (validHulls.length > 0) {
        runState.unlockedHulls = validHulls;
      }
    }

    if (Array.isArray(profile.unlocked_turrets)) {
      const validTurrets = profile.unlocked_turrets.filter(
        (t): t is TurretId =>
          typeof t === 'string' && Object.prototype.hasOwnProperty.call(TURRETS, t),
      );
      if (validTurrets.length > 0) {
        runState.unlockedTurrets = validTurrets;
      }
    }

    if (
      typeof profile.current_hull === 'string' &&
      Object.prototype.hasOwnProperty.call(HULLS, profile.current_hull)
    ) {
      runState.currentHull = profile.current_hull as HullId;
    }

    if (
      typeof profile.current_turret === 'string' &&
      Object.prototype.hasOwnProperty.call(TURRETS, profile.current_turret)
    ) {
      runState.currentTurret = profile.current_turret as TurretId;
    }

    runState.starterPackClaimed = Boolean(profile.starter_pack_claimed);

    if (Array.isArray(profile.quests) && profile.quests.length > 0) {
      runState.quests = profile.quests;
    }

    // Сохраняем актуализированный локальный кэш
    runState.save();
  }
}
