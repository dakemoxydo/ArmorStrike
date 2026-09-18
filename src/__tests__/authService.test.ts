import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  AuthService,
  validateEmail,
  validatePassword,
  validateUsername,
} from '../game/auth/authService';
import { supabase } from '../lib/supabaseClient';

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
      getUser: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    rpc: vi.fn(),
  },
}));

describe('Auth Validation', () => {
  it('validates username length and characters', () => {
    expect(validateUsername('ab')).toContain('минимум 3');
    expect(validateUsername('a'.repeat(21))).toContain('не должно превышать 20');
    expect(validateUsername('invalid!char')).toContain('только буквы');
    expect(validateUsername('Valid_Tanker-77')).toBeNull();
    expect(validateUsername('Танкист_123')).toBeNull();
  });

  it('validates email format', () => {
    expect(validateEmail('notanemail')).toContain('корректный адрес');
    expect(validateEmail('tanker@')).toContain('корректный адрес');
    expect(validateEmail('tanker@armorstrike.io')).toBeNull();
  });

  it('validates password length', () => {
    expect(validatePassword('12345')).toContain('не менее 6 символов');
    expect(validatePassword('123456')).toBeNull();
  });
});

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles signup with validation failure', async () => {
    const res = await AuthService.signUp('ab', 'bad', '123');
    expect(res.error).toBeDefined();
    expect(supabase.auth.signUp).not.toHaveBeenCalled();
  });

  it('handles duplicate username during signup', async () => {
    const selectMock = vi.fn().mockReturnValue({
      ilike: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({ data: { username: 'TakenName' }, error: null }),
      }),
    });
    vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as never);

    const res = await AuthService.signUp('TakenName', 'test@armorstrike.io', 'password123');
    expect(res.error).toContain('уже зарегистрирован');
    expect(supabase.auth.signUp).not.toHaveBeenCalled();
  });

  it('handles successful signup', async () => {
    const selectMock = vi.fn().mockReturnValue({
      ilike: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    });
    vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as never);

    vi.mocked(supabase.auth.signUp).mockResolvedValue({
      data: { user: { id: 'u123', email: 'test@armorstrike.io' }, session: {} },
      error: null,
    } as never);

    const res = await AuthService.signUp('NewCommander', 'test@armorstrike.io', 'password123');
    expect(res.error).toBeUndefined();
    expect(res.user?.id).toBe('u123');
    expect(supabase.auth.signUp).toHaveBeenCalled();
  });

  it('handles login with email directly', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: { id: 'u123', email: 'test@armorstrike.io' }, session: {} },
      error: null,
    } as never);

    const res = await AuthService.signIn('test@armorstrike.io', 'password123');
    expect(res.error).toBeUndefined();
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@armorstrike.io',
      password: 'password123',
    });
  });

  it('handles login with username by resolving email via RPC', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: 'resolved@armorstrike.io',
      error: null,
    } as never);

    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: { id: 'u123', email: 'resolved@armorstrike.io' }, session: {} },
      error: null,
    } as never);

    const res = await AuthService.signIn('CommanderAlpha', 'password123');
    expect(supabase.rpc).toHaveBeenCalledWith('get_email_by_username', {
      p_username: 'CommanderAlpha',
    });
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'resolved@armorstrike.io',
      password: 'password123',
    });
    expect(res.user?.id).toBe('u123');
  });

  it('returns error when username is not found for login', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: null,
    } as never);

    const res = await AuthService.signIn('UnknownTanker', 'password123');
    expect(res.error).toContain('Неверный логин или пароль');
    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('handles password reset by username', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: 'user@armorstrike.io',
      error: null,
    } as never);

    vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValue({
      data: {},
      error: null,
    } as never);

    const res = await AuthService.sendPasswordReset('MyCommander');
    expect(res.success).toBe(true);
    expect(res.email).toBeUndefined();
    expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalled();
  });
});
