import { useEffect, useRef } from 'react';
import { ArrowLeft, BarChart3, Clock3, Coins, Flame, Layers, RefreshCcw, Skull, Target, Trophy, Users, Wrench } from 'lucide-react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import type { MatchEndReason, MatchModeId, TeamId } from '../game/types';
import type { MatchRewards } from '../game/economy/matchRewards';
import type { LeaderboardSubmitResult } from '../game/leaderboard/leaderboardService';
import {
  formatKd,
  formatMatchClock,
  modeLabelRu,
  resultsHeadline,
} from '../game/match/resultsText';

interface GameOverScreenProps {
  score: number;
  kills: number;
  deaths: number;
  /** Лучшая серия убийств за матч (H4). */
  bestStreak: number;
  playerWon: boolean;
  winnerName: string | null;
  winnerTeam: TeamId;
  reason: MatchEndReason;
  mode: MatchModeId;
  matchTimeSec: number;
  teamKills: { alpha: number; bravo: number };
  teamScore: { alpha: number; bravo: number };
  rewards?: MatchRewards;
  onQuests?: () => void;
  /** L3: статус авто-отправки рекорда в глобальный лидерборд. */
  leaderboardSubmit?: LeaderboardSubmitResult | 'pending' | null;
  onLeaderboard?: () => void;
  /** Same mode + last map, skip ModeSelect. */
  onRematch: () => void;
  /** Open ModeSelect (change mode / map). */
  onChangeMode: () => void;
  onGarage: () => void;
  onMenu: () => void;
}

function leaderboardStatusText(
  status: LeaderboardSubmitResult | 'pending',
): { text: string; tone: string } {
  if (status === 'pending') {
    return { text: 'ОТПРАВКА РЕКОРДА…', tone: 'text-sky-300 border-sky-500/30 bg-sky-950/40' };
  }
  switch (status.status) {
    case 'improved':
      return {
        text: `НОВЫЙ РЕКОРД · ${status.bestScore ?? ''} · МЕСТО В РЕЙТИНГЕ ОБНОВЛЕНО`,
        tone: 'text-amber-200 border-amber-500/40 bg-amber-950/40',
      };
    case 'saved':
      return {
        text: `РЕКОРД СОХРАНЁН · ЛУЧШИЙ: ${status.bestScore ?? '—'}`,
        tone: 'text-emerald-300 border-emerald-500/30 bg-emerald-950/40',
      };
    case 'guest':
      return {
        text: 'ВОЙДИТЕ В АККАУНТ, ЧТОБЫ ПОПАСТЬ В РЕЙТИНГ',
        tone: 'text-white/70 border-white/15 bg-white/5',
      };
    case 'error':
    default:
      return {
        text: 'НЕ УДАЛОСЬ ОТПРАВИТЬ РЕКОРД',
        tone: 'text-rose-300 border-rose-500/30 bg-rose-950/40',
      };
  }
}

function CountUp({ value, duration = 1300 }: { value: number; duration?: number }) {
  // R-5: same pattern as HUD bars — RAF writes textContent directly, React
  // never re-renders per animation frame.
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    // K6: prefers-reduced-motion — без счётчика, сразу финальное число
    // (тот же контракт, что у миникарты `minimapDraw` и CSS-анимаций).
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) {
      if (ref.current) ref.current.textContent = `${value}`;
      return;
    }
    let raf = 0;
    const start = performance.now();
    const loop = (t: number) => {
      const k = Math.min(1, (t - start) / duration);
      const ease = 1 - Math.pow(1 - k, 3);
      if (ref.current) ref.current.textContent = `${Math.round(value * ease)}`;
      if (k < 1) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <span ref={ref}>0</span>;
}

