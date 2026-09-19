// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import SettingsModal from '../components/SettingsModal';
import type { GameApi } from '../game/GameApi';

describe('SettingsModal Component', () => {
  const mockGame = {
    getQuality: vi.fn().mockReturnValue('medium'),
    cycleQuality: vi.fn().mockReturnValue('high'),
    setMouseSettings: vi.fn(),
  } as unknown as GameApi;

  it('renders settings dialog with audio, graphics, mouse, and crosshairs', async () => {
    const onToggleMute = vi.fn();
    const onCrosshair = vi.fn();
    const onDamageNumbers = vi.fn();
    const onClose = vi.fn();

    const user = userEvent.setup();
    render(
      <SettingsModal
        game={mockGame}
        muted={false}
        onToggleMute={onToggleMute}
        crosshair="dot"
        onCrosshair={onCrosshair}
        damageNumbers={true}
        onDamageNumbers={onDamageNumbers}
        onClose={onClose}
      />,
    );

    // Заголовок
    expect(screen.getByRole('heading', { name: /НАСТРОЙКИ/i })).toBeInTheDocument();

    // Звук
    const muteBtn = screen.getByRole('button', { name: /Выключить звук/i });
    await user.click(muteBtn);
    expect(onToggleMute).toHaveBeenCalledTimes(1);

    // Графика
    const qualityBtn = screen.getByRole('button', { name: /Качество графики/i });
    await user.click(qualityBtn);
    expect(mockGame.cycleQuality).toHaveBeenCalledTimes(1);

    // Прицел
    const crosshairBtn = screen.getByRole('button', { name: 'ТОЧКА' });
    await user.click(crosshairBtn);
    expect(onCrosshair).toHaveBeenCalledWith('dot');

    // Числа урона
    const damageNumBtn = screen.getByRole('button', { name: /ЧИСЛА УРОНА/i });
    await user.click(damageNumBtn);
    expect(onDamageNumbers).toHaveBeenCalledWith(false);

    // Закрытие
    const closeBtn = screen.getByRole('button', { name: /ГОТОВО/i });
    await user.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
