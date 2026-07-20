import { useEffect, useState } from 'react';
import { Clock3, Layers, RefreshCcw, Skull, Target, Trophy, Users, Wrench } from 'lucide-react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import type { MatchEndReason, MatchModeId, TeamId } from '../game/types';
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
  playerWon: boolean;
  winnerName: string | null;
  winnerTeam: TeamId;
  reason: MatchEndReason;
  mode: MatchModeId;
  matchTimeSec: number;
  teamKills: { alpha: number; bravo: number };
  teamScore: { alpha: number; bravo: number };
  /** Same mode + last map, skip ModeSelect. */
  onRematch: () => void;
  /** Open ModeSelect (change mode / map). */
  onChangeMode: () => void;
  onGarage: () => void;
  onMenu: () => void;
}

function CountUp({ value, duration = 1300 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const loop = (t: number) => {
      const k = Math.min(1, (t - start) / duration);
      const ease = 1 - Math.pow(1 - k, 3);
      setDisplay(Math.round(value * ease));
      if (k < 1) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{display}</>;
}

export default function GameOverScreen({
  score, kills, deaths, playerWon, winnerName, winnerTeam, reason, mode,
  matchTimeSec, teamKills, teamScore,
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

  return (
    <div
      ref={trapRef}
      className="absolute inset-0 z-40 flex items-center justify-center bg-[#04060bd9] backdrop-blur-sm"
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

        <p className="anim-up text-xs tracking-[0.35em] text-white/50" style={{ '--d': '0.1s' } as React.CSSProperties}>
          {modeLabelRu(mode)}
          {reason === 'time' ? ' · ЛИМИТ ВРЕМЕНИ' : ' · ПОРОГ'}
        </p>
        <h2
          id="gameover-title"
          className={`anim-up font-display text-3xl tracking-[0.16em] md:text-5xl ${titleColor}`}
          style={{ '--d': '0.15s' } as React.CSSProperties}
        >
          {headline}
        </h2>
        <p className="anim-up mt-3 flex items-center gap-2 text-sm tracking-[0.3em] text-white/60" style={{ '--d': '0.25s' } as React.CSSProperties}>
          <Clock3 size={14} aria-hidden />
          {formatMatchClock(matchTimeSec)}
        </p>

        {isTeam && (
          <div
            className="anim-up team-score-line mt-6"
            style={{ '--d': '0.32s' } as React.CSSProperties}
            aria-label={`Alpha ${teamLeft}, Bravo ${teamRight}`}
          >
            <span className="team-alpha">ALPHA {teamLeft}</span>
            <span className="team-score-sep">—</span>
            <span className="team-bravo">{teamRight} BRAVO</span>
          </div>
        )}
        {isTeam && (
          <p className="anim-up mt-1 text-[11px] tracking-[0.22em] text-white/45" style={{ '--d': '0.34s' } as React.CSSProperties}>
            {teamUnit.toUpperCase()}
          </p>
        )}

        <div className="anim-up mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4" style={{ '--d': '0.38s' } as React.CSSProperties}>
          <StatCard icon={<Trophy size={16} />} label="СЧЁТ XP" value={score} accent="text-amber-300" />
          <StatCard icon={<Skull size={16} />} label="ФРАГИ" value={kills} accent="text-red-300" />
          <StatCard icon={<Target size={16} />} label="СМЕРТИ" value={deaths} accent="text-cyan-300" />
          <div className="hud-panel min-w-[7.5rem] px-5 py-4">
            <div className="flex justify-center text-emerald-300"><Layers size={16} aria-hidden /></div>
            <div className="font-display mt-2 text-3xl text-emerald-300">{formatKd(kills, deaths)}</div>
            <div className="mt-1 text-[11px] tracking-[0.2em] text-white/55">K/D</div>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <button type="button" onClick={onRematch} className="btn-game btn-primary px-10 py-4 text-base">
            <RefreshCcw size={19} className="bicon-spin" aria-hidden />
            <span>РЕВАНШ</span>
          </button>
          <button type="button" onClick={onChangeMode} className="btn-game btn-ghost px-7 py-3.5 text-sm">
            <Layers size={17} className="bicon" aria-hidden />
            <span>РЕЖИМ / КАРТА</span>
          </button>
          <button type="button" onClick={onGarage} className="btn-game btn-ghost px-7 py-3.5 text-sm">
            <Wrench size={17} className="bicon" />
            <span>ГАРАЖ</span>
          </button>
          <button type="button" onClick={onMenu} className="btn-game btn-ghost px-7 py-3.5 text-sm">
            <Target size={17} className="bicon" />
            <span>МЕНЮ</span>
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
  value: number;
  accent: string;
}) {
  return (
    <div className="hud-panel min-w-[7.5rem] px-5 py-4">
      <div className={`flex justify-center ${accent}`}>{icon}</div>
      <div className={`font-display mt-2 text-3xl ${accent}`}>
        <CountUp value={value} />
      </div>
      <div className="mt-1 text-[11px] tracking-[0.2em] text-white/55">{label}</div>
    </div>
  );
}