export default function GameOverScreen({
  score, kills, deaths, bestStreak, playerWon, winnerName, winnerTeam, reason, mode,
  matchTimeSec, teamKills, teamScore, rewards, onQuests, leaderboardSubmit, onLeaderboard,
  onRematch, onChangeMode, onGarage, onMenu,
}: GameOverScreenProps) {
  const trapRef = useFocusTrap(true);
  const isTeam = mode === 'team_deathmatch' || mode === 'capture_point';
  const isCp = mode === 'capture_point';
  const headline = resultsHeadline({ playerWon, winnerName, winnerTeam, reason });
  const titleColor = !winnerName && !winnerTeam
    ? 'text-amber-300'
    : playerWon
      ? 'text-emerald-300'
      : 'text-red-400';
  const teamLeft = isCp ? Math.floor(teamScore.alpha) : teamKills.alpha;
  const teamRight = isCp ? Math.floor(teamScore.bravo) : teamKills.bravo;
  const teamUnit = isCp ? 'очк.' : 'фраги';
  const lbStatus = leaderboardSubmit
    ? leaderboardStatusText(leaderboardSubmit)
    : null;

  return (
    <div
      ref={trapRef}
      className="scrim-over absolute inset-0 z-40 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gameover-title"
    >
      <div className="menu-stripes danger pointer-events-none absolute inset-x-0 bottom-0 h-2" />
      <div className="menu-stripes danger pointer-events-none absolute inset-x-0 top-0 h-2" />
      <div className="flex max-w-3xl flex-col items-center px-6 text-center">
        <div className="anim-pop" style={{ '--d': '0.05s' } as React.CSSProperties}>
          {!winnerName && !winnerTeam
            ? <Users size={46} className="mb-4 text-amber-300" aria-hidden />
            : playerWon
              ? <Trophy size={46} className="mb-4 text-emerald-300" aria-hidden />
              : <Skull size={46} className="skull-pulse mb-4 text-red-400" aria-hidden />}
        </div>

        <p className="anim-up text-xs tracking-hero text-white/60" style={{ '--d': '0.1s' } as React.CSSProperties}>
          {modeLabelRu(mode)}
          {reason === 'time' ? ' · ЛИМИТ ВРЕМЕНИ' : ' · ПОРОГ'}
        </p>
        <h2
          id="gameover-title"
          className={`anim-up font-display text-4xl tracking-wider md:text-6xl title-glitch ${titleColor}`}
          style={{ '--d': '0.15s' } as React.CSSProperties}
        >
          {headline}
        </h2>
        <p className="anim-up mt-3 flex items-center gap-2 text-sm tracking-hero text-white/60" style={{ '--d': '0.25s' } as React.CSSProperties}>
          <Clock3 size={14} aria-hidden />
          {formatMatchClock(matchTimeSec)}
        </p>

        {isTeam && (
          <div
            className="anim-up team-score-line mt-6"
            style={{ '--d': '0.32s' } as React.CSSProperties}
            role="img"
            aria-label={`Alpha ${teamLeft}, Bravo ${teamRight}`}
          >
            <span className="team-alpha">ALPHA {teamLeft}</span>
            <span className="team-score-sep">:</span>
            <span className="team-bravo">{teamRight} BRAVO</span>
          </div>
        )}
        {isTeam && (
          <p className="anim-up mt-1 text-[11px] tracking-widest text-white/60" style={{ '--d': '0.34s' } as React.CSSProperties}>
            {teamUnit.toUpperCase()}
          </p>
        )}

        <div className="anim-up mt-8 grid grid-cols-2 gap-3 sm:grid-cols-5" style={{ '--d': '0.38s' } as React.CSSProperties}>
          <StatCard icon={<Trophy size={16} aria-hidden />} label="СЧЁТ" value={score} accent="text-amber-300" />
          <StatCard icon={<Skull size={16} aria-hidden />} label="ФРАГИ" value={kills} accent="text-red-300" />
          <StatCard icon={<Target size={16} aria-hidden />} label="СМЕРТИ" value={deaths} accent="text-slate-300" />
          <StatCard icon={<Flame size={16} aria-hidden />} label="ЛУЧШАЯ СЕРИЯ" value={bestStreak} accent="text-orange-300" />
          {/* К/Д — на том же StatCard, а не отдельной разметкой: раньше он был
              единственной карточкой, собранной руками (S5). */}
          <StatCard icon={<Layers size={16} aria-hidden />} label="К/Д" value={formatKd(kills, deaths)} accent="text-emerald-300" />
        </div>

        {rewards && (
          <div
            className="anim-up mt-6 w-full max-w-xl hud-panel p-4 bg-amber-500/10 border border-amber-500/30 text-left"
            style={{ '--d': '0.42s' } as React.CSSProperties}
          >
            <div className="flex items-center justify-between border-b border-amber-500/20 pb-2 mb-2">
              <div className="flex items-center gap-2">
                <Coins size={18} className="text-amber-400" aria-hidden />
                <span className="font-display text-sm tracking-wider text-amber-200">НАГРАДА ЗА БОЙ</span>
              </div>
              <div className="font-display text-xl text-amber-300">
                +{rewards.total} <span className="text-xs text-amber-400/80">CR</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
              <div className="cut-chip bg-black/30 p-2 border border-white/10 text-center">
                <div className="text-white/60">Участие</div>
                <div className="font-display text-amber-300 mt-0.5">+{rewards.base}</div>
              </div>
              <div className="cut-chip bg-black/30 p-2 border border-white/10 text-center">
                <div className="text-white/60">Фраги ({kills})</div>
                <div className="font-display text-amber-300 mt-0.5">+{rewards.kills}</div>
              </div>
              <div className="cut-chip bg-black/30 p-2 border border-white/10 text-center">
                <div className="text-white/60">Счёт</div>
                <div className="font-display text-amber-300 mt-0.5">+{rewards.score}</div>
              </div>
              <div className="cut-chip bg-black/30 p-2 border border-white/10 text-center">
                <div className="text-white/60">
                  {playerWon ? 'Победа' : 'Исход'}
                </div>
                <div className="font-display text-amber-300 mt-0.5">
                  +{rewards.win}
                </div>
              </div>
              <div className="cut-chip bg-black/30 p-2 border border-white/10 text-center">
                <div className="text-white/60">Серия ({bestStreak})</div>
                <div className="font-display text-amber-300 mt-0.5">+{rewards.streak}</div>
              </div>
            </div>
          </div>
        )}

        {lbStatus && (
          <p
            className={`anim-up mt-4 cut-chip border px-3 py-1.5 text-[11px] tracking-widest ${lbStatus.tone}`}
            role="status"
            aria-live="polite"
            style={{ '--d': '0.4s' } as React.CSSProperties}
          >
            {lbStatus.text}
          </p>
        )}

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <button type="button" data-autofocus onClick={onRematch} className="btn-game btn-primary px-10 py-4 text-base">
            <RefreshCcw size={19} className="bicon-spin" aria-hidden />
            <span>РЕВАНШ</span>
          </button>
          <button type="button" onClick={onChangeMode} className="btn-game btn-ghost px-7 py-3.5 text-sm">
            <Layers size={17} className="bicon" aria-hidden />
            <span>РЕЖИМ / КАРТА</span>
          </button>
          {onQuests && (
            <button type="button" onClick={onQuests} className="btn-game btn-ghost px-7 py-3.5 text-sm">
              <Trophy size={17} className="bicon text-amber-400" aria-hidden />
              <span>ЗАДАЧИ</span>
            </button>
          )}
          {onLeaderboard && (
            <button type="button" onClick={onLeaderboard} className="btn-game btn-ghost px-7 py-3.5 text-sm">
              <BarChart3 size={17} className="bicon text-amber-400" aria-hidden />
              <span>ЛИДЕРБОРД</span>
            </button>
          )}
          <button type="button" onClick={onGarage} className="btn-game btn-ghost px-7 py-3.5 text-sm">
            <Wrench size={17} className="bicon" aria-hidden />
            <span>ГАРАЖ</span>
          </button>
          {/* Выход из матча — одно действие в обоих экранах: `btn-danger` +
              `ArrowLeft`, как в паузе (U11). */}
          <button type="button" onClick={onMenu} className="btn-game btn-danger px-7 py-3.5 text-sm">
            <ArrowLeft size={17} className="bicon" aria-hidden />
            <span>В МЕНЮ</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon, label, value, accent,
}: {
  icon: React.ReactNode;
  label: string;
  /** Число анимируется счётчиком; строка (К/Д) выводится как есть. */
  value: number | string;
  accent: string;
}) {
  return (
    <div className="hud-panel min-w-[7.5rem] px-5 py-4">
      <div className={`flex justify-center ${accent}`} aria-hidden>{icon}</div>
      <div className={`font-display mt-2 text-3xl ${accent}`}>
        {typeof value === 'number' ? <CountUp value={value} /> : value}
      </div>
      <div className="mt-1 text-[11px] tracking-wider text-white/60">{label}</div>
    </div>
  );
}
