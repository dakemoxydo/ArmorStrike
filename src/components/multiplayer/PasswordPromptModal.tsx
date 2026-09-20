import { useState, type FormEvent } from 'react';
import { KeyRound, Lock, X } from 'lucide-react';
import { useFocusTrap } from '../../hooks/useFocusTrap';

interface PasswordPromptModalProps {
  roomName: string;
  onConfirm: (password: string) => void;
  onCancel: () => void;
}

export default function PasswordPromptModal({
  roomName,
  onConfirm,
  onCancel,
}: PasswordPromptModalProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const trapRef = useFocusTrap(true);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Введите пароль');
      return;
    }
    onConfirm(password.trim());
  };

  return (
    <div
      className="scrim-over fixed inset-0 z-50 flex items-center justify-center p-4 anim-fade"
      role="dialog"
      aria-modal="true"
      aria-label="Вход на защищённый сервер"
    >
      <div
        ref={trapRef}
        className="hud-panel relative w-full max-w-md border border-amber-500/40 bg-[#060a12]/95 p-6 shadow-2xl"
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onCancel}
          className="btn-game btn-ghost btn-icon absolute right-4 top-4"
          aria-label="Закрыть"
        >
          <X size={18} className="bicon" aria-hidden />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Lock size={20} aria-hidden />
          </div>
          <div>
            <h2 className="font-display text-lg tracking-wider text-amber-300">
              СЕРВЕР ПОД ПАРОЛЕМ
            </h2>
            <div className="text-xs text-white/60 truncate max-w-[280px]">
              {roomName}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold tracking-wider text-white/70 mb-1.5">
              ПАРОЛЬ СЕРВЕРА
            </label>
            <div className="relative flex items-center">
              <KeyRound size={16} className="absolute left-3 text-white/50 pointer-events-none" aria-hidden />
              <input
                type="password"
                data-autofocus
                autoFocus
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                placeholder="Введите пароль..."
                className="cut-control w-full pl-9 pr-3 py-2.5 bg-black/60 border-2 border-[#0b0e14] focus:border-amber-400 focus:outline-none text-sm text-white placeholder-white/50 shadow-[0_2px_0_#0b0e14]"
              />
            </div>
            {error && (
              <p className="mt-1.5 text-xs text-rose-400" role="alert">
                {error}
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="btn-game btn-ghost px-4 py-2 text-xs"
            >
              ОТМЕНА
            </button>
            <button
              type="submit"
              className="btn-game btn-primary px-6 py-2 text-xs"
            >
              ПОДКЛЮЧИТЬСЯ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
