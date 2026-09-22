// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { useFocusTrap } from '../hooks/useFocusTrap';
import PauseMenu from '../components/PauseMenu';
import GameOverScreen from '../components/GameOverScreen';
import type { GameApi } from '../game/GameApi';

/**
 * Focus-trap coverage for the modal surfaces (pause / game over / mode / map
 * select all route through this hook; BACKLOG H3).
 *
 * jsdom does not implement layout, so `offsetParent` is null for every element
 * — and the hook filters focusables by `offsetParent !== null`. Without the
 * stub below the trap would see an empty focusable list and silently do
 * nothing, which is a jsdom limitation, not a product bug. The stub is what
 * makes the browser behaviour observable here.
 */

beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
    configurable: true,
    get() {
      return document.body;
    },
  });
});

function Trap({ active = true }: { active?: boolean }) {
  const ref = useFocusTrap(active);
  return (
    <div ref={ref}>
      <button type="button">first</button>
      <button type="button">second</button>
      <button type="button">last</button>
    </div>
  );
}

const btn = (name: string) => screen.getByRole('button', { name });

describe('useFocusTrap', () => {
  it('focuses the first focusable element on mount', () => {
    render(<Trap />);

    expect(btn('first')).toHaveFocus();
  });

  it('prefers the [data-autofocus] element — the primary CTA (H7)', () => {
    function CtaTrap() {
      const ref = useFocusTrap(true);
      return (
        <div ref={ref}>
          <button type="button">back</button>
          <button type="button" data-autofocus>confirm</button>
        </div>
      );
    }
    render(<CtaTrap />);

    expect(btn('confirm')).toHaveFocus();
  });

  it('wraps Tab from the last element back to the first', () => {
    render(<Trap />);

    btn('last').focus();
    fireEvent.keyDown(btn('last'), { key: 'Tab' });

    expect(btn('first')).toHaveFocus();
  });

  it('wraps Shift+Tab from the first element to the last', () => {
    render(<Trap />);

    btn('first').focus();
    fireEvent.keyDown(btn('first'), { key: 'Tab', shiftKey: true });

    expect(btn('last')).toHaveFocus();
  });

  it('leaves mid-list Tab to the browser (no preventDefault)', () => {
    render(<Trap />);

    btn('first').focus();
    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    btn('first').dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    expect(btn('first')).toHaveFocus();
  });

  it('restores focus to the previously focused element on unmount', () => {
    const outside = document.createElement('button');
    outside.textContent = 'outside';
    document.body.appendChild(outside);
    outside.focus();

    const { unmount } = render(<Trap />);
    expect(btn('first')).toHaveFocus();

    unmount();

    expect(outside).toHaveFocus();
    outside.remove();
  });

  it('does not steal focus when inactive', () => {
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    outside.focus();

    render(<Trap active={false} />);

    expect(outside).toHaveFocus();
    outside.remove();
  });

  it('ignores non-Tab keys', () => {
    render(<Trap />);

    btn('last').focus();
    fireEvent.keyDown(btn('last'), { key: 'Enter' });

    expect(btn('last')).toHaveFocus();
  });
});

const pauseGame = {
  currentHull: 'hunter',
  currentTurret: 'railgun',
  getQuality: () => 'medium',
  cycleQuality: () => 'high',
  setMouseSettings: () => {},
} as unknown as GameApi;

describe('H7: real screens focus their primary CTA (behavioral)', () => {
  it('pause menu lands on ПРОДОЛЖИТЬ БОЙ, not the first ghost button', () => {
    render(
      <PauseMenu
        game={pauseGame}
        muted={false}
        stats={{ score: 10, kills: 2, timeSec: 65 }}
        crosshair="dot"
        onCrosshair={vi.fn()}
        damageNumbers
        onDamageNumbers={vi.fn()}
        onResume={vi.fn()}
        onRestart={vi.fn()}
        onGarage={vi.fn()}
        onMenu={vi.fn()}
        onToggleMute={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /ПРОДОЛЖИТЬ БОЙ/ })).toHaveFocus();
    expect(screen.getByRole('button', { name: /ЗАНОВО/ })).not.toHaveFocus();
  });

  it('game-over lands on РЕВАНШ, not the mode/menu ghosts', () => {
    render(
      <GameOverScreen
        score={1200}
        kills={7}
        deaths={3}
        bestStreak={4}
        playerWon
        winnerName={null}
        winnerTeam={null}
        reason="score"
        mode="deathmatch"
        matchTimeSec={240}
        teamKills={{ alpha: 0, bravo: 0 }}
        teamScore={{ alpha: 0, bravo: 0 }}
        onRematch={vi.fn()}
        onChangeMode={vi.fn()}
        onGarage={vi.fn()}
        onMenu={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /РЕВАНШ/ })).toHaveFocus();
    expect(screen.getByRole('button', { name: /В МЕНЮ/ })).not.toHaveFocus();
  });
});
