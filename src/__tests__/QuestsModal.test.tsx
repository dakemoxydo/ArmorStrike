// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import QuestsModal from '../components/QuestsModal';
import type { GameApi } from '../game/GameApi';
import type { QuestProgress } from '../game/economy/questCatalog';

function makeMockGame(quests: QuestProgress[] = [], credits = 500): GameApi {
  return {
    currentHull: 'hunter',
    currentTurret: 'railgun',
    currentMapId: 'sandbox',
    currentMatchMode: 'deathmatch',
    unlockedHulls: ['hunter'],
    unlockedTurrets: ['railgun'],
    starterPackClaimed: true,
    credits,
    quests,
    claimStarterPack: vi.fn(),
    claimQuest: vi.fn().mockReturnValue(200),
    purchaseCrate: vi.fn(),
    purchaseDirectUnlock: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    setHudCallback: vi.fn(),
    setMode: vi.fn(),
    setMatchMode: vi.fn(),
    startRound: vi.fn(),
    togglePause: vi.fn(),
    toggleMute: vi.fn(),
    getQuality: vi.fn(),
    cycleQuality: vi.fn(),
    setGarageSelection: vi.fn(),
    setGarageViewportInset: vi.fn(),
  } as unknown as GameApi;
}

describe('QuestsModal', () => {
  it('renders title, credits and quest cards', () => {
    const quests: QuestProgress[] = [
      { id: 'q_kills_5', current: 2, target: 5, claimed: false },
      { id: 'q_win_any', current: 1, target: 1, claimed: false },
    ];
    const game = makeMockGame(quests, 750);
    render(<QuestsModal game={game} onClose={vi.fn()} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('БОЕВЫЕ ЗАДАЧИ')).toBeInTheDocument();
    expect(screen.getByText('750')).toBeInTheDocument();
    expect(screen.getByText('Охотник на танках')).toBeInTheDocument();
    expect(screen.getByText('Вкус победы')).toBeInTheDocument();
    expect(screen.getByText('2 / 5')).toBeInTheDocument();
    expect(screen.getByText('ВЫПОЛНЕНО')).toBeInTheDocument();
  });

  it('allows claiming completed quests and triggers game.claimQuest', async () => {
    const user = userEvent.setup();
    const quests: QuestProgress[] = [
      { id: 'q_win_any', current: 1, target: 1, claimed: false },
    ];
    const game = makeMockGame(quests, 100);
    render(<QuestsModal game={game} onClose={vi.fn()} />);

    const claimBtn = screen.getByRole('button', { name: 'ЗАБРАТЬ' });
    await user.click(claimBtn);

    expect(game.claimQuest).toHaveBeenCalledWith('q_win_any');
  });

  it('calls onClose when clicking close button', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const game = makeMockGame([], 0);
    render(<QuestsModal game={game} onClose={onClose} />);

    const closeBtn = screen.getByRole('button', { name: 'Закрыть задачи' });
    await user.click(closeBtn);

    expect(onClose).toHaveBeenCalled();
  });
});
