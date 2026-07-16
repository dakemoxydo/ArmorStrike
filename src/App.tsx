import { useCallback, useEffect, useRef, useState } from 'react';
import { Game } from './game/Game';
import type { HudSnapshot } from './game/types';
import type { GameMode } from './game/types';
import { HULLS, TURRETS } from './core/catalog';
import HUD from './components/HUD';
import Garage from './components/Garage';
import PauseMenu from './components/PauseMenu';
import MainMenu from './components/MainMenu';
import GameOverScreen from './components/GameOverScreen';
import BootError from './components/BootError';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [bootError, setBootError] = useState<{ message: string; detail?: string } | null>(null);
  const [uiMode, setUiMode] = useState<GameMode>('menu');
  const [paused, setPaused] = useState(false);
  const [finalStats, setFinalStats] = useState({ score: 0, kills: 0, wave: 1 });
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    if (!canvasRef.current) return;
    let g: Game | null = null;
    try {
      g = new Game(canvasRef.current);
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      const webgl = /webgl|WebGL|context/i.test(e.message);
      setBootError({
        message: webgl
          ? 'WebGL недоступен или не удалось создать графический контекст.'
          : 'Ошибка инициализации игры.',
        detail: e.message,
      });
      return;
    }

    g.addListener((e) => {
      if (e.type === 'modeChanged') {
        setUiMode(e.mode);
        if (e.mode !== 'playing') setPaused(false);
      }
      if (e.type === 'gameOver') {
        setFinalStats({ score: e.score, kills: e.kills, wave: e.wave });
        setPaused(false);
      }
      if (e.type === 'pauseChanged') setPaused(e.value);
    });
    setGame(g);
    return () => g?.dispose();
  }, []);

  const start = useCallback(() => {
    if (!game) return;
    game.startRound();
  }, [game]);

  const goGarage = useCallback(() => {
    if (!game) return;
    game.setMode('garage');
  }, [game]);

  const goMenu = useCallback(() => {
    if (!game) return;
    game.setMode('menu');
  }, [game]);

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
  }, [game, uiMode, goMenu, start]);

  const snap: HudSnapshot | null = game ? game.getHud() : null;

  const toggleMute = useCallback(() => {
    if (!game) return;
    game.toggleMute();
    forceUpdate((x) => x + 1);
  }, [game]);

  const resume = () => {
    if (!game) return;
    game.togglePause();
  };

  const restart = useCallback(() => {
    if (!game) return;
    game.startRound();
  }, [game]);

  if (bootError) {
    return <BootError message={bootError.message} detail={bootError.detail} />;
  }

  const currHull = HULLS[game?.currentHull ?? 'hunter'];
  const currTurret = TURRETS[game?.currentTurret ?? 'railgun'];

  return (
    <div className={`relative h-screen w-screen overflow-hidden bg-[#04060b] text-white ${uiMode === 'playing' && !paused ? 'ingame' : ''}`}>
      <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" />

      <div className="fx-scanlines pointer-events-none absolute inset-0 z-30" />
      <div className="fx-vignette pointer-events-none absolute inset-0 z-10" />

      <HUD game={game} active={uiMode === 'playing'} />

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

      {uiMode === 'garage' && (
        <Garage game={game} onStart={start} onBack={goMenu} />
      )}

      {uiMode === 'menu' && (
        <MainMenu
          hull={currHull}
          turret={currTurret}
          onStart={start}
          onGarage={goGarage}
        />
      )}

      {uiMode === 'over' && (
        <GameOverScreen
          score={finalStats.score}
          kills={finalStats.kills}
          wave={finalStats.wave}
          onRestart={start}
          onGarage={goGarage}
          onMenu={goMenu}
        />
      )}
    </div>
  );
}
