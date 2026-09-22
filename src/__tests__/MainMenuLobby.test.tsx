// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import MainMenu from '../components/MainMenu';
import { HULLS, TURRETS } from '../core/catalog';
import type { GameApi } from '../game/GameApi';

vi.mock('../game/auth/authService', () => ({
  AuthService: {
    signOut: vi.fn().mockResolvedValue({}),
  },
}));

describe('MainMenu Game Lobby Framing', () => {
  const mockGame = {
    username: 'Tankist_777',
    isGuest: false,
    syncStatus: 'synced',
    unlockedHulls: ['hunter', 'titan'],
    unlockedTurrets: ['railgun', 'cannon'],
    addListener: vi.fn(),
    removeListener: vi.fn(),
  } as unknown as GameApi;

  it('renders the game lobby with dominating В БОЙ button and full vertical command stack', async () => {
    const onStart = vi.fn();
    const onQuickGame = vi.fn();
    const onGarage = vi.fn();
    const onServerBrowser = vi.fn();
    const onQuests = vi.fn();
    const onLeaderboard = vi.fn();
    const onSettings = vi.fn();

    const user = userEvent.setup();
    render(
      <MainMenu
        hull={HULLS.hunter}
        turret={TURRETS.railgun}
        credits={1500}
        claimableQuestsCount={2}
        game={mockGame}
        onStart={onStart}
        onQuickGame={onQuickGame}
        onGarage={onGarage}
        onServerBrowser={onServerBrowser}
        onQuests={onQuests}
        onLeaderboard={onLeaderboard}
        onSettings={onSettings}
      />,
    );

    // 1. Проверяем мощный логотип
    expect(screen.getByText('ARMOR')).toBeInTheDocument();
    expect(screen.getByText('STRIKE')).toBeInTheDocument();

    // 2. Проверяем доминирующую кнопку «В БОЙ!»
    const battleBtn = screen.getByRole('button', { name: /В бой: начать игру/i });
    expect(battleBtn).toBeInTheDocument();
    expect(battleBtn).toHaveClass('btn-big-battle');
    await user.click(battleBtn);
    expect(onStart).toHaveBeenCalledTimes(1);

    // 3. Быстрая игра
    const quickBtn = screen.getByRole('button', { name: /Быстрая игра/i });
    await user.click(quickBtn);
    expect(onQuickGame).toHaveBeenCalledTimes(1);

    // 4. ГАРАЖ
    const garageBtn = screen.getByRole('button', { name: /Гараж/i });
    expect(garageBtn).toBeInTheDocument();
    await user.click(garageBtn);
    expect(onGarage).toHaveBeenCalledTimes(1);

    // 5. СПИСОК СЕРВЕРОВ
    const serverBtn = screen.getByRole('button', { name: /Список серверов/i });
    expect(serverBtn).toBeInTheDocument();
    await user.click(serverBtn);
    expect(onServerBrowser).toHaveBeenCalledTimes(1);

    // 6. ЗАДАЧИ с бейджем наград
    const questsBtn = screen.getByRole('button', { name: /Боевые задачи/i });
    expect(questsBtn).toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument();
    await user.click(questsBtn);
    expect(onQuests).toHaveBeenCalledTimes(1);

    // 7. ЛИДЕРБОРД (L3)
    const lbBtn = screen.getByRole('button', { name: /Глобальный лидерборд/i });
    expect(lbBtn).toBeInTheDocument();
    await user.click(lbBtn);
    expect(onLeaderboard).toHaveBeenCalledTimes(1);

    // 8. НАСТРОЙКИ
    const settingsBtn = screen.getByRole('button', { name: /Настройки звука/i });
    expect(settingsBtn).toBeInTheDocument();
    await user.click(settingsBtn);
    expect(onSettings).toHaveBeenCalledTimes(1);

    // 9. Живой угол статуса (HUD Header)
    expect(screen.getByText('Tankist_777')).toBeInTheDocument();
    expect(screen.getByText('СТАРШИНА')).toBeInTheDocument();
    expect(screen.getByText(/1[\s,.]?500/)).toBeInTheDocument();
    expect(screen.getByText('24ms')).toBeInTheDocument();

    // 10. Маркетинговые лендинговые тексты удалены
    expect(screen.queryByText(/Разрушаемые укрытия/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/3D ПРЕДПРОСМОТР/i)).not.toBeInTheDocument();
  });
});
