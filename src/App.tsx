import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Flame, Gamepad2, Wrench, MousePointer2, Play, RefreshCcw, RotateCw,
  Shield, Skull, Target, Trophy, Waves, Zap,
} from 'lucide-react';
import { Game } from './game/Game';
import type { HudSnapshot } from './game/Game';
import { HULLS, TURRETS } from './game/constants';
import HUD from './components/HUD';
import Garage from './components/Garage';
import PauseMenu from './components/PauseMenu';

type UIMode = 'menu' | 'garage' | 'playing' | 'over';

// Плавный счётчик для экрана поражения
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

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [uiMode, setUiMode] = useState<UIMode>('menu');
  const [paused, setPaused] = useState(false);
  const [finalStats, setFinalStats] = useState({ score: 0, kills: 0, wave: 1 });
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    if (!canvasRef.current) return;
    const g = new Game(canvasRef.current);
    g.addListener((e) => {
      if (e.type === 'gameOver') {
        setFinalStats({ score: e.score, kills: e.kills, wave: e.wave });
        setPaused(false);
        setUiMode('over');
      }
      if (e.type === 'pauseChanged') setPaused(e.value);
    });
    setGame(g);
    return () => g.dispose();
  }, []);

  // Клавиатурная навигация: ESC зависит от режима
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!game) return;
      if (e.code === 'Escape') {
        if (uiMode === 'playing') game.togglePause();
        else if (uiMode === 'garage') goMenu();
      }
      if (e.code === 'KeyM') game.toggleMute();
      if (e.code === 'Enter' && uiMode === 'menu') start();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [game, uiMode]);

  const snap: HudSnapshot | null = game ? game.getHud() : null;

  const toggleMute = useCallback(() => {
    if (!game) return;
    game.toggleMute();
    forceUpdate((x) => x + 1);
  }, [game]);

  const start = () => {
    if (!game) return;
    game.startRound();
    setPaused(false);
    setUiMode('playing');
  };

  const goGarage = () => {
    if (!game) return;
    game.setMode('garage');
    setPaused(false);
    setUiMode('garage');
  };

  const goMenu = () => {
    if (!game) return;
    game.setMode('menu');
    setPaused(false);
    setUiMode('menu');
  };

  const resume = () => {
    if (!game) return;
    game.togglePause();
  };

  const restart = () => {
    if (!game) return;
    game.startRound();
    setPaused(false);
    setUiMode('playing');
  };

  const currHull = HULLS[game?.currentHull ?? 'hunter'];
  const currTurret = TURRETS[game?.currentTurret ?? 'railgun'];

  return (
    <div className={`relative h-screen w-screen overflow-hidden bg-[#04060b] text-white ${uiMode === 'playing' && !paused ? 'ingame' : ''}`}>
      <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" />

      {/* пост-эффекты overlay */}
      <div className="fx-scanlines pointer-events-none absolute inset-0 z-30" />
      <div className="fx-vignette pointer-events-none absolute inset-0 z-10" />

      <HUD game={game} active={uiMode === 'playing'} />

      {/* ===== МЕНЮ ПАУЗЫ ===== */}
      {uiMode === 'playing' && paused && game && snap && (
        <PauseMenu
          game={game}
          muted={snap.muted}
          stats={{ score: snap.score, kills: snap.kills, wave: snap.wave, timeSec: snap.timeSec }}
          onResume={resume}
          onRestart={restart}
          onGarage={goGarage}
          onMenu={goMenu}
          onToggleMute={toggleMute}
        />
      )}

      {/* ===== ГАРАЖ ===== */}
      {uiMode === 'garage' && (
        <Garage game={game} onStart={start} onBack={goMenu} />
      )}

      {/* ===== ГЛАВНОЕ МЕНЮ С 3D ПРЕДПРОСМОТРОМ ===== */}
      {uiMode === 'menu' && (
        <div className="absolute inset-0 z-40 flex items-center justify-between p-8 md:p-14 bg-gradient-to-r from-[#04060bf2] via-[#04060ba8] to-transparent">
          <div className="menu-stripes pointer-events-none absolute inset-x-0 top-0 h-2" />
          <div className="menu-stripes pointer-events-none absolute inset-x-0 bottom-0 h-2" />

          {/* Левый блок */}
          <div className="relative flex max-w-xl flex-col items-start text-left z-10">
            <div className="anim-left flex items-center gap-3 text-[11px] tracking-[0.4em] text-cyan-300/70" style={{ '--d': '0.05s' } as React.CSSProperties}>
              <span className="h-px w-10 bg-cyan-300/40" />
              3D ТАНКОВЫЙ СИМУЛЯТОР
            </div>

            <div className="anim-left" style={{ '--d': '0.15s' } as React.CSSProperties}>
              <h1 className="title-glitch font-display text-5xl leading-none tracking-wider md:text-7xl">
                ARMOR
                <span className="block bg-gradient-to-r from-cyan-300 via-emerald-300 to-cyan-400 bg-clip-text text-transparent">
                  STRIKE
                </span>
              </h1>
            </div>

            <p className="anim-left mt-4 text-xs md:text-sm leading-relaxed text-white/60 max-w-lg" style={{ '--d': '0.28s' } as React.CSSProperties}>
              Разрушаемые укрытия, динамические волны ботов и сборка бронетехники.
              Соедини корпус и орудие в Гараже — и выходи в бой.
            </p>

            {/* Карточка текущей конфигурации */}
            <div className="anim-left hud-panel mt-6 p-4 w-full max-w-md border border-cyan-500/30 bg-black/40 transition-all duration-300 hover:border-cyan-400/60 hover:shadow-[0_0_28px_rgba(46,230,192,0.25)] hover:-translate-y-1" style={{ '--d': '0.4s' } as React.CSSProperties}>
              <div className="hud-label text-cyan-300/80 mb-2 flex items-center justify-between">
                <span>ТЕКУЩАЯ СБОРКА ТАНКА</span>
                <span className="text-[9px] text-emerald-400 font-display">ГОТОВ К БОЮ</span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="floaty w-10 h-10 rounded border border-cyan-400/40 bg-cyan-950/50 flex items-center justify-center text-cyan-300">
                    <Shield size={20} />
                  </div>
                  <div>
                    <div className="text-[10px] text-white/50 tracking-widest">КОРПУС</div>
                    <div className="font-display text-sm text-cyan-200">{currHull.name}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="floaty w-10 h-10 rounded border border-amber-400/40 bg-amber-950/50 flex items-center justify-center text-amber-300" style={{ animationDelay: '-2.2s' }}>
                    <Zap size={20} />
                  </div>
                  <div>
                    <div className="text-[10px] text-white/50 tracking-widest">БАШНЯ</div>
                    <div className="font-display text-sm text-amber-200">{currTurret.name}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Кнопки */}
            <div className="anim-left mt-8 flex flex-wrap items-center gap-4" style={{ '--d': '0.52s' } as React.CSSProperties}>
              <button onClick={start} className="btn-game btn-primary px-12 py-4 text-lg">
                <Play size={22} className="bicon" />
                <span>ИГРАТЬ</span>
              </button>

              <button onClick={goGarage} className="btn-game btn-ghost px-8 py-4 text-sm">
                <Wrench size={18} className="bicon" />
                <span>ГАРАЖ ТАНКА</span>
              </button>
            </div>

            {/* Управление */}
            <div className="anim-left mt-8 grid grid-cols-2 gap-2 text-left w-full max-w-md" style={{ '--d': '0.64s' } as React.CSSProperties}>
              <ControlCard icon={<Gamepad2 size={16} />} k="WASD" label="Корпус" />
              <ControlCard icon={<MousePointer2 size={16} />} k="МЫШЬ" label="Башня" />
              <ControlCard icon={<Target size={16} />} k="ЛКМ" label="Огонь" />
              <ControlCard icon={<RotateCw size={16} />} k="ESC — ПАУЗА" label="Меню в бою" />
            </div>
          </div>

          {/* Правая часть: подпись 3D предпросмотра */}
          <div className="hidden lg:flex flex-col items-end justify-center pointer-events-none z-10">
            <div className="anim-up hud-panel p-3 text-right max-w-xs bg-black/30" style={{ '--d': '0.7s' } as React.CSSProperties}>
              <div className="hud-label text-cyan-300/90 mb-1 flex items-center justify-end gap-1.5">
                <Flame size={12} /> 3D ПРЕДПРОСМОТР
              </div>
              <p className="text-[10px] text-white/50 tracking-widest leading-relaxed">
                Модель рендерится в реальном времени.
                Смена корпуса или башни в Гараже мгновенно обновляет модель.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ===== ЭКРАН ПОРАЖЕНИЯ ===== */}
      {uiMode === 'over' && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#04060bd9] backdrop-blur-sm">
          <div className="menu-stripes danger pointer-events-none absolute inset-x-0 bottom-0 h-2" />
          <div className="menu-stripes danger pointer-events-none absolute inset-x-0 top-0 h-2" />
          <div className="flex flex-col items-center px-6 text-center">
            <div className="anim-pop" style={{ '--d': '0.05s' } as React.CSSProperties}>
              <Skull size={46} className="skull-pulse mb-4 text-red-400" />
            </div>

            <h2 className="anim-up font-display text-5xl tracking-[0.2em] text-red-400 md:text-6xl" style={{ '--d': '0.15s' } as React.CSSProperties}>
              ТАНК УНИЧТОЖЕН
            </h2>
            <p className="anim-up mt-3 text-sm tracking-[0.3em] text-white/40" style={{ '--d': '0.25s' } as React.CSSProperties}>
              ARMORSTRIKE НЕ ПРОЩАЕТ СЛАБОСТИ
            </p>

            <div className="anim-up mt-9 grid grid-cols-3 gap-4" style={{ '--d': '0.38s' } as React.CSSProperties}>
              <StatCard icon={<Trophy size={16} />} label="СЧЁТ" value={finalStats.score} accent="text-amber-300" />
              <StatCard icon={<Skull size={16} />} label="ФРАГИ" value={finalStats.kills} accent="text-red-300" />
              <StatCard icon={<Waves size={16} />} label="ВОЛНА" value={finalStats.wave} accent="text-cyan-300" />
            </div>

            <div className="anim-up mt-10 flex flex-wrap items-center justify-center gap-4" style={{ '--d': '0.52s' } as React.CSSProperties}>
              <button onClick={start} className="btn-game btn-primary px-12 py-4 text-base">
                <RefreshCcw size={19} className="bicon-spin" />
                <span>РЕВАНШ</span>
              </button>
              <button onClick={goGarage} className="btn-game btn-ghost px-8 py-4 text-sm">
                <Wrench size={17} className="bicon" />
                <span>В ГАРАЖ</span>
              </button>
              <button onClick={goMenu} className="btn-game btn-ghost px-8 py-4 text-sm">
                <Target size={17} className="bicon" />
                <span>МЕНЮ</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ControlCard({ icon, k, label }: { icon: React.ReactNode; k: string; label: string }) {
  return (
    <div className="hud-panel flex items-center gap-2.5 px-3 py-2 bg-black/40 transition-all duration-200 hover:border-cyan-400/40 hover:-translate-y-0.5">
      <span className="text-cyan-300">{icon}</span>
      <div>
        <div className="font-display text-xs tracking-wider text-white">{k}</div>
        <div className="text-[9px] text-white/40">{label}</div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number; accent: string }) {
  return (
    <div className="hud-panel min-w-32 px-6 py-4">
      <div className={`flex items-center justify-center gap-1.5 text-[10px] tracking-[0.3em] ${accent}`}>
        {icon} {label}
      </div>
      <div className="font-display mt-1 text-3xl text-white">
        <CountUp value={value} />
      </div>
    </div>
  );
}
