// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LeaderboardService } from '../game/leaderboard/leaderboardService';

const getUser = vi.fn();
const rpc = vi.fn();
const fromMock = vi.fn();

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: (...args: unknown[]) => getUser(...args),
    },
    rpc: (...args: unknown[]) => rpc(...args),
    from: (...args: unknown[]) => fromMock(...args),
  },
}));

function makeTopChain(result: { data: unknown; error: unknown }) {
  return {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(result),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
}

function makeMineChain(mine: { data: unknown; error: unknown }) {
  return {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(mine),
  };
}

function row(overrides: Record<string, unknown> = {}) {
  return {
    user_id: 'u1',
    username: 'Tanker',
    best_score: 1200,
    kills: 8,
    deaths: 2,
    best_streak: 4,
    mode: 'deathmatch',
    match_time_sec: 300,
    matches_played: 3,
    updated_at: '2026-09-22T10:00:00Z',
    ...overrides,
  };
}

describe('LeaderboardService.submitMatchResult', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns guest without RPC when unauthenticated', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const res = await LeaderboardService.submitMatchResult({
      score: 100,
      kills: 1,
      deaths: 0,
      bestStreak: 1,
      mode: 'deathmatch',
      matchTimeSec: 60,
    });
    expect(res.status).toBe('guest');
    expect(rpc).not.toHaveBeenCalled();
  });

  it('clamps client numbers before RPC', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    rpc.mockResolvedValue({
      data: { success: true, improved: true, best_score: 50, matches_played: 2 },
      error: null,
    });

    const res = await LeaderboardService.submitMatchResult({
      score: -50,
      kills: 99999,
      deaths: -1,
      bestStreak: 10,
      mode: 'team_deathmatch',
      matchTimeSec: 999999,
    });

    expect(res.status).toBe('improved');
    expect(res.bestScore).toBe(50);
    expect(rpc).toHaveBeenCalledWith('submit_leaderboard_entry', {
      p_score: 0,
      p_kills: 1000,
      p_deaths: 0,
      p_mode: 'team_deathmatch',
      p_match_time_sec: 7200,
      p_best_streak: 10,
    });
  });

  it('maps improved=false to saved', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    rpc.mockResolvedValue({
      data: { success: true, improved: false, best_score: 900, matches_played: 4 },
      error: null,
    });

    const res = await LeaderboardService.submitMatchResult({
      score: 100,
      kills: 1,
      deaths: 0,
      bestStreak: 0,
      mode: 'capture_point',
      matchTimeSec: 120,
    });
    expect(res.status).toBe('saved');
    expect(res.bestScore).toBe(900);
  });

  it('maps auth_required payload to guest', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    rpc.mockResolvedValue({
      data: { success: false, error: 'auth_required' },
      error: null,
    });
    const res = await LeaderboardService.submitMatchResult({
      score: 1,
      kills: 0,
      deaths: 0,
      bestStreak: 0,
      mode: 'deathmatch',
      matchTimeSec: 1,
    });
    expect(res.status).toBe('guest');
  });

  it('never throws on network failure', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    rpc.mockRejectedValue(new Error('offline'));
    const res = await LeaderboardService.submitMatchResult({
      score: 10,
      kills: 1,
      deaths: 0,
      bestStreak: 1,
      mode: 'deathmatch',
      matchTimeSec: 30,
    });
    expect(res.status).toBe('error');
    expect(res.error).toBe('offline');
  });
});

describe('LeaderboardService.fetchTop', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps rows and attaches my entry + rank for auth user', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    fromMock
      .mockReturnValueOnce(makeTopChain({ data: [row()], error: null }))
      .mockReturnValueOnce(makeMineChain({ data: row(), error: null }));
    rpc.mockResolvedValue({ data: 1, error: null });

    const res = await LeaderboardService.fetchTop();
    expect(res.ok).toBe(true);
    expect(res.entries).toHaveLength(1);
    expect(res.entries[0].bestScore).toBe(1200);
    expect(res.myRank).toBe(1);
    expect(res.myEntry?.username).toBe('Tanker');
    expect(rpc).toHaveBeenCalledWith('leaderboard_my_rank');
  });

  it('returns ok without my entry for guest', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    fromMock.mockReturnValueOnce(
      makeTopChain({
        data: [row({ user_id: 'other', username: 'Pro', best_score: 5000 })],
        error: null,
      }),
    );

    const res = await LeaderboardService.fetchTop(10);
    expect(res.ok).toBe(true);
    expect(res.entries[0].username).toBe('Pro');
    expect(res.myEntry).toBeNull();
    expect(res.myRank).toBeNull();
    expect(fromMock).toHaveBeenCalledWith('leaderboard');
  });

  it('surfaces query errors as not-ok', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    fromMock.mockReturnValueOnce(makeTopChain({ data: null, error: { message: 'boom' } }));
    const res = await LeaderboardService.fetchTop();
    expect(res.ok).toBe(false);
    expect(res.error).toBe('boom');
    expect(res.entries).toEqual([]);
  });

  it('sanitizes hostile row shapes', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    fromMock.mockReturnValueOnce(
      makeTopChain({
        data: [
          {
            user_id: 'x',
            username: 'A',
            best_score: 'not-a-number',
            mode: 'invalid',
            kills: null,
            deaths: -5,
            best_streak: 9999,
            match_time_sec: 'x',
            matches_played: null,
            updated_at: 42,
          },
        ],
        error: null,
      }),
    );
    const res = await LeaderboardService.fetchTop();
    expect(res.ok).toBe(true);
    const e = res.entries[0];
    expect(e.bestScore).toBe(0);
    expect(e.mode).toBe('deathmatch');
    expect(e.kills).toBe(0);
    expect(e.deaths).toBe(0);
    expect(e.bestStreak).toBe(1000);
    expect(e.matchTimeSec).toBe(0);
    expect(e.matchesPlayed).toBe(1);
  });
});
