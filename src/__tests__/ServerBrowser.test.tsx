// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import ServerBrowserModal from '../components/multiplayer/ServerBrowserModal';
import CreateServerModal from '../components/multiplayer/CreateServerModal';
import PasswordPromptModal from '../components/multiplayer/PasswordPromptModal';
import { MultiplayerService } from '../game/network/multiplayerService';

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    channel: vi.fn(),
    removeChannel: vi.fn(),
  },
}));

describe('Multiplayer UI Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ServerBrowserModal', () => {
    it('renders server browser with title and action buttons', async () => {
      vi.spyOn(MultiplayerService, 'listRooms').mockResolvedValue([
        {
          id: 'room-101',
          name: 'Заводская битва #1',
          host_id: 'host-1',
          host_name: 'IronCommander',
          mode: 'team_deathmatch',
          map_id: 'factory',
          max_players: 8,
          player_count: 4,
          has_password: false,
          bots_enabled: true,
          status: 'in_progress',
        },
      ]);

      render(
        <ServerBrowserModal
          username="Tester"
          onJoinRoom={vi.fn()}
          onCreateRoom={vi.fn()}
          onQuickMatch={vi.fn()}
          onClose={vi.fn()}
        />,
      );

      expect(screen.getByText('СПИСОК СЕРВЕРОВ')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /СОЗДАТЬ СЕРВЕР/i })).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('Заводская битва #1')).toBeInTheDocument();
        expect(screen.getByText('4 / 8')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'ВОЙТИ' })).toBeInTheDocument();
      });
    });

    it('calls onJoinRoom when clicking enter button on open room', async () => {
      const joinMock = vi.fn();
      vi.spyOn(MultiplayerService, 'listRooms').mockResolvedValue([
        {
          id: 'room-open',
          name: 'Открытая комната',
          host_id: 'host-2',
          host_name: 'Sniper',
          mode: 'deathmatch',
          map_id: 'city',
          max_players: 6,
          player_count: 2,
          has_password: false,
          bots_enabled: true,
          status: 'waiting',
        },
      ]);

      const user = userEvent.setup();
      render(
        <ServerBrowserModal
          username="Tester"
          onJoinRoom={joinMock}
          onCreateRoom={vi.fn()}
          onQuickMatch={vi.fn()}
          onClose={vi.fn()}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('Открытая комната')).toBeInTheDocument();
      });

      const joinBtn = screen.getByRole('button', { name: 'ВОЙТИ' });
      await user.click(joinBtn);

      expect(joinMock).toHaveBeenCalledWith('room-open');
    });

    it('opens password modal when clicking enter on password-protected room', async () => {
      const joinMock = vi.fn();
      vi.spyOn(MultiplayerService, 'listRooms').mockResolvedValue([
        {
          id: 'room-locked',
          name: 'Приватный сервер',
          host_id: 'host-3',
          host_name: 'ClanLeader',
          mode: 'team_deathmatch',
          map_id: 'village',
          max_players: 4,
          player_count: 1,
          has_password: true,
          bots_enabled: false,
          status: 'waiting',
        },
      ]);

      const user = userEvent.setup();
      render(
        <ServerBrowserModal
          username="Tester"
          onJoinRoom={joinMock}
          onCreateRoom={vi.fn()}
          onQuickMatch={vi.fn()}
          onClose={vi.fn()}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('Приватный сервер')).toBeInTheDocument();
      });

      const joinBtn = screen.getByRole('button', { name: 'ВОЙТИ' });
      await user.click(joinBtn);

      expect(screen.getByText('СЕРВЕР ПОД ПАРОЛЕМ')).toBeInTheDocument();
    });
  });

  describe('CreateServerModal', () => {
    it('allows changing settings and submitting room creation', async () => {
      const createMock = vi.fn().mockResolvedValue(undefined);
      const user = userEvent.setup();

      render(
        <CreateServerModal
          defaultUsername="MajorTank"
          onCreate={createMock}
          onCancel={vi.fn()}
        />,
      );

      expect(screen.getByText('СОЗДАТЬ СЕРВЕР')).toBeInTheDocument();
      const nameInput = screen.getByPlaceholderText('Название сервера...');
      await user.clear(nameInput);
      await user.type(nameInput, 'Битва гигантов');

      const submitBtn = screen.getByRole('button', { name: /СОЗДАТЬ И НАЧАТЬ/i });
      await user.click(submitBtn);

      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Битва гигантов',
          mode: 'team_deathmatch',
          map_id: 'factory',
          max_players: 8,
          bots_enabled: true,
        }),
      );
    });
  });

  describe('PasswordPromptModal', () => {
    it('validates password input and calls onConfirm', async () => {
      const confirmMock = vi.fn();
      const user = userEvent.setup();

      render(
        <PasswordPromptModal
          roomName="Секретная комната"
          onConfirm={confirmMock}
          onCancel={vi.fn()}
        />,
      );

      const passInput = screen.getByPlaceholderText('Введите пароль...');
      await user.type(passInput, 'topsecret');

      const submitBtn = screen.getByRole('button', { name: 'ПОДКЛЮЧИТЬСЯ' });
      await user.click(submitBtn);

      expect(confirmMock).toHaveBeenCalledWith('topsecret');
    });
  });
});
