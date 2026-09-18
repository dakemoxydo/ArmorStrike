import { useState, useEffect } from 'react';
import {
  Cloud,
  CloudAlert,
  CloudCheck,
  Loader2,
  LogOut,
  ShieldCheck,
  User,
} from 'lucide-react';
import type { GameApi } from '../../game/GameApi';
import { AuthService } from '../../game/auth/authService';

interface UserBadgeProps {
  game: GameApi | null;
  onOpenAuth: () => void;
}

export default function UserBadge({ game, onOpenAuth }: UserBadgeProps) {
  const [username, setUsername] = useState<string>(() => game?.username ?? 'Гость');
  const [isGuest, setIsGuest] = useState<boolean>(() => game?.isGuest ?? true);
  const [syncStatus, setSyncStatus] = useState<
    'idle' | 'saving' | 'synced' | 'error'
  >(() => game?.syncStatus ?? 'idle');

  useEffect(() => {
    if (!game) return;
    setUsername(game.username);
    setIsGuest(game.isGuest);
    setSyncStatus(game.syncStatus);

    const onEvent = () => {
      setUsername(game.username);
      setIsGuest(game.isGuest);
      setSyncStatus(game.syncStatus);
    };

    game.addListener(onEvent);
    return () => game.removeListener(onEvent);
  }, [game]);

  const handleSignOut = async () => {
    await AuthService.signOut();
    if (game) {
      game.setAuthUser(null);
    }
  };

  if (isGuest) {
    return (
      <div className="relative flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenAuth}
          className="btn-game btn-ghost px-3 py-1.5 text-xs flex items-center gap-2 border border-amber-500/30 hover:border-amber-400 text-amber-300"
          title="Войти в аккаунт или зарегистрироваться"
          aria-label="Войти в аккаунт"
        >
          <User size={14} className="text-amber-400" aria-hidden />
          <span className="font-semibold tracking-wider">ГОСТЬ</span>
          <span className="cut-chip bg-amber-500/20 text-amber-300 px-1.5 py-0.5 text-[9px] border border-amber-400/40">
            ВОЙТИ
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex items-center">
      <div className="hud-panel flex items-center gap-2 px-3 py-1.5 bg-slate-900/80 border border-amber-500/30">
        <ShieldCheck size={16} className="text-emerald-400" aria-hidden />

        {/* Username */}
        <span className="font-display text-sm tracking-wider text-white max-w-[120px] md:max-w-[160px] truncate">
          {username}
        </span>

        {/* Cloud sync indicator */}
        <span title={`Синхронизация: ${syncStatus}`}>
          {syncStatus === 'saving' && (
            <Loader2 size={13} className="text-amber-400 animate-spin" aria-hidden />
          )}
          {syncStatus === 'synced' && (
            <CloudCheck size={13} className="text-emerald-400" aria-hidden />
          )}
          {syncStatus === 'error' && (
            <CloudAlert size={13} className="text-amber-400" aria-hidden />
          )}
          {syncStatus === 'idle' && (
            <Cloud size={13} className="text-white/60" aria-hidden />
          )}
        </span>

        {/* Logout button */}
        <button
          type="button"
          onClick={handleSignOut}
          className="ml-1 p-1 text-white/50 hover:text-red-400 transition-colors"
          title="Выйти из аккаунта"
          aria-label="Выйти из аккаунта"
        >
          <LogOut size={13} aria-hidden />
        </button>
      </div>
    </div>
  );
}
