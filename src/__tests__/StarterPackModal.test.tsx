// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import StarterPackModal from '../components/StarterPackModal';

describe('StarterPackModal — Draft Pick 3 карт', () => {
  it('проводит игрока через 3 шага: выбор корпуса, выбор башни, подтверждение сборки', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();

    render(
      <StarterPackModal
        onComplete={onComplete}
        initialHulls={['hunter', 'viking', 'mammoth']}
        initialTurrets={['cannon', 'railgun', 'flamethrower']}
      />,
    );

    // Шаг 1: Контейнер шасси
    expect(screen.getByText(/КОНТЕЙНЕР ШАССИ/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ВЫБРАТЬ ХАНТЕР/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ВЫБРАТЬ ВИКИНГ/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ВЫБРАТЬ МАМОНТ/ })).toBeInTheDocument();

    // Выбираем «Викинг»
    await user.click(screen.getByRole('button', { name: /ВЫБРАТЬ ВИКИНГ/ }));

    // Шаг 2: Контейнер вооружения
    expect(screen.getByText(/КОНТЕЙНЕР ВООРУЖЕНИЯ/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ВЫБРАТЬ ПУШКА «СМОКИ»/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ВЫБРАТЬ РЕЛЬСОТРОН/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ВЫБРАТЬ ОГНЕМЁТ «FIREBIRD»/ })).toBeInTheDocument();

    // Выбираем «Рельсотрон»
    await user.click(screen.getByRole('button', { name: /ВЫБРАТЬ РЕЛЬСОТРОН/ }));

    // Шаг 3: Боевая машина собрана
    expect(screen.getByText(/ПЕРВАЯ БОЕВАЯ МАШИНА СОБРАНА/)).toBeInTheDocument();
    expect(screen.getByText('Викинг')).toBeInTheDocument();
    expect(screen.getByText('Рельсотрон')).toBeInTheDocument();

    // Завершаем сборку
    const confirmBtn = screen.getByRole('button', { name: /ПРИНЯТЬ ТАНК И В АНГАР/ });
    expect(confirmBtn).toBeInTheDocument();
    await user.click(confirmBtn);

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith('viking', 'railgun');
  });
});
