// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import Garage from '../components/Garage';
import type { GameApi } from '../game/GameApi';
import type { HullId, TurretId } from '../core/catalog';

/**
 * Component coverage for the garage loadout picker (BACKLOG H2).
 *
 * Garage keeps a local mirror of the selection alongside the GameApi call, so
 * the failure mode worth guarding is not a missing call but a STALE PAIRING:
 * the hull updates while the turret argument still comes from the previous
 * render. Every test therefore asserts the exact (hull, turret) pair, not just
 * that some call happened.
 */

function fakeGame(initial: { hull?: HullId; turret?: TurretId } = {}) {
  const calls: Array<[HullId, TurretId]> = [];
  const game = {
    currentHull: initial.hull ?? 'hunter',
    currentTurret: initial.turret ?? 'railgun',
    setGarageSelection: (h: HullId, t: TurretId) => {
      calls.push([h, t]);
    },
  } as unknown as GameApi;
  return { game, calls };
}

function setup(initial?: { hull?: HullId; turret?: TurretId }) {
  const { game, calls } = fakeGame(initial);
  const onStart = vi.fn();
  const onBack = vi.fn();
  render(<Garage game={game} onStart={onStart} onBack={onBack} />);
  return { calls, onStart, onBack, user: userEvent.setup() };
}

const hullCard = (name: RegExp) => screen.getByRole('button', { name });
const turretCard = (name: RegExp) => screen.getByRole('button', { name });
const turretTab = () => screen.getByRole('tab', { name: /БАШНЯ/ });
const hullTab = () => screen.getByRole('tab', { name: /КОРПУС/ });
const pressedCards = () => screen.getAllByRole('button', { pressed: true });

describe('Garage — hull selection', () => {
  it('renders every hull and marks exactly the current one as pressed', () => {
    setup({ hull: 'viking' });

    for (const name of [/Хантер/, /Викинг/, /Мамонт/]) {
      expect(hullCard(name)).toBeInTheDocument();
    }
    const pressed = pressedCards();
    expect(pressed).toHaveLength(1);
    expect(pressed[0]).toHaveTextContent('Викинг');
  });

  it('pairs a newly picked hull with the currently selected turret', async () => {
    const { calls, user } = setup({ hull: 'hunter', turret: 'cannon' });

    await user.click(hullCard(/Мамонт/));

    expect(calls).toEqual([['mammoth', 'cannon']]);
    expect(pressedCards()[0]).toHaveTextContent('Мамонт');
  });
});

describe('Garage — turret selection keeps the freshly picked hull', () => {
  it('does not pair a new turret with the previous hull (stale-pairing guard)', async () => {
    const { calls, user } = setup({ hull: 'hunter', turret: 'railgun' });

    await user.click(hullCard(/Викинг/));
    await user.click(turretTab());
    await user.click(turretCard(/Смоки/));

    // The second call must carry the NEW hull, not 'hunter'.
    expect(calls).toEqual([
      ['viking', 'railgun'],
      ['viking', 'cannon'],
    ]);
  });

  it('switching tabs preserves the selected hull in the passport', async () => {
    const { user } = setup({ hull: 'mammoth', turret: 'railgun' });

    await user.click(turretTab());

    // Hull cards are unmounted on the turret tab, so the passport owns the text.
    expect(screen.getByText('Мамонт')).toBeInTheDocument();
    expect(pressedCards()[0]).toHaveTextContent('Рельсотрон');
  });
});

describe('Garage — rapid switching', () => {
  it('applies each click in order and leaves exactly one card selected', async () => {
    const { calls, user } = setup({ hull: 'hunter', turret: 'railgun' });

    await user.click(hullCard(/Викинг/));
    await user.click(hullCard(/Мамонт/));
    await user.click(hullCard(/Хантер/));

    expect(calls).toEqual([
      ['viking', 'railgun'],
      ['mammoth', 'railgun'],
      ['hunter', 'railgun'],
    ]);
    const pressed = pressedCards();
    expect(pressed).toHaveLength(1);
    expect(pressed[0]).toHaveTextContent('Хантер');
  });

  it('keeps turret and hull selections independent across tabs', async () => {
    const { calls, user } = setup({ hull: 'hunter', turret: 'railgun' });

    await user.click(turretTab());
    await user.click(turretCard(/Firebird/));
    await user.click(hullTab());
    await user.click(hullCard(/Мамонт/));

    expect(calls).toEqual([
      ['hunter', 'flamethrower'],
      ['mammoth', 'flamethrower'],
    ]);
  });
});

describe('Garage — passport reflects the current selection', () => {
  it('shows hull stats and swaps the weapon-specific hint with the turret', async () => {
    const { user } = setup({ hull: 'mammoth', turret: 'railgun' });

    expect(screen.getByText('160')).toBeInTheDocument(); // mammoth HP

    await user.click(turretTab());
    await user.click(turretCard(/Firebird/));

    expect(screen.getByText(/НЕПРЕРЫВНЫЙ КОНУС ПЛАМЕНИ/)).toBeInTheDocument();
    expect(screen.queryByText(/ФУГАСНЫЙ УРОН/)).not.toBeInTheDocument();
  });
});

describe('Garage — game not ready yet', () => {
  it('disables cards and the start button and shows the loading status', () => {
    render(<Garage game={null} onStart={vi.fn()} onBack={vi.fn()} />);

    expect(screen.getByRole('status')).toHaveTextContent('ЗАГРУЗКА ГАРАЖА');
    expect(screen.getByRole('button', { name: /В БОЙ/ })).toBeDisabled();
    expect(hullCard(/Хантер/)).toBeDisabled();
  });

  it('still lets the player leave the garage', async () => {
    const onBack = vi.fn();
    const user = userEvent.setup();
    render(<Garage game={null} onStart={vi.fn()} onBack={onBack} />);

    await user.click(screen.getByRole('button', { name: /В МЕНЮ/ }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

describe('Garage — header actions', () => {
  it('fires onStart when the game is ready', async () => {
    const { onStart, user } = setup();

    await user.click(screen.getByRole('button', { name: /В БОЙ/ }));

    expect(onStart).toHaveBeenCalledTimes(1);
  });
});
