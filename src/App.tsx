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
import MapSelect from './components/MapSelect';
import ModeSelect from './components/ModeSelect';
import type { MapId } from './game/maps/mapCatalog';
import { DEFAULT_MAP_ID } from './game/maps/mapCatalog';
import type { MatchModeId } from './game/types';
import { isInteractiveKeyboardTarget } from './ui/keyboardTarget';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [game, setGame] = useState<GameApi | null>(null);
  const [bootError, setBootError] = useState<{ message: string; detail?: string } | null>(null);
  const [uiMode, setUiMode] = useState<GameMode>('menu');
  const [paused, setPaused] = useState(false);
  const [finalStats, setFinalStats] = useState({
    score: 0,
    kills: 0,
    deaths: 0,
    playerWon: false,
    winnerName: null as string | null,
    winnerTeam: null as import('./game/types').TeamId,
    reason: 'score' as import('./game/types').MatchEndReason,
    mode: 'deathmatch' as import('./game/types').MatchModeId,
    matchTimeSec: 0,
    teamKills: { alpha: 0, bravo: 0 },
    teamScore: { alpha: 0, bravo: 0 },
  });
  const [modeSelectOpen, setModeSelectOpen] = useState(false);
  const [mapSelectOpen, setMapSelectOpen] = useState(false);
  const [lastMapId, setLastMapId] = useState<MapId>(DEFAULT_MAP_ID);
  const [lastMatchMode, setLastMatchMode] = useState<MatchModeId>('deathmatch');
  const [muted, setMuted] = useState(false);

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
        }
      }
      if (e.type === 'gameOver') {
        setFinalStats({
          score: e.score,
          kills: e.kills,
          deaths: e.deaths,
          playerWon: e.playerWon,
          winnerName: e.winnerName,
          winnerTeam: e.winnerTeam,
          reason: e.reason,
          mode: e.mode,
          matchTimeSec: e.matchTimeSec,
          teamKills: e.teamKills,
          teamScore: e.teamScore,
        });
        setPaused(false);
      }
      if (e.type === 'pauseChanged') setPaused(e.value);
    });
    setGame(g);
    return () => g?.dispose();
  }, []);

  /** Flow: ModeSelect → MapSelect → startRound. */
  const openModeSelect = useCallback(() => {
    if (!game) return;
    setMapSelectOpen(false);
    setModeSelectOpen(true);
  }, [game]);

  const confirmMode = useCallback((mode: MatchModeId) => {
    if (!game) return;
    setLastMatchMode(mode);
    game.setMatchMode(mode);
    setModeSelectOpen(false);
    setMapSelectOpen(true);
  }, [game]);

  const cancelModeSelect = useCallback(() => {
    setModeSelectOpen(false);
  }, []);

  const confirmMap = useCallback((mapId: MapId) => {
    if (!game) return;
    setLastMapId(mapId);
    setMapSelectOpen(false);
    setModeSelectOpen(false);
    // Leaving pause/over UI before round starts.
    setPaused(false);
    game.startRound(mapId);
  }, [game]);

  const cancelMapSelect = useCallback(() => {
    setMapSelectOpen(false);
    // Back to mode select when leaving map picker mid-setup.
    setModeSelectOpen(true);
  }, []);

  /** Same mode + last map — skip ModeSelect (P6 rematch). */
  const rematch = useCallback(() => {
    if (!game) return;
    setModeSelectOpen(false);
    setMapSelectOpen(false);
    setPaused(false);
    game.startRound(lastMapId);
  }, [game, lastMapId]);

  const goGarage = useCallback(() => {
    if (!game) return;
    setMapSelectOpen(false);
    setModeSelectOpen(false);
    game.setMode('garage');
  }, [game]);

  const goMenu = useCallback(() => {
    if (!game) return;
    setMapSelectOpen(false);
    setModeSelectOpen(false);
    game.setMode('menu');
  }, [game]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!game) return;
      // Mode/map select own Escape / Enter while open.
      if (mapSelectOpen || modeSelectOpen) return;
      if (e.code === 'Escape') {
        if (uiMode === 'playing') game.togglePause();
        else if (uiMode === 'garage') goMenu();
      }
      if (e.code === 'KeyM') {
        const nowMuted = game.toggleMute();
        setMuted(nowMuted);
      }
      // Enter opens mode select when focus is not already on a control
      if (e.code === 'Enter' && uiMode === 'menu' && !isInteractiveKeyboardTarget(e.target)) {
        openModeSelect();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [game, uiMode, goMenu, openModeSelect, mapSelectOpen, modeSelectOpen]);

  const snap: HudSnapshot | null = game ? game.getHud() : null;

  const toggleMute = useCallback(() => {
    if (!game) return;
    const nowMuted = game.toggleMute();
    setMuted(nowMuted);
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
  const hideChrome = mapSelectOpen || modeSelectOpen;

  return (
    <div className={`relative h-screen w-screen overflow-hidden bg-[#04060b] text-white ${uiMode === 'playing' && !paused && !hideChrome ? 'ingame' : ''}`}>
      <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" />

      <div className="fx-scanlines pointer-events-none absolute inset-0 z-30" />
      <div className="fx-vignette pointer-events-none absolute inset-0 z-10" />

      <HUD game={game} active={uiMode === 'playing' && !hideChrome} />

      {uiMode === 'playing' && paused && game && snap && !hideChrome && (
        <PauseMenu
          game={game}
          muted={muted}
          stats={{ score: snap.score, kills: snap.kills, timeSec: snap.timeSec }}
          onResume={resume}
          onRestart={openModeSelect}
          onGarage={goGarage}
          onMenu={goMenu}
          onToggleMute={toggleMute}
        />
      )}

      {uiMode === 'garage' && !hideChrome && (
        <Garage game={game} onStart={openModeSelect} onBack={goMenu} />
      )}

      {uiMode === 'menu' && !hideChrome && (
        <MainMenu
          hull={currHull}
          turret={currTurret}
          onStart={openModeSelect}
          onGarage={goGarage}
        />
      )}

      {uiMode === 'over' && !hideChrome && (
        <GameOverScreen
          score={finalStats.score}
          kills={finalStats.kills}
          deaths={finalStats.deaths}
          playerWon={finalStats.playerWon}
          winnerName={finalStats.winnerName}
          winnerTeam={finalStats.winnerTeam}
          reason={finalStats.reason}
          mode={finalStats.mode}
          matchTimeSec={finalStats.matchTimeSec}
          teamKills={finalStats.teamKills}
          teamScore={finalStats.teamScore}
          onRematch={rematch}
          onChangeMode={openModeSelect}
          onGarage={goGarage}
          onMenu={goMenu}
        />
      )}

      {modeSelectOpen && (
        <ModeSelect
          initialMode={game?.currentMatchMode ?? lastMatchMode}
          onConfirm={confirmMode}
          onCancel={cancelModeSelect}
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
