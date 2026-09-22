// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import LeaderboardModal from '../components/LeaderboardModal';
import { LeaderboardService } from '../game/leaderboard/leaderboardService';

vi.mock('../game/leaderboard/leaderboardService', () => ({
  LeaderboardService: {
    fetchTop: vi.fn(),
  },
}));

const okResult = {
  ok: true,
  myRank: 2,
  myEntry: {
    userId: 'me',
    username: 'Я',
    bestScore: 800,
    kills: 4,
    deaths: 1,
    bestStreak: 2,
    mode: 'deathmatch' as const,
    matchTimeSec: 200,
    matchesPlayed: 5,
    updatedAt: '2026-09-22T12:00:00Z',
  },
  entries: [
    {
      userId: 'pro',
      username: 'Pro',
      bestScore: 2000,
      kills: 12,
      deaths: 0,
      bestStreak: 6,
      mode: 'team_deathmatch' as const,
      matchTimeSec: 300,
      matchesPlayed: 9,
      updatedAt: '2026-09-22T11:00:00Z',
    },
    {
      userId: 'me',
      username: 'Я',
      bestScore: 800,
      kills: 4,
      deaths: 1,
      bestStreak: 2,
      mode: 'deathmatch' as const,
      matchTimeSec: 200,
      matchesPlayed: 5,
      updatedAt: '2026-09-22T12:00:00Z',
    },
  ],
};

describe('LeaderboardModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders ranked rows after load', async () => {
    vi.mocked(LeaderboardService.fetchTop).mockResolvedValue(okResult);
    const onClose = vi.fn();
    render(<LeaderboardModal onClose={onClose} />);

    expect(screen.getByText('ЛИДЕРБОРД')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Pro')).toBeInTheDocument());
    expect(screen.getByText('Я')).toBeInTheDocument();
    expect(screen.getByLabelText('Место 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Место 2')).toBeInTheDocument();
    expect(screen.getAllByText('ВЫ')).toHaveLength(1);
  });

  it('shows retry UI on fetch failure and reloads on click', async () => {
    const user = userEvent.setup();
    vi.mocked(LeaderboardService.fetchTop)
      .mockResolvedValueOnce({
        ok: false,
        entries: [],
        myRank: null,
        myEntry: null,
        error: 'network',
      })
      .mockResolvedValueOnce(okResult);

    render(<LeaderboardModal onClose={vi.fn()} />);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Не удалось загрузить рейтинг')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'ПОВТОРИТЬ' }));
    expect(await screen.findByText('Pro')).toBeInTheDocument();
    expect(LeaderboardService.fetchTop).toHaveBeenCalledTimes(2);
  });

  it('closes on Escape', async () => {
    vi.mocked(LeaderboardService.fetchTop).mockResolvedValue(okResult);
    const onClose = vi.fn();
    render(<LeaderboardModal onClose={onClose} />);
    await waitFor(() => expect(screen.getByText('Pro')).toBeInTheDocument());

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(onClose).toHaveBeenCalled();
  });
});
