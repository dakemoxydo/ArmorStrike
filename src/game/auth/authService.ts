import { supabase } from '../../lib/supabaseClient';
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js';

export interface GuestMigrationData {
  credits?: number;
  unlocked_hulls?: string[];
  unlocked_turrets?: string[];
  current_hull?: string;
  current_turret?: string;
  starter_pack_claimed?: boolean;
  quests?: unknown[];
}

export interface AuthResult {
  user?: User | null;
  session?: Session | null;
  error?: string | null;
}

export function validateUsername(username: string): string | null {
  const trimmed = username.trim();
  if (trimmed.length < 3) return 'Имя пользователя должно содержать минимум 3 символа';
  if (trimmed.length > 20) return 'Имя пользователя не должно превышать 20 символов';
  const regex = /^[A-Za-z0-9_А-Яа-яЁё -]+$/;
  if (!regex.test(trimmed)) {
    return 'Имя может содержать только буквы, цифры, дефис и подчеркивание';
  }
  return null;
}

export function validateEmail(email: string): string | null {
  const trimmed = email.trim();
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regex.test(trimmed)) {
    return 'Укажите корректный адрес электронной почты';
  }
  return null;
}

export function validatePassword(password: string): string | null {
  if (password.length < 6) {
    return 'Пароль должен содержать не менее 6 символов';
  }
  return null;
}

export class AuthService {
  /** Регистрация нового аккаунта с опциональным переносом данных гостя */
  static async signUp(
    username: string,
    email: string,
    password: string,
    guestData?: GuestMigrationData,
  ): Promise<AuthResult> {
    const userErr = validateUsername(username);
    if (userErr) return { error: userErr };

    const emailErr = validateEmail(email);
    if (emailErr) return { error: emailErr };

    const passErr = validatePassword(password);
    if (passErr) return { error: passErr };

    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();

    try {
      // Проверяем уникальность username
      const { data: existingUser, error: checkErr } = await supabase
        .from('profiles')
        .select('username')
        .ilike('username', cleanUsername)
        .maybeSingle();

      if (!checkErr && existingUser) {
        return { error: 'Пользователь с таким именем уже зарегистрирован' };
      }

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            username: cleanUsername,
            credits: guestData?.credits ?? 0,
            unlocked_hulls: guestData?.unlocked_hulls ?? ['hunter'],
            unlocked_turrets: guestData?.unlocked_turrets ?? ['railgun'],
            current_hull: guestData?.current_hull ?? 'hunter',
            current_turret: guestData?.current_turret ?? 'railgun',
            starter_pack_claimed: guestData?.starter_pack_claimed ?? false,
            quests: guestData?.quests ?? [],
          },
        },
      });

      if (error) {
        if (error.message.includes('User already registered') || error.status === 422) {
          return { error: 'Пользователь с такой почтой уже существует' };
        }
        return { error: error.message };
      }

      return { user: data.user, session: data.session };
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Ошибка при регистрации' };
    }
  }

  /** Вход по email или username */
  static async signIn(identifier: string, password: string): Promise<AuthResult> {
    const cleanId = identifier.trim();
    if (!cleanId) return { error: 'Введите имя пользователя или email' };
    if (!password) return { error: 'Введите пароль' };

    try {
      let email = cleanId;

      // Если введено имя пользователя, а не email
      if (!cleanId.includes('@')) {
        const { data: resolvedEmail, error: rpcErr } = await supabase.rpc(
          'get_email_by_username',
          { p_username: cleanId },
        );

        if (rpcErr || !resolvedEmail) {
          return { error: 'Неверный логин или пароль' };
        }
        email = resolvedEmail as string;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase(),
        password,
      });

      if (error) {
        if (
          error.message.includes('Invalid login credentials') ||
          error.status === 400
        ) {
          return { error: 'Неверный логин или пароль' };
        }
        return { error: error.message };
      }

      return { user: data.user, session: data.session };
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Ошибка при входе' };
    }
  }

  /** Выход из аккаунта */
  static async signOut(): Promise<{ error?: string | null }> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) return { error: error.message };
      return {};
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Ошибка при выходе' };
    }
  }

  /** Запрос на сброс пароля по почте */
  static async sendPasswordReset(
    identifier: string,
  ): Promise<{ success?: boolean; error?: string | null; email?: string }> {
    const cleanId = identifier.trim();
    if (!cleanId) return { error: 'Введите имя пользователя или email' };

    try {
      let email = cleanId;

      if (!cleanId.includes('@')) {
        const { data: resolvedEmail, error: rpcErr } = await supabase.rpc(
          'get_email_by_username',
          { p_username: cleanId },
        );

        if (rpcErr || !resolvedEmail) {
          // Don't enumerate accounts — same success path as a real send.
          return { success: true };
        }
        email = resolvedEmail as string;
      }

      const redirectUrl =
        typeof window !== 'undefined'
          ? `${window.location.origin}${window.location.pathname}`
          : undefined;

      const { error } = await supabase.auth.resetPasswordForEmail(email.toLowerCase(), {
        redirectTo: redirectUrl,
      });

      if (error) {
        return { error: error.message };
      }

      return { success: true };
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Ошибка при отправке ссылки' };
    }
  }

  /** Установка нового пароля (после перехода по ссылке сброса) */
  static async updatePassword(newPassword: string): Promise<AuthResult> {
    const passErr = validatePassword(newPassword);
    if (passErr) return { error: passErr };

    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) return { error: error.message };
      return { user: data.user };
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Ошибка при обновлении пароля' };
    }
  }

  /** Получить текущего авторизованного пользователя */
  static async getCurrentUser(): Promise<User | null> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      return user;
    } catch {
      return null;
    }
  }

  /** Подписка на изменение состояния аутентификации */
  static onAuthStateChange(
    callback: (event: AuthChangeEvent, session: Session | null) => void,
  ) {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(callback);
    return subscription;
  }
}
