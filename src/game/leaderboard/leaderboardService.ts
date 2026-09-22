import { supabase } from '../../lib/supabaseClient';
import type { MatchModeId } from '../match/matchTypes';

/** Метка отправки рекорда на экране GameOver / в модалке. */
export type LeaderboardSubmitStatus =
  | 'pending'
  | 'improved'
  | 'saved'
  | 'guest'
  | 'error';

export interface LeaderboardSubmitInput {
  score: number;
  kills: number;
  deaths: number;
  bestStreak: number;
  mode: MatchModeId;
  matchTimeSec: number;
}

export interface LeaderboardSubmitResult {
  status: Exclude<LeaderboardSubmitStatus, 'pending'>;
  bestScore?: number;
  improved?: boolean;
  matchesPlayed?: number;
  error?: string;
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  bestScore: number;
  kills: number;
  deaths: number;
  bestStreak: number;
  mode: MatchModeId;
  matchTimeSec: number;
  matchesPlayed: number;
  updatedAt: string;
}

export interface LeaderboardTopResult {
  ok: boolean;
  entries: LeaderboardEntry[];
  myRank: number | null;
  myEntry: LeaderboardEntry | null;
  error?: string;
}

const TOP_DEFAULT = 50;
const TOP_MAX = 100;

function clampInt(value: unknown, min: number, max: number, fallback = 0): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? Math.floor(value) : fallback;
  return Math.min(max, Math.max(min, n));
}

function mapRow(row: Record<string, unknown>): LeaderboardEntry {
  const mode = row.mode;
  return {
    userId: String(row.user_id ?? ''),
    username: String(row.username ?? '—'),
    bestScore: clampInt(row.best_score, 0, 1000000),
    kills: clampInt(row.kills, 0, 1000),
    deaths: clampInt(row.deaths, 0, 1000),
    bestStreak: clampInt(row.best_streak, 0, 1000),
    mode:
      mode === 'team_deathmatch' || mode === 'capture_point' || mode === 'deathmatch'
        ? mode
        : 'deathmatch',
    matchTimeSec: clampInt(row.match_time_sec, 0, 7200),
    matchesPlayed: clampInt(row.matches_played, 1, 1000000, 1),
    updatedAt: String(row.updated_at ?? ''),
  };
}

/**
 * Глобальный лидерборд (L3).
 *
 * Запись — только RPC `submit_leaderboard_entry` (сервер клампит числа,
 * username берёт из profiles, upsert оставляет личный рекорд).
 * Чтение — публичный SELECT таблицы `leaderboard`.
 */
export class LeaderboardService {
  /**
   * Авто-запись рекорда после gameOver. Гости и офлайн — мягкое состояние
   * без исключения: экран результатов не должен падать из-за сети.
   */
  static async submitMatchResult(
    input: LeaderboardSubmitInput,
  ): Promise<LeaderboardSubmitResult> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return { status: 'guest' };
      }

      const { data, error } = await supabase.rpc('submit_leaderboard_entry', {
        p_score: clampInt(input.score, 0, 1000000),
        p_kills: clampInt(input.kills, 0, 1000),
        p_deaths: clampInt(input.deaths, 0, 1000),
        p_mode: input.mode,
        p_match_time_sec: clampInt(input.matchTimeSec, 0, 7200),
        p_best_streak: clampInt(input.bestStreak, 0, 1000),
      });

      if (error) {
        return { status: 'error', error: error.message };
      }

      const payload = data as {
        success?: boolean;
        error?: string;
        improved?: boolean;
        best_score?: number;
        matches_played?: number;
      } | null;

      if (!payload?.success) {
        if (payload?.error === 'auth_required') return { status: 'guest' };
        return { status: 'error', error: payload?.error ?? 'submit_failed' };
      }

      return {
        status: payload.improved ? 'improved' : 'saved',
        bestScore: typeof payload.best_score === 'number' ? payload.best_score : undefined,
        improved: Boolean(payload.improved),
        matchesPlayed:
          typeof payload.matches_played === 'number' ? payload.matches_played : undefined,
      };
    } catch (e) {
      return {
        status: 'error',
        error: e instanceof Error ? e.message : 'network_error',
      };
    }
  }

  /** Топ-N + место и строка текущего игрока (null для гостя / без записи). */
  static async fetchTop(limit = TOP_DEFAULT): Promise<LeaderboardTopResult> {
    const take = clampInt(limit, 1, TOP_MAX, TOP_DEFAULT);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('leaderboard')
        .select(
          'user_id,username,best_score,kills,deaths,best_streak,mode,match_time_sec,matches_played,updated_at',
        )
        .order('best_score', { ascending: false })
        .order('updated_at', { ascending: true })
        .order('user_id', { ascending: true })
        .limit(take);

      if (error) {
        return { ok: false, entries: [], myRank: null, myEntry: null, error: error.message };
      }

      const entries = ((data as Record<string, unknown>[] | null) ?? []).map(mapRow);

      let myEntry: LeaderboardEntry | null = null;
      let myRank: number | null = null;

      if (user) {
        const { data: mine, error: mineErr } = await supabase
          .from('leaderboard')
          .select(
            'user_id,username,best_score,kills,deaths,best_streak,mode,match_time_sec,matches_played,updated_at',
          )
          .eq('user_id', user.id)
          .maybeSingle();

        if (!mineErr && mine) {
          myEntry = mapRow(mine as Record<string, unknown>);
          const { data: rank, error: rankErr } = await supabase.rpc('leaderboard_my_rank');
          if (!rankErr && typeof rank === 'number') {
            myRank = rank;
          }
        }
      }

      return { ok: true, entries, myRank, myEntry };
    } catch (e) {
      return {
        ok: false,
        entries: [],
        myRank: null,
        myEntry: null,
        error: e instanceof Error ? e.message : 'network_error',
      };
    }
  }
}
