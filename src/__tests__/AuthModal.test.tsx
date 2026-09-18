// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import AuthModal from '../components/auth/AuthModal';

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
    },
    rpc: vi.fn(),
  },
}));

describe('AuthModal Component', () => {
  it('renders login tab by default with username/email and password fields', () => {
    render(<AuthModal game={null} onClose={vi.fn()} />);

    expect(screen.getByText('ВХОД В АККАУНТ')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('name@mail.com или username')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ВОЙТИ В АККАУНТ' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Забыли пароль?' })).toBeInTheDocument();
  });

  it('switches to registration tab and displays username, email, and password confirmation', async () => {
    const user = userEvent.setup();
    render(<AuthModal game={null} onClose={vi.fn()} />);

    const regTabBtn = screen.getByRole('button', { name: 'РЕГИСТРАЦИЯ' });
    await user.click(regTabBtn);

    expect(screen.getByText('ИМЯ ПОЛЬЗОВАТЕЛЯ (USERNAME)')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('От 3 до 20 символов')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('name@example.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('мин. 6 знаков')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('повторите')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'СОЗДАТЬ АККАУНТ' })).toBeInTheDocument();
  });

  it('shows password mismatch error on registration', async () => {
    const user = userEvent.setup();
    render(<AuthModal game={null} initialTab="register" onClose={vi.fn()} />);

    await user.type(screen.getByPlaceholderText('От 3 до 20 символов'), 'IronTanker');
    await user.type(screen.getByPlaceholderText('name@example.com'), 'tank@mail.com');
    await user.type(screen.getByPlaceholderText('мин. 6 знаков'), 'pass1234');
    await user.type(screen.getByPlaceholderText('повторите'), 'pass9999');

    await user.click(screen.getByRole('button', { name: 'СОЗДАТЬ АККАУНТ' }));

    expect(screen.getByText('Пароли не совпадают')).toBeInTheDocument();
  });

  it('switches to forgot password screen when clicking forgot password link', async () => {
    const user = userEvent.setup();
    render(<AuthModal game={null} onClose={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Забыли пароль?' }));

    expect(screen.getByText('СБРОС ПАРОЛЯ')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ОТПРАВИТЬ ССЫЛКУ' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Вернуться ко входу' })).toBeInTheDocument();
  });
});
