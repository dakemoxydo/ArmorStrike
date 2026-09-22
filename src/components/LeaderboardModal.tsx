import { useEffect, useState } from 'react';
import { Medal, RefreshCw, Trophy, User, WifiOff, X } from 'lucide-react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import {
  LeaderboardService,
  type LeaderboardEntry,
  type LeaderboardTopResult,
} from '../game/leaderboard/leaderboardService';
import { modeLabelRu } from '../game/match/resultsText';

interface LeaderboardModalProps {
  onClose: () => void;
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; data: LeaderboardTopResult }
  | { kind: 'error'; message: string };

function rankChip(rank: number): string {
  if (rank === 1) return 'text-amber-300';
  if (rank === 2) return 'text-slate-200';
  if (rank === 3) return 'text-orange-300';
  return 'text-white/70';
}

function EntryRow({
  entry,
  rank,
  isMe,
}: {
  entry: LeaderboardEntry;
  rank: number;
  isMe: boolean;
}) {
  return (
    <li
      className={`grid grid-cols-[2.5rem_1fr_auto] items-center gap-3 border px-3 py-2 sm:grid-cols-[2.5rem_1fr_5rem_4rem_5rem] ${
        isMe
          ? 'border-amber-500/50 bg-amber-500/10'
          : 'border-white/10 bg-white/5'
      }`}
    >
      <span className={`font-display text-lg ${rankChip(rank)}`} aria-label={`Место ${rank}`}>
        {rank}
      </span>
      <span className="min-w-0 truncate">
        <span className="font-display text-sm tracking-wide text-white">{entry.username}</span>
        {isMe && (
          <span className="cut-chip ml-2 bg-amber-500/20 border border-amber-500/40 px-1.5 py-0.5 text-[9px] tracking-wider text-amber-200">
            ВЫ
          </span>
        )}
        <span className="mt-0.5 block truncate text-[10px] tracking-wider text-white/45">
          {modeLabelRu(entry.mode)} · {entry.kills}/{entry.deaths} · серия {entry.bestStreak}
        </span>
      </span>
      <span className="hidden text-right font-display text-sm text-white/60 sm:block">
        {entry.matchesPlayed}
      </span>
      <span className="hidden text-right text-[11px] tracking-wider text-white/45 sm:block">
        матчей
      </span>
      <span className="text-right font-display text-base text-amber-300">
        {entry.bestScore}
      </span>
    </li>
  );
}

export default function LeaderboardModal({ onClose }: LeaderboardModalProps) {
  const trapRef = useFocusTrap(true);
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ kind: 'loading' });
    void (async () => {
      const data = await LeaderboardService.fetchTop(50);
      if (cancelled) return;
      if (!data.ok) {
        setState({ kind: 'error', message: data.error ?? 'Ошибка загрузки' });
      } else {
        setState({ kind: 'ready', data });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const ready = state.kind === 'ready' ? state.data : null;
  const myOutsideTop =
    ready?.myEntry &&
    ready.myRank !== null &&
    !ready.entries.some((e) => e.userId === ready.myEntry?.userId);

  return (
    <div
      ref={trapRef}
      className="scrim-over fixed inset-0 z-50 flex items-center justify-center p-4 select-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="leaderboard-modal-title"
    >
      <div className="hud-panel relative flex max-h-[min(44rem,90vh)] w-full max-w-2xl flex-col gap-5 overflow-hidden p-6 bg-[#070d14]/95 border border-amber-500/30 md:p-8">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <Trophy size={26} className="text-amber-400" aria-hidden />
            <div>
              <h2 id="leaderboard-modal-title" className="font-display text-2xl tracking-wide text-white">
                ЛИДЕРБОРД
              </h2>
              <p className="mt-0.5 text-xs tracking-wider text-white/60">
                Лучший счёт за матч · глобальный рейтинг
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              className="btn-game btn-ghost p-2 text-white/70 hover:text-white"
              aria-label="Обновить лидерборд"
            >
              <RefreshCw size={18} aria-hidden />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn-game btn-ghost p-2 text-white/70 hover:text-white"
              aria-label="Закрыть лидерборд"
            >
              <X size={20} aria-hidden />
            </button>
          </div>
        </div>

        {state.kind === 'loading' && (
          <div className="flex flex-col items-center gap-3 py-10" role="status" aria-live="polite">
            <div className="loader" aria-hidden />
            <span className="text-sm tracking-hero text-white/70">ЗАГРУЗКА…</span>
          </div>
        )}

        {state.kind === 'error' && (
          <div
            className="flex flex-col items-center gap-4 border border-rose-500/40 bg-rose-950/30 px-4 py-8 text-center"
            role="alert"
          >
            <WifiOff size={28} className="text-rose-400" aria-hidden />
            <p className="text-sm tracking-wider text-rose-200">
              Не удалось загрузить рейтинг
            </p>
            <p className="max-w-sm text-xs text-white/50">
              Проверьте подключение и попробуйте ещё раз.
            </p>
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              className="btn-game btn-primary px-6 py-2 text-xs"
            >
              <span>ПОВТОРИТЬ</span>
            </button>
          </div>
        )}

        {ready && (
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            {ready.entries.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <Medal size={32} className="text-amber-400/70" aria-hidden />
                <p className="text-sm tracking-wider text-white/70">РЕЙТИНГ ПУСТ</p>
                <p className="max-w-sm text-xs text-white/50">
                  Сыграйте матч и войдите в аккаунт — рекорд появится здесь.
                </p>
              </div>
            ) : (
              <ol className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
                {ready.entries.map((entry, i) => (
                  <EntryRow
                    key={entry.userId}
                    entry={entry}
                    rank={i + 1}
                    isMe={entry.userId === ready.myEntry?.userId}
                  />
                ))}
              </ol>
            )}

            {myOutsideTop && ready.myEntry && ready.myRank !== null && (
              <div className="border border-amber-500/40 bg-amber-500/10 px-3 py-2">
                <p className="text-[11px] tracking-wider text-amber-200/80">ВАШЕ МЕСТО</p>
                <EntryRow entry={ready.myEntry} rank={ready.myRank} isMe />
              </div>
            )}

            {!ready.myEntry && (
              <p className="flex items-center gap-2 border-t border-white/10 pt-3 text-[11px] tracking-wider text-white/50">
                <User size={13} aria-hidden />
                Рекорды записываются для авторизованных игроков после матча.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
