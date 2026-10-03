// @vitest-environment jsdom
// ===== Отложенный авто-переход на вкладку входа после сброса пароля =====
// Таймер жил внутри обработчика без учёта жизненного цикла: закрытая модалка
// (X/Escape) всё равно получала switchTab/setTab на размонтированном дереве.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import AuthModal from '../components/auth/AuthModal';
import { AuthService } from '../game/auth/authService';

vi.mock('../game/auth/authService', () => ({
  AuthService: {
    signIn: vi.fn(),
    signUp: vi.fn(),
    sendPasswordReset: vi.fn(),
    updatePassword: vi.fn(),
  },
}));

const NEW_PASSWORD_PLACEHOLDER = 'минимум 6 символов';
const REPEAT_PLACEHOLDER = 'повторите пароль';

/** Заполнить форму сброса пароля и отправить её. */
async function submitNewPassword(onClose = vi.fn()) {
  vi.mocked(AuthService.updatePassword).mockResolvedValue({ user: null });
  const view = render(
    <AuthModal game={null} initialTab="reset_password" onClose={onClose} />,
  );

  fireEvent.change(screen.getByPlaceholderText(NEW_PASSWORD_PLACEHOLDER), {
    target: { value: 'newpass1' },
  });
  fireEvent.change(screen.getByPlaceholderText(REPEAT_PLACEHOLDER), {
    target: { value: 'newpass1' },
  });

  const form = screen.getByRole('button', { name: 'СОХРАНИТЬ ПАРОЛЬ' }).closest('form');
  expect(form).not.toBeNull();
  await act(async () => {
    fireEvent.submit(form as HTMLFormElement);
  });

  return view;
}

beforeEach(() => {
  vi.clearAllMocks();
  // Гасим только таймеры: очередь микротасков (промисы) должна остаться живой.
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('AuthModal: таймер авто-перехода на вход', () => {
  it('на живом таймере модалка переключается на вход', async () => {
    await submitNewPassword();

    expect(
      screen.getByText('Пароль успешно обновлён! Теперь вы можете войти.'),
    ).toBeInTheDocument();
    expect(vi.getTimerCount()).toBe(1);

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(screen.getByText('ВХОД В АККАУНТ')).toBeInTheDocument();
    expect(screen.queryByText('Пароль успешно обновлён!')).toBeNull();
  });

  it('размонтирование гасит таймер (закрытая модалка не дёргает setTab)', async () => {
    const { unmount } = await submitNewPassword();

    expect(vi.getTimerCount()).toBe(1);

    unmount();
    expect(vi.getTimerCount()).toBe(0);

    // Даже если время пролистать — живых таймеров не осталось.
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('закрытие кнопкой X (родитель снимает модалку) тоже снимает таймер', async () => {
    const onClose = vi.fn();
    const { unmount } = await submitNewPassword(onClose);

    fireEvent.click(screen.getByRole('button', { name: 'Закрыть окно' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(1);

    // App закрывает модалку по onClose — cleanup эффекта гасит таймер.
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});