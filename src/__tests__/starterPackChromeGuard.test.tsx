// @vitest-environment jsdom
// ===== Стартовый комплект — неубираемый верхний экран: он обязан глушить
// ===== глобальные хоткеи и включать hideChrome, иначе Enter (шорткат кнопки
// ===== «В БОЙ!») открывает ModeSelect→MapSelect прямо поверх его скрима,
// ===== а игрок уходит в раунд под модалкой, которую нечем закрыть. =====
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import App from '../App';
import type { GameApi } from '../game/GameApi';
import type { BootstrapResult } from '../hooks/useGameBootstrap';

/** Изменяемое состояние мока: читается свежим на каждом рендере App. */
const state = vi.hoisted(() => ({
  starterClaimed: true,
  uiMode: 'menu',
}));

/** Минимальный GameApi: App дёргает только синхронные геттеры + togglePause/setMode. */
const game = vi.hoisted(() => ({
  currentHull: 'hunter',
  currentTurret: 'railgun',
  currentMapId: 'factory',
  currentMatchMode: 'deathmatch',
  username: 'Тестер',
  credits: 0,
  quests: [],
  unlockedHulls: ['hunter'],
  unlockedTurrets: ['railgun'],
  getHud: () => null,
  addListener: () => {},
  removeListener: () => {},
  togglePause: vi.fn(),
  toggleMute: vi.fn(() => false),
  setMode: vi.fn(),
  setMatchMode: vi.fn(),
  leaveMultiplayer: vi.fn(async () => {}),
  startRound: vi.fn(async () => {}),
  startMultiplayerRound: vi.fn(async () => {}),
  getNetworkId: () => 'net-test',
  claimStarterPack: vi.fn(async () => {}),
}));

// Бут WebGL/Game.create заменяем заглушкой — тест про маршрутизацию клавиш,
// а не про WebGL. HUD (миникарта, слои чисел) тоже выключаем заглушкой с
// одним наблюдаемым признаком `active` — им App управляет через hideChrome.
vi.mock('../hooks/useGameBootstrap', () => ({
  useGameBootstrap: () =>
    ({
      game: game as unknown as GameApi,
      bootError: null,
      uiMode: state.uiMode,
      paused: false,
      finalStats: {
        score: 0,
        kills: 0,
        deaths: 0,
        bestStreak: 0,
        playerWon: false,
        winnerName: null,
        winnerTeam: 'alpha',
        reason: 'score',
        mode: 'deathmatch',
        matchTimeSec: 0,
        teamKills: { alpha: 0, bravo: 0 },
        teamScore: { alpha: 0, bravo: 0 },
        rewards: undefined,
      },
      starterClaimed: state.starterClaimed,
      economyVersion: 0,
      leaderboardSubmit: null,
      setPaused: () => {},
      claimStarterPack: () => {},
    }) as unknown as BootstrapResult,
}));

vi.mock('../components/HUD', () => ({
  default: ({ active }: { active: boolean }) => (
    <div data-testid="hud" data-active={String(active)} />
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
  state.starterClaimed = true;
  state.uiMode = 'menu';
  // jsdom не умеет matchMedia, а App спрашивает его про pointer: fine.
  window.matchMedia = vi.fn().mockReturnValue({
    matches: true,
    addEventListener: () => {},
    removeEventListener: () => {},
  }) as unknown as typeof window.matchMedia;
});

describe('стартовый комплект: hideChrome + блокировка хоткеев', () => {
  it('незабранный комплект прячет меню/HUD и не даёт Enter открыть выбор режима', () => {
    state.starterClaimed = false;
    render(<App />);

    // Модал на месте — и он единственный экран поверх канваса.
    expect(screen.getByText('СТАРТОВЫЙ КОМПЛЕКТ НОВОБРАНЦА')).toBeInTheDocument();
    // hideChrome включён: HUD не активен, главное меню не отрисовано.
    expect(screen.getByTestId('hud')).toHaveAttribute('data-active', 'false');
    expect(screen.queryByRole('button', { name: /начать игру/i })).toBeNull();
    expect(screen.queryByText('ВЫБОР РЕЖИМА')).toBeNull();

    // Enter — ровно тот шорткат, что рекламируется на «В БОЙ!».
    fireEvent.keyDown(window, { code: 'Enter' });
    expect(screen.queryByText('ВЫБОР РЕЖИМА')).toBeNull();
  });

  it('после получения комплекта тот же Enter открывает выбор режима (контроль)', () => {
    state.starterClaimed = false;
    const { rerender } = render(<App />);
    fireEvent.keyDown(window, { code: 'Enter' });
    expect(screen.queryByText('ВЫБОР РЕЖИМА')).toBeNull();

    state.starterClaimed = true;
    rerender(<App />);

    // Модал ушёл, меню вернулось — и Enter снова работает.
    expect(screen.queryByText('СТАРТОВЫЙ КОМПЛЕКТ НОВОБРАНЦА')).toBeNull();
    expect(screen.getByRole('button', { name: /начать игру/i })).toBeInTheDocument();
    expect(screen.getByTestId('hud')).toHaveAttribute('data-active', 'false');

    fireEvent.keyDown(window, { code: 'Enter' });
    expect(screen.getByText('ВЫБОР РЕЖИМА')).toBeInTheDocument();
  });

  it('Escape не проходит сквозь стартовый модал (иначе он же снимет паузу)', () => {
    state.uiMode = 'playing';
    state.starterClaimed = false;
    const { rerender } = render(<App />);

    fireEvent.keyDown(window, { code: 'Escape' });
    expect(game.togglePause).not.toHaveBeenCalled();

    state.starterClaimed = true;
    rerender(<App />);
    fireEvent.keyDown(window, { code: 'Escape' });
    expect(game.togglePause).toHaveBeenCalledTimes(1);
  });
});