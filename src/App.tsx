import { useCallback, useEffect, useRef, useState } from 'react';
import { Game } from './game/Game';
import type { GameApi } from './game/GameApi';
import type { HudSnapshot } from './game/types';
import type { GameMode } from './game/types';
import { HULLS, TURRETS } from './core/catalog';
import HUD from './components/HUD';
import Garage from './components/Garage';
import PauseMenu from './components/PauseMenu';
import MainMenu from './components/MainMenu';
import GameOverScreen from './components/GameOverScreen';
import BootError from './components/BootError';
import WaveIntermission, { type IntermissionPayload } from './components/WaveIntermission';
import MapSelect from './components/MapSelect';
import type { MapId } from './game/maps/mapCatalog';
import { DEFAULT_MAP_ID } from './game/maps/mapCatalog';
import { isInteractiveKeyboardTarget } from './ui/keyboardTarget';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [game, setGame] = useState<GameApi | null>(null);
  const [bootError, setBootError] = useState<{ message: string; detail?: string } | null>(null);
  const [uiMode, setUiMode] = useState<GameMode>('menu');
  const [paused, setPaused] = useState(false);
  const [intermission, setIntermission] = useState<IntermissionPayload | null>(null);
  const [finalStats, setFinalStats] = useState({ score: 0, kills: 0, wave: 1 });
  const [mapSelectOpen, setMapSelectOpen] = useState(false);
  const [lastMapId, setLastMapId] = useState<MapId>(DEFAULT_MAP_ID);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    if (!canvasRef.current) return;
    let g: GameApi | null = null;
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
        if (e.mode !== 'playing') {
          setPaused(false);
          setIntermission(null);
        }
      }
      if (e.type === 'gameOver') {
        setFinalStats({ score: e.score, kills: e.kills, wave: e.wave });
        setPaused(false);
        setIntermission(null);
      }
      if (e.type === 'pauseChanged') setPaused(e.value);
      if (e.type === 'intermission') {
        setIntermission({
          clearedWave: e.clearedWave,
          nextWave: e.nextWave,
          tally: e.tally,
          roleTally: e.roleTally,
        });
      }
      if (e.type === 'wave') setIntermission(null);
    });
    setGame(g);
    return () => g?.dispose();
  }, []);

  /** Open map picker before any match start. */
  const openMapSelect = useCallback(() => {
    if (!game) return;
    setMapSelectOpen(true);
  }, [game]);

  const confirmMap = useCallback((mapId: MapId) => {
    if (!game) return;
    setLastMapId(mapId);
    setMapSelectOpen(false);
    // Leaving pause/over UI before round starts.
    setPaused(false);
    game.startRound(mapId);
  }, [game]);

  const cancelMapSelect = useCallback(() => {
    setMapSelectOpen(false);
  }, []);

  const goGarage = useCallback(() => {
    if (!game) return;
    setMapSelectOpen(false);
    game.setMode('garage');
  }, [game]);

  const goMenu = useCallback(() => {
    if (!game) return;
    setMapSelectOpen(false);
    game.setMode('menu');
  }, [game]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!game) return;
      // Map select owns Escape / Enter while open.
      if (mapSelectOpen) return;
      if (e.code === 'Escape') {
        // Intermission blocks pause (buff UI owns the screen).
        if (uiMode === 'playing' && !intermission) game.togglePause();
        else if (uiMode === 'garage') goMenu();
      }
      if (e.code === 'KeyM') game.toggleMute();
      // Enter opens map select when focus is not already on a control
      if (e.code === 'Enter' && uiMode === 'menu' && !isInteractiveKeyboardTarget(e.target)) {
        openMapSelect();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [game, uiMode, goMenu, openMapSelect, intermission, mapSelectOpen]);

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

  if (bootError) {
    return <BootError message={bootError.message} detail={bootError.detail} />;
  }

  const currHull = HULLS[game?.currentHull ?? 'hunter'];
  const currTurret = TURRETS[game?.currentTurret ?? 'railgun'];
  const hideChrome = mapSelectOpen;

  return (
    <div className={`relative h-screen w-screen overflow-hidden bg-[#04060b] text-white ${uiMode === 'playing' && !paused && !intermission && !mapSelectOpen ? 'ingame' : ''}`}>
      <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" />

      <div className="fx-scanlines pointer-events-none absolute inset-0 z-30" />
      <div className="fx-vignette pointer-events-none absolute inset-0 z-10" />

      <HUD game={game} active={uiMode === 'playing' && !mapSelectOpen} />

      {uiMode === 'playing' && intermission && game && !mapSelectOpen && (
        <WaveIntermission
          game={game}
          data={intermission}
          onChosen={() => setIntermission(null)}
        />
      )}

      {uiMode === 'playing' && paused && !intermission && game && snap && !mapSelectOpen && (
        <PauseMenu
          game={game}
          muted={snap.muted}
          stats={{ score: snap.score, kills: snap.kills, wave: snap.wave, timeSec: snap.timeSec }}
          onResume={resume}
          onRestart={openMapSelect}
          onGarage={goGarage}
          onMenu={goMenu}
          onToggleMute={toggleMute}
        />
      )}

      {uiMode === 'garage' && !hideChrome && (
        <Garage game={game} onStart={openMapSelect} onBack={goMenu} />
      )}

      {uiMode === 'menu' && !hideChrome && (
        <MainMenu
          hull={currHull}
          turret={currTurret}
          onStart={openMapSelect}
          onGarage={goGarage}
        />
      )}

      {uiMode === 'over' && !hideChrome && (
        <GameOverScreen
          score={finalStats.score}
          kills={finalStats.kills}
          wave={finalStats.wave}
          onRestart={openMapSelect}
          onGarage={goGarage}
          onMenu={goMenu}
        />
      )}

      {mapSelectOpen && (
        <MapSelect
          initialMapId={game?.currentMapId ?? lastMapId}
          onConfirm={confirmMap}
          onCancel={cancelMapSelect}
        />
      )}
    </div>
  );
}
