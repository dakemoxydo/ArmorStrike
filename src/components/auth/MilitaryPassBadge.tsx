import { useState, useEffect } from 'react';
import {
  Activity,
  Cloud,
  CloudAlert,
  CloudCheck,
  Coins,
  Loader2,
  LogOut,
  ShieldCheck,
  User,
} from 'lucide-react';
import type { GameApi } from '../../game/GameApi';
import { AuthService } from '../../game/auth/authService';
import { getPlayerRank } from '../../game/economy/playerRank';

interface MilitaryPassBadgeProps {
  game: GameApi | null;
  credits: number;
  onOpenAuth: () => void;
}

export default function MilitaryPassBadge({ game, credits, onOpenAuth }: MilitaryPassBadgeProps) {
  const [username, setUsername] = useState<string>(() => game?.username ?? 'Гость');
  const [isGuest, setIsGuest] = useState<boolean>(() => game?.isGuest ?? true);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'synced' | 'error'>(
    () => game?.syncStatus ?? 'idle',
  );

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

  const unlockedCount = (game?.unlockedHulls.length ?? 0) + (game?.unlockedTurrets.length ?? 0);
  const rank = getPlayerRank(credits, unlockedCount);

  return (
    <div
      className="hud-panel flex flex-col md:flex-row items-stretch md:items-center gap-2.5 md:gap-4 p-2.5 md:px-4 md:py-2.5 bg-[#060b13]/95 border border-amber-500/35 shadow-2xl select-none"
      role="region"
      aria-label="Армейский пропуск и статус бойца"
    >
      {/* Секция 1: Жетон бойца / Никнейм */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center cut-chip bg-amber-500/15 border border-amber-500/30 text-amber-400">
          {isGuest ? (
            <User size={16} aria-hidden />
          ) : (
            <ShieldCheck size={16} className="text-emerald-400" aria-hidden />
          )}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate font-display text-xs md:text-sm tracking-wider text-white max-w-[110px] md:max-w-[140px]">
              {username}
            </span>

            {/* Статус синхронизации облака */}
            {!isGuest && (
              <span title={`Синхронизация: ${syncStatus}`}>
                {syncStatus === 'saving' && (
                  <Loader2 size={12} className="text-amber-400 animate-spin" aria-hidden />
                )}
                {syncStatus === 'synced' && (
                  <CloudCheck size={12} className="text-emerald-400" aria-hidden />
                )}
                {syncStatus === 'error' && (
                  <CloudAlert size={12} className="text-amber-400" aria-hidden />
                )}
                {syncStatus === 'idle' && (
                  <Cloud size={12} className="text-white/50" aria-hidden />
                )}
              </span>
            )}
          </div>

          {/* Воинское звание */}
          <div className="flex items-center gap-1 text-[10px] tracking-wider text-amber-400/90">
            <span className="text-amber-500 font-bold">{rank.insignia}</span>
            <span>{rank.title}</span>
          </div>
        </div>

        {isGuest ? (
          <button
            type="button"
            onClick={onOpenAuth}
            className="ml-auto md:ml-1 btn-game btn-ghost px-2 py-1 text-[10px] border-amber-500/40 text-amber-300 hover:text-white"
            title="Войти в личный кабинет или зарегистрироваться"
            aria-label="Войти в личный кабинет"
          >
            ВХОД
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSignOut}
            className="ml-auto md:ml-1 p-1 text-white/50 hover:text-red-400 transition-colors"
            title="Выйти из аккаунта"
            aria-label="Выйти из аккаунта"
          >
            <LogOut size={13} aria-hidden />
          </button>
        )}
      </div>

      {/* Разделитель */}
      <div className="hidden md:block h-6 w-px bg-white/10" aria-hidden />

      {/* Секция 2: Валюта CR и Пинг */}
      <div className="flex items-center justify-between md:justify-start gap-3 pt-1 md:pt-0 border-t md:border-t-0 border-white/10">
        {/* Баланс CR */}
        <div className="flex items-center gap-1.5 px-2 py-1 cut-chip bg-amber-500/10 border border-amber-500/20">
          <Coins size={14} className="text-amber-400 shrink-0" aria-hidden />
          <span className="font-display text-xs text-amber-300 tracking-wide">{credits.toLocaleString()}</span>
          <span className="text-[9px] font-bold text-amber-400/70">CR</span>
        </div>

        {/* Пинг / Сеть */}
        <div
          className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400"
          title="Сетевой статус и пинг"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full cut-chip bg-emerald-400 opacity-75" />
            <span className="relative inline-flex cut-chip h-2 w-2 bg-emerald-500" />
          </span>
          <Activity size={12} className="text-emerald-400/80" aria-hidden />
          <span className="tracking-wider">24ms</span>
          <span className="text-[9px] text-white/50 border border-white/10 px-1 py-0.2 cut-chip">EU</span>
        </div>
      </div>
    </div>
  );
}
