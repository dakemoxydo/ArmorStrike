// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import GameOverScreen from '../components/GameOverScreen';
import type { MatchRewards } from '../game/economy/matchRewards';

describe('GameOverScreen rewards presentation', () => {
  it('renders match rewards breakdown banner and tasks button', async () => {
    const user = userEvent.setup();
    const onQuests = vi.fn();
    const onLeaderboard = vi.fn();
    const rewards: MatchRewards = {
      base: 50,
      kills: 60,
      score: 45,
      win: 100,
      streak: 30,
      total: 285,
    };

    render(
      <GameOverScreen
        score={450}
        kills={3}
        deaths={1}
        bestStreak={2}
        playerWon={true}
        winnerName="Игрок"
        winnerTeam="alpha"
        reason="score"
        mode="deathmatch"
        matchTimeSec={120}
        teamKills={{ alpha: 3, bravo: 1 }}
        teamScore={{ alpha: 3, bravo: 1 }}
        rewards={rewards}
        onQuests={onQuests}
        leaderboardSubmit={{ status: 'improved', bestScore: 450, improved: true }}
        onLeaderboard={onLeaderboard}
        onRematch={vi.fn()}
        onChangeMode={vi.fn()}
        onGarage={vi.fn()}
        onMenu={vi.fn()}
      />,
    );

    expect(screen.getByText('НАГРАДА ЗА БОЙ')).toBeInTheDocument();
    expect(screen.getByText('+285')).toBeInTheDocument();
    expect(screen.getByText('Участие')).toBeInTheDocument();
    expect(screen.getByText('+50')).toBeInTheDocument();
    expect(screen.getByText('+60')).toBeInTheDocument();
    expect(screen.getByText('+45')).toBeInTheDocument();
    expect(screen.getByText('Победа')).toBeInTheDocument();
    expect(screen.getByText('+100')).toBeInTheDocument();
    expect(screen.getByText('+30')).toBeInTheDocument();

    // L3: статус авто-отправки рекорда + кнопка лидерборда
    expect(screen.getByRole('status')).toHaveTextContent(/НОВЫЙ РЕКОРД/);
    const lbBtn = screen.getByRole('button', { name: /ЛИДЕРБОРД/ });
    await user.click(lbBtn);
    expect(onLeaderboard).toHaveBeenCalled();

    const tasksBtn = screen.getByRole('button', { name: /ЗАДАЧИ/ });
    await user.click(tasksBtn);
    expect(onQuests).toHaveBeenCalled();
  });
});
