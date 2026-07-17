import { useEffect, useState } from 'react';
import { RefreshCcw, Skull, Target, Trophy, Waves, Wrench } from 'lucide-react';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface GameOverScreenProps {
  score: number;
  kills: number;
  wave: number;
  onRestart: () => void;
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
  score, kills, wave, onRestart, onGarage, onMenu,
}: GameOverScreenProps) {
  const trapRef = useFocusTrap(true);

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
      <div className="flex flex-col items-center px-6 text-center">
        <div className="anim-pop" style={{ '--d': '0.05s' } as React.CSSProperties}>
          <Skull size={46} className="skull-pulse mb-4 text-red-400" aria-hidden />
        </div>

        <h2 id="gameover-title" className="anim-up font-display text-5xl tracking-[0.2em] text-red-400 md:text-6xl" style={{ '--d': '0.15s' } as React.CSSProperties}>
          ТАНК УНИЧТОЖЕН
        </h2>
        <p className="anim-up mt-3 text-sm tracking-[0.3em] text-white/60" style={{ '--d': '0.25s' } as React.CSSProperties}>
          ARMORSTRIKE НЕ ПРОЩАЕТ СЛАБОСТИ
        </p>

        <div className="anim-up mt-9 grid grid-cols-3 gap-4" style={{ '--d': '0.38s' } as React.CSSProperties}>
          <StatCard icon={<Trophy size={16} />} label="СЧЁТ" value={score} accent="text-amber-300" />
          <StatCard icon={<Skull size={16} />} label="ФРАГИ" value={kills} accent="text-red-300" />
          <StatCard icon={<Waves size={16} />} label="ВОЛНА" value={wave} accent="text-cyan-300" />
        </div>

        {/* Primary CTA without enter-anim so focus trap lands on a visible control (M1) */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <button type="button" onClick={onRestart} className="btn-game btn-primary px-12 py-4 text-base">
            <RefreshCcw size={19} className="bicon-spin" aria-hidden />
            <span>РЕВАНШ</span>
          </button>
          <button type="button" onClick={onGarage} className="btn-game btn-ghost px-8 py-4 text-sm">
            <Wrench size={17} className="bicon" />
            <span>В ГАРАЖ</span>
          </button>
          <button type="button" onClick={onMenu} className="btn-game btn-ghost px-8 py-4 text-sm">
            <Target size={17} className="bicon" />
            <span>МЕНЮ</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, accent }: {
  icon: React.ReactNode; label: string; value: number; accent: string;
}) {
  return (
    <div className="hud-panel min-w-32 px-6 py-4">
      <div className={`flex items-center justify-center gap-1.5 text-[11px] tracking-[0.22em] ${accent}`}>
        <span aria-hidden>{icon}</span> {label}
      </div>
      <div className="mt-1 font-display text-3xl text-white">
        <CountUp value={value} />
      </div>
    </div>
  );
}
