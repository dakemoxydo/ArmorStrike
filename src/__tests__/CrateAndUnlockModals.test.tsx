// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import CrateOpeningModal from '../components/CrateOpeningModal';
import DirectUnlockModal from '../components/DirectUnlockModal';
import { HULLS, TURRETS } from '../core/catalog';

describe('CrateOpeningModal', () => {
  it('renders hull crate candidates and confirms pick', async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    const onClose = vi.fn();

    render(
      <CrateOpeningModal
        type="hull"
        options={['mammoth', 'speedy']}
        credits={800}
        onPick={onPick}
        onClose={onClose}
      />,
    );

    expect(screen.getByText('КЕЙС КОРПУСА')).toBeInTheDocument();
    expect(screen.getByText(HULLS.mammoth.name)).toBeInTheDocument();
    expect(screen.getByText(HULLS.speedy.name)).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: 'ПОДТВЕРДИТЬ ВЫБОР' });
    expect(confirmBtn).toBeDisabled();

    // Select mammoth
    await user.click(screen.getByText(HULLS.mammoth.name));
    expect(confirmBtn).not.toBeDisabled();

    await user.click(confirmBtn);
    expect(onPick).toHaveBeenCalledWith('mammoth');
  });

  it('disables confirmation when player cannot afford crate', async () => {
    const user = userEvent.setup();
    render(
      <CrateOpeningModal
        type="turret"
        options={['cannon']}
        credits={200}
        onPick={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    await user.click(screen.getByText(TURRETS.cannon.name));
    const confirmBtn = screen.getByRole('button', { name: 'ПОДТВЕРДИТЬ ВЫБОР' });
    expect(confirmBtn).toBeDisabled();
  });
});

describe('DirectUnlockModal', () => {
  it('renders locked items list, allows selection, and confirms purchase', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onClose = vi.fn();

    render(
      <DirectUnlockModal
        items={[HULLS.mammoth, HULLS.titan]}
        isHull={true}
        playerCredits={1500}
        onConfirm={onConfirm}
        onClose={onClose}
      />,
    );

    expect(screen.getByText('ПРЯМАЯ РАЗБЛОКИРОВКА')).toBeInTheDocument();
    expect(screen.getByText('1200 CR')).toBeInTheDocument();

    // Select titan button in selector
    const titanBtn = screen.getByRole('button', { name: HULLS.titan.name });
    await user.click(titanBtn);

    const unlockBtn = screen.getByRole('button', { name: 'РАЗБЛОКИРОВАТЬ ЗА 1200 CR' });
    expect(unlockBtn).not.toBeDisabled();

    await user.click(unlockBtn);
    expect(onConfirm).toHaveBeenCalledWith(HULLS.titan);
  });

  it('disables unlock button and shows warning if balance is below 1200', () => {
    render(
      <DirectUnlockModal
        items={[TURRETS.gauss]}
        isHull={false}
        playerCredits={500}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    const unlockBtn = screen.getByRole('button', { name: 'РАЗБЛОКИРОВАТЬ ЗА 1200 CR' });
    expect(unlockBtn).toBeDisabled();
    expect(screen.getByText(/Недостаточно кредитов/)).toBeInTheDocument();
  });
});
