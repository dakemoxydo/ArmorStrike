import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Shield,
  User,
  X,
} from 'lucide-react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import type { GameApi } from '../../game/GameApi';
import { AuthService } from '../../game/auth/authService';

export type AuthTab = 'login' | 'register' | 'forgot' | 'reset_password';

interface AuthModalProps {
  game: GameApi | null;
  initialTab?: AuthTab;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AuthModal({
  game,
  initialTab = 'login',
  onClose,
  onSuccess,
}: AuthModalProps) {
  const trapRef = useFocusTrap(true);
  const [tab, setTab] = useState<AuthTab>(initialTab);

  // Form states
  const [loginId, setLoginId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  const [forgotId, setForgotId] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [newConfirmPassword, setNewConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const switchTab = (nextTab: AuthTab) => {
    setTab(nextTab);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  // --- Вход ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const res = await AuthService.signIn(loginId, loginPassword);
      if (res.error || !res.user) {
        setErrorMsg(res.error || 'Ошибка входа');
        return;
      }

      // Загружаем облачный профиль в Game
      if (game) {
        await game.loadCloudProfile(res.user.id);
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  // --- Регистрация ---
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    if (regPassword !== regConfirmPassword) {
      setErrorMsg('Пароли не совпадают');
      return;
    }

    setLoading(true);

    try {
      // Собираем данные гостя для бесшовного переноса прогресса
      const guestData = game
        ? {
            credits: game.credits,
            unlocked_hulls: [...game.unlockedHulls],
            unlocked_turrets: [...game.unlockedTurrets],
            current_hull: game.currentHull,
            current_turret: game.currentTurret,
            starter_pack_claimed: game.starterPackClaimed,
            quests: [...game.quests],
          }
        : undefined;

      const res = await AuthService.signUp(
        regUsername,
        regEmail,
        regPassword,
        guestData,
      );

      if (res.error || !res.user) {
        setErrorMsg(res.error || 'Ошибка при регистрации');
        return;
      }

      // Обновляем состояние в игре
      if (game) {
        game.setAuthUser({
          id: res.user.id,
          username: regUsername.trim(),
        });
        await game.loadCloudProfile(res.user.id);
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  // --- Сброс пароля ---
  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const res = await AuthService.sendPasswordReset(forgotId);
      if (res.error) {
        setErrorMsg(res.error);
        return;
      }

      setSuccessMsg(
        'Если аккаунт существует, ссылка для сброса пароля отправлена на почту. Проверьте входящие (и спам).',
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  // --- Установка нового пароля ---
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    if (newPassword !== newConfirmPassword) {
      setErrorMsg('Пароли не совпадают');
      return;
    }

    setLoading(true);

    try {
      const res = await AuthService.updatePassword(newPassword);
      if (res.error) {
        setErrorMsg(res.error);
        return;
      }

      setSuccessMsg('Пароль успешно обновлён! Теперь вы можете войти.');
      setTimeout(() => switchTab('login'), 1500);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      ref={trapRef}
      className="scrim-over fixed inset-0 z-50 flex items-center justify-center p-4 select-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="hud-panel relative flex w-full max-w-md flex-col gap-5 p-6 md:p-8 bg-[#070d14]/95 border border-cyan-500/30">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <Shield size={24} className="text-cyan-400" aria-hidden />
            <div>
              <h2 id="auth-modal-title" className="font-display text-xl tracking-wide text-white">
                {tab === 'login' && 'ВХОД В АККАУНТ'}
                {tab === 'register' && 'РЕГИСТРАЦИЯ'}
                {tab === 'forgot' && 'СБРОС ПАРОЛЯ'}
                {tab === 'reset_password' && 'НОВЫЙ ПАРОЛЬ'}
              </h2>
              <div className="text-[11px] tracking-wider text-cyan-300/60 uppercase">
                {tab === 'login' && 'ОБЛАЧНЫЕ СОХРАНЕНИЯ И СТАТИСТИКА'}
                {tab === 'register' && 'МГНОВЕННЫЙ СТАРТ БЕЗ ПИСЕМ'}
                {tab === 'forgot' && 'ВОССТАНОВЛЕНИЕ ДОСТУПА'}
                {tab === 'reset_password' && 'ВВЕДИТЕ НОВЫЙ ПАРОЛЬ'}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-game btn-ghost btn-icon"
            aria-label="Закрыть окно"
          >
            <X size={18} aria-hidden />
          </button>
        </div>

        {/* Status messages */}
        {errorMsg && (
          <div className="flex items-center gap-2 p-3 text-xs text-red-300 bg-red-950/40 border border-red-500/30">
            <AlertCircle size={16} className="shrink-0 text-red-400" aria-hidden />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center gap-2 p-3 text-xs text-emerald-300 bg-emerald-950/40 border border-emerald-500/30">
            <CheckCircle2 size={16} className="shrink-0 text-emerald-400" aria-hidden />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Tab switcher (Login / Register) */}
        {(tab === 'login' || tab === 'register') && (
          <div className="grid grid-cols-2 gap-2 bg-slate-900/60 p-1 border border-white/10">
            <button
              type="button"
              onClick={() => switchTab('login')}
              className={`py-2 text-xs font-semibold tracking-wider transition-colors ${
                tab === 'login'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              ВХОД
            </button>
            <button
              type="button"
              onClick={() => switchTab('register')}
              className={`py-2 text-xs font-semibold tracking-wider transition-colors ${
                tab === 'register'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              РЕГИСТРАЦИЯ
            </button>
          </div>
        )}

        {/* Form: LOGIN */}
        {tab === 'login' && (
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-[11px] font-semibold tracking-wider text-white/70">
                ПОЧТА ИЛИ USERNAME
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-white/50 pointer-events-none">
                  <User size={16} aria-hidden />
                </span>
                <input
                  type="text"
                  required
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  placeholder="name@mail.com или username"
                  className="w-full pl-9 pr-3 py-2 bg-slate-900/90 border border-white/20 text-sm text-white placeholder-white/50 focus:border-cyan-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5 text-left">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-semibold tracking-wider text-white/70">
                  ПАРОЛЬ
                </label>
                <button
                  type="button"
                  onClick={() => switchTab('forgot')}
                  className="text-[10px] text-cyan-400/80 hover:text-cyan-300 underline"
                >
                  Забыли пароль?
                </button>
              </div>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-white/50 pointer-events-none">
                  <Lock size={16} aria-hidden />
                </span>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 bg-slate-900/90 border border-white/20 text-sm text-white placeholder-white/50 focus:border-cyan-400 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-game btn-primary w-full py-3 mt-2 text-sm flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" aria-hidden />
                  <span>ВХОД…</span>
                </>
              ) : (
                <span>ВОЙТИ В АККАУНТ</span>
              )}
            </button>
          </form>
        )}

        {/* Form: REGISTER */}
        {tab === 'register' && (
          <form onSubmit={handleRegister} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1 text-left">
              <label className="text-[11px] font-semibold tracking-wider text-white/70">
                ИМЯ ПОЛЬЗОВАТЕЛЯ (USERNAME)
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-white/50 pointer-events-none">
                  <User size={15} aria-hidden />
                </span>
                <input
                  type="text"
                  required
                  maxLength={20}
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  placeholder="От 3 до 20 символов"
                  className="w-full pl-9 pr-3 py-2 bg-slate-900/90 border border-white/20 text-sm text-white placeholder-white/50 focus:border-cyan-400 focus:outline-none"
                />
              </div>
              <span className="text-[10px] text-white/60">
                Будет отображаться в матчах, скорборде и киллфиде
              </span>
            </div>

            <div className="flex flex-col gap-1 text-left">
              <label className="text-[11px] font-semibold tracking-wider text-white/70">
                EMAIL
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-white/50 pointer-events-none">
                  <Mail size={15} aria-hidden />
                </span>
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-9 pr-3 py-2 bg-slate-900/90 border border-white/20 text-sm text-white placeholder-white/50 focus:border-cyan-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1 text-left">
                <label className="text-[11px] font-semibold tracking-wider text-white/70">
                  ПАРОЛЬ
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-white/50 pointer-events-none">
                    <Lock size={15} aria-hidden />
                  </span>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="мин. 6 знаков"
                    className="w-full pl-9 pr-3 py-2 bg-slate-900/90 border border-white/20 text-sm text-white placeholder-white/50 focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1 text-left">
                <label className="text-[11px] font-semibold tracking-wider text-white/70">
                  ПОВТОР ПАРОЛЯ
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-white/50 pointer-events-none">
                    <Lock size={15} aria-hidden />
                  </span>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="повторите"
                    className="w-full pl-9 pr-3 py-2 bg-slate-900/90 border border-white/20 text-sm text-white placeholder-white/50 focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="text-[11px] text-cyan-300/80 bg-cyan-950/30 p-2.5 border border-cyan-500/20 text-left">
              💡 Ваш текущий прогресс (кредиты, открытые танки и квесты) будет сохранён в новом аккаунте.
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-game btn-primary w-full py-3 mt-1 text-sm flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" aria-hidden />
                  <span>СОЗДАНИЕ…</span>
                </>
              ) : (
                <span>СОЗДАТЬ АККАУНТ</span>
              )}
            </button>
          </form>
        )}

        {/* Form: FORGOT PASSWORD */}
        {tab === 'forgot' && (
          <form onSubmit={handleForgot} className="flex flex-col gap-4">
            <p className="text-xs text-white/70 text-left">
              Введите ваш Username или Email, указанный при регистрации. Мы отправим вам ссылку для восстановления доступа.
            </p>

            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-[11px] font-semibold tracking-wider text-white/70">
                ПОЧТА ИЛИ USERNAME
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-white/50 pointer-events-none">
                  <Mail size={16} aria-hidden />
                </span>
                <input
                  type="text"
                  required
                  value={forgotId}
                  onChange={(e) => setForgotId(e.target.value)}
                  placeholder="name@mail.com или username"
                  className="w-full pl-9 pr-3 py-2 bg-slate-900/90 border border-white/20 text-sm text-white placeholder-white/50 focus:border-cyan-400 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-game btn-primary w-full py-3 text-sm flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" aria-hidden />
                  <span>ОТПРАВКА…</span>
                </>
              ) : (
                <span>ОТПРАВИТЬ ССЫЛКУ</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => switchTab('login')}
              className="text-xs text-white/60 hover:text-white underline mt-1"
            >
              Вернуться ко входу
            </button>
          </form>
        )}

        {/* Form: RESET PASSWORD (UPDATE) */}
        {tab === 'reset_password' && (
          <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-[11px] font-semibold tracking-wider text-white/70">
                НОВЫЙ ПАРОЛЬ
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-white/50 pointer-events-none">
                  <KeyRound size={16} aria-hidden />
                </span>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="минимум 6 символов"
                  className="w-full pl-9 pr-3 py-2 bg-slate-900/90 border border-white/20 text-sm text-white placeholder-white/50 focus:border-cyan-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-[11px] font-semibold tracking-wider text-white/70">
                ПОВТОРИТЕ НОВЫЙ ПАРОЛЬ
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-white/50 pointer-events-none">
                  <KeyRound size={16} aria-hidden />
                </span>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newConfirmPassword}
                  onChange={(e) => setNewConfirmPassword(e.target.value)}
                  placeholder="повторите пароль"
                  className="w-full pl-9 pr-3 py-2 bg-slate-900/90 border border-white/20 text-sm text-white placeholder-white/50 focus:border-cyan-400 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-game btn-primary w-full py-3 text-sm flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" aria-hidden />
                  <span>СОХРАНЕНИЕ…</span>
                </>
              ) : (
                <span>СОХРАНИТЬ ПАРОЛЬ</span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
