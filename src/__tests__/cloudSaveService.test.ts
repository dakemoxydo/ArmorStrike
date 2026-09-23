// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CloudSaveService, type CloudProfile } from '../game/auth/cloudSaveService';
import { RunState } from '../game/RunState';
import { supabase } from '../lib/supabaseClient';

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('CloudSaveService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('extracts run state data correctly', () => {
    const run = new RunState();
    run.credits = 1500;
    run.currentHull = 'mammoth';
    run.currentTurret = 'gauss';
    run.unlockedHulls = ['hunter', 'mammoth'];
    run.unlockedTurrets = ['railgun', 'gauss'];
    run.starterPackClaimed = true;

    const data = CloudSaveService.extractRunStateData(run);
    expect(data.credits).toBe(1500);
    expect(data.current_hull).toBe('mammoth');
    expect(data.current_turret).toBe('gauss');
    expect(data.unlocked_hulls).toEqual(['hunter', 'mammoth']);
    expect(data.unlocked_turrets).toEqual(['railgun', 'gauss']);
    expect(data.starter_pack_claimed).toBe(true);
  });

  it('applies cloud profile to RunState cleanly', () => {
    const run = new RunState();
    const profile: CloudProfile = {
      id: 'usr_77',
      username: 'IronGeneral',
      credits: 2400,
      current_hull: 'titan',
      current_turret: 'isida',
      unlocked_hulls: ['hunter', 'titan'],
      unlocked_turrets: ['railgun', 'isida'],
      starter_pack_claimed: true,
      quests: [
        { id: 'kills_5', current: 5, target: 5, claimed: false },
      ],
    };

    CloudSaveService.applyProfileToRunState(profile, run);

    expect(run.userId).toBe('usr_77');
    expect(run.username).toBe('IronGeneral');
    expect(run.isGuest).toBe(false);
    expect(run.credits).toBe(2400);
    expect(run.currentHull).toBe('titan');
    expect(run.currentTurret).toBe('isida');
    expect(run.unlockedHulls).toEqual(['hunter', 'titan']);
    expect(run.unlockedTurrets).toEqual(['railgun', 'isida']);
    expect(run.starterPackClaimed).toBe(true);
    expect(run.quests).toHaveLength(1);
    expect(run.quests[0].id).toBe('kills_5');
  });

  it('loads profile from Supabase', async () => {
    const mockProfile = {
      id: 'user_1',
      username: 'TankMaster',
      credits: 500,
    };

    const maybeSingleMock = vi.fn().mockResolvedValue({ data: mockProfile, error: null });
    const eqMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
    vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as never);

    const { profile, failed } = await CloudSaveService.loadProfile('user_1');
    expect(profile).toEqual(mockProfile);
    expect(failed).toBe(false);
    expect(supabase.from).toHaveBeenCalledWith('profiles');
  });

  it('marks network error as failed (no overwrite of cloud)', async () => {
    const maybeSingleMock = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'network down' },
    });
    const eqMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
    vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as never);

    const { profile, failed } = await CloudSaveService.loadProfile('user_1');
    expect(profile).toBeNull();
    expect(failed).toBe(true);
  });

  it('missing row is not a failure', async () => {
    const maybeSingleMock = vi.fn().mockResolvedValue({ data: null, error: null });
    const eqMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
    vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as never);

    const { profile, failed } = await CloudSaveService.loadProfile('user_new');
    expect(profile).toBeNull();
    expect(failed).toBe(false);
  });

  it('drops malformed quest entries on apply', () => {
    const run = new RunState();
    const profile = {
      id: 'usr_9',
      username: 'QGuard',
      credits: 100,
      current_hull: 'hunter',
      current_turret: 'railgun',
      unlocked_hulls: ['hunter'],
      unlocked_turrets: ['railgun'],
      starter_pack_claimed: false,
      quests: [
        { id: 'q_kills_5', current: 1, target: 5, claimed: false },
        { id: 'bad', current: Number.NaN, target: 5, claimed: false },
        null,
        { id: 'nope', current: 'x', target: 5, claimed: false },
      ],
    } as unknown as CloudProfile;

    CloudSaveService.applyProfileToRunState(profile, run);
    expect(run.quests).toHaveLength(1);
    expect(run.quests[0].id).toBe('q_kills_5');
  });
});
