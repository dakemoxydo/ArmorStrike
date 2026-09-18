// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import UserBadge from '../components/auth/UserBadge';
import type { GameApi } from '../game/GameApi';

vi.mock('../game/auth/authService', () => ({
  AuthService: {
    signOut: vi.fn().mockResolvedValue({}),
  },
}));

describe('UserBadge Component', () => {
  it('renders guest mode by default with ВОЙТИ CTA', async () => {
    const onOpenAuth = vi.fn();
    const mockGame = {
      username: 'Гость',
      isGuest: true,
      syncStatus: 'idle',
      addListener: vi.fn(),
      removeListener: vi.fn(),
    } as unknown as GameApi;

    const user = userEvent.setup();
    render(<UserBadge game={mockGame} onOpenAuth={onOpenAuth} />);

    expect(screen.getByText('ГОСТЬ')).toBeInTheDocument();
    expect(screen.getByText('ВОЙТИ')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Войти в аккаунт' }));
    expect(onOpenAuth).toHaveBeenCalledTimes(1);
  });

  it('renders authenticated user with their username and logout button', async () => {
    const mockGame = {
      username: 'AlphaCommander',
      isGuest: false,
      syncStatus: 'synced',
      setAuthUser: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    } as unknown as GameApi;

    render(<UserBadge game={mockGame} onOpenAuth={vi.fn()} />);

    expect(screen.getByText('AlphaCommander')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Выйти из аккаунта' })).toBeInTheDocument();
  });
});
