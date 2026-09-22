import { useCallback, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import HUD from './components/HUD';
import Garage from './components/Garage';
import PauseMenu from './components/PauseMenu';
import MainMenu from './components/MainMenu';
import GameOverScreen from './components/GameOverScreen';
import BootError from './components/BootError';
import MapSelect from './components/MapSelect';
import ModeSelect from './components/ModeSelect';
import StarterPackModal from './components/StarterPackModal';
import QuestsModal from './components/QuestsModal';
import LeaderboardModal from './components/LeaderboardModal';
import SettingsModal from './components/SettingsModal';
import AuthModal from './components/auth/AuthModal';
import ServerBrowserModal from './components/multiplayer/ServerBrowserModal';
import { useUiModals } from './hooks/useUiModals';
import { useRoundState, useRoundFlow } from './hooks/useRoundFlow';
import { useGameBootstrap } from './hooks/useGameBootstrap';
import { useAppSettings } from './hooks/useAppSettings';
import { useAppHotkeys } from './hooks/useAppHotkeys';
import { useResume } from './hooks/useResume';
import { useGameDerivedStats } from './hooks/useGameDerivedStats';
import { useHudSnapshot } from './hooks/useHudSnapshot';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [modals, dispatch] = useUiModals();
  const round = useRoundState();
  const {
    game,
    bootError,
    uiMode,
    paused,
    finalStats,
    starterClaimed,
    economyVersion,
    leaderboardSubmit,
    setPaused,
    claimStarterPack,
  } = useGameBootstrap(canvasRef, round.setRoundError, dispatch);

  const flow = useRoundFlow({ game, round, setPaused, dispatch });
  const {
    lastMapId,
    lastMatchMode,
    openModeSelect,
    confirmMode,
    cancelModeSelect,
    confirmMap,
    cancelMapSelect,
    rematch,
    handleQuickMatch,
    handleJoinRoom,
    handleCreateRoom,
    goGarage,
    goMenu,
  } = flow;

  const { muted, crosshair, damageNumbers, toggleMute, changeCrosshair, changeDamageNumbers } =
    useAppSettings(game);

  useAppHotkeys({
    game,
    uiMode,
    mapSelectOpen: modals.mapSelectOpen,
    modeSelectOpen: modals.modeSelectOpen,
    authModalOpen: modals.authModalOpen,
    questsOpen: modals.questsOpen,
    leaderboardOpen: modals.leaderboardOpen,
    serverBrowserOpen: modals.serverBrowserOpen,
    goMenu,
    openModeSelect,
    onToggleMute: toggleMute,
  });

  const resume = useResume(game);
  const { currHull, currTurret, claimableQuestsCount } = useGameDerivedStats(game, economyVersion);
  const snap = useHudSnapshot(game);
  const { roundLoading, roundError } = round;

  const isTouchOnly = typeof window !== 'undefined'
    && 'ontouchstart' in window
    && !window.matchMedia('(pointer: fine)').matches;

  const openQuests = useCallback(() => dispatch({ type: 'openQuests' }), [dispatch]);
  const closeQuests = useCallback(() => dispatch({ type: 'closeQuests' }), [dispatch]);
  const openLeaderboard = useCallback(() => dispatch({ type: 'openLeaderboard' }), [dispatch]);
  const closeLeaderboard = useCallback(() => dispatch({ type: 'closeLeaderboard' }), [dispatch]);
  const openAuthLogin = useCallback(
    () => dispatch({ type: 'openAuth', tab: 'login' }),
    [dispatch],
  );
  const closeAuth = useCallback(() => dispatch({ type: 'closeAuth' }), [dispatch]);
  const openServerBrowser = useCallback(
    () => dispatch({ type: 'openServerBrowser' }),
    [dispatch],
  );
  const closeServerBrowser = useCallback(
    () => dispatch({ type: 'closeServerBrowser' }),
    [dispatch],
  );
  const openSettings = useCallback(() => dispatch({ type: 'openSettings' }), [dispatch]);
  const closeSettings = useCallback(() => dispatch({ type: 'closeSettings' }), [dispatch]);

  if (bootError) {
    return <BootError message={bootError.message} detail={bootError.detail} />;
  }

  // Во время загрузки раунда режим ещё прежний — прячем меню под оверлей.
  const hideChrome = modals.mapSelectOpen || modals.modeSelectOpen || roundLoading;

  return (
    <div className={`relative h-screen w-screen overflow-hidden bg-[#04060b] text-white ${uiMode === 'playing' && !paused && !hideChrome ? 'ingame' : ''}`}>
      {/* Canvas has no implicit ARIA role — label it so screen readers announce
          the play field instead of skipping an unlabelled graphic. The child is
          fallback content for UAs without <canvas>; it never renders in-game. */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 block h-full w-full"
        role="img"
        aria-label="Игровое поле ArmorStrike"
      >
        Для игры нужен браузер с поддержкой HTML5 canvas и WebGL.
      </canvas>

      <div className="fx-scanlines pointer-events-none absolute inset-0 z-30" />
      <div className="fx-vignette pointer-events-none absolute inset-0 z-10" />

      <HUD
        game={game}
        active={uiMode === 'playing' && !hideChrome}
        crosshair={crosshair}
        damageNumbers={damageNumbers}
        onToggleMute={toggleMute}
      />

      {uiMode === 'playing' && paused && game && snap && !hideChrome && (
        <PauseMenu
          game={game}
          muted={muted}
          stats={{ score: snap.score, kills: snap.kills, timeSec: snap.timeSec }}
          crosshair={crosshair}
          onCrosshair={changeCrosshair}
          damageNumbers={damageNumbers}
          onDamageNumbers={changeDamageNumbers}
          onResume={resume}
          onRestart={rematch}
          onGarage={goGarage}
          onMenu={goMenu}
          onToggleMute={toggleMute}
        />
      )}

      {uiMode === 'garage' && !hideChrome && (
        <Garage
          game={game}
          onStart={openModeSelect}
          onBack={goMenu}
          onQuests={openQuests}
          onOpenAuth={openAuthLogin}
          claimableQuestsCount={claimableQuestsCount}
        />
      )}

      {uiMode === 'menu' && !hideChrome && (
        <MainMenu
          hull={currHull}
          turret={currTurret}
          credits={game?.credits ?? 0}
          claimableQuestsCount={claimableQuestsCount}
          game={game}
          onStart={openModeSelect}
          onQuickGame={handleQuickMatch}
          onServerBrowser={openServerBrowser}
          onGarage={goGarage}
          onQuests={openQuests}
          onLeaderboard={openLeaderboard}
          onSettings={openSettings}
          onOpenAuth={openAuthLogin}
        />
      )}

      {uiMode === 'over' && !hideChrome && (
        <GameOverScreen
          score={finalStats.score}
          kills={finalStats.kills}
          deaths={finalStats.deaths}
          bestStreak={finalStats.bestStreak}
          playerWon={finalStats.playerWon}
          winnerName={finalStats.winnerName}
          winnerTeam={finalStats.winnerTeam}
          reason={finalStats.reason}
          mode={finalStats.mode}
          matchTimeSec={finalStats.matchTimeSec}
          teamKills={finalStats.teamKills}
          teamScore={finalStats.teamScore}
          rewards={finalStats.rewards}
          onQuests={openQuests}
          leaderboardSubmit={leaderboardSubmit}
          onLeaderboard={openLeaderboard}
          onRematch={rematch}
          onChangeMode={openModeSelect}
          onGarage={goGarage}
          onMenu={goMenu}
        />
      )}

      {modals.modeSelectOpen && (
        <ModeSelect
          initialMode={game?.currentMatchMode ?? lastMatchMode}
          onConfirm={confirmMode}
          onCancel={cancelModeSelect}
        />
      )}

      {modals.mapSelectOpen && (
        <MapSelect
          initialMapId={game?.currentMapId ?? lastMapId}
          onConfirm={confirmMap}
          onCancel={cancelMapSelect}
        />
      )}

      {game && !starterClaimed && (
        <StarterPackModal onComplete={claimStarterPack} />
      )}

      {modals.questsOpen && <QuestsModal game={game} onClose={closeQuests} />}

      {modals.leaderboardOpen && <LeaderboardModal onClose={closeLeaderboard} />}

      {modals.authModalOpen && (
        <AuthModal
          game={game}
          initialTab={modals.authModalInitialTab}
          onClose={closeAuth}
        />
      )}

      {modals.serverBrowserOpen && (
        <ServerBrowserModal
          username={game?.username ?? 'Боец'}
          onJoinRoom={handleJoinRoom}
          onCreateRoom={handleCreateRoom}
          onQuickMatch={handleQuickMatch}
          onClose={closeServerBrowser}
        />
      )}

      {modals.settingsOpen && (
        <SettingsModal
          game={game}
          muted={muted}
          onToggleMute={toggleMute}
          crosshair={crosshair}
          onCrosshair={changeCrosshair}
          damageNumbers={damageNumbers}
          onDamageNumbers={changeDamageNumbers}
          onClose={closeSettings}
        />
      )}

      {isTouchOnly && uiMode === 'menu' && !hideChrome && (
        <div
          className="hud-panel cut-control absolute inset-x-0 top-3 z-50 mx-auto flex w-fit max-w-[min(26rem,calc(100vw-2rem))] items-center gap-2 border-2 border-[#0b0e14] bg-[#0c121e]/95 px-4 py-2 text-center text-xs tracking-wider text-amber-300 shadow-[0_4px_0_#0b0e14]"
          role="status"
        >
          <AlertTriangle size={15} className="shrink-0 text-amber-400" aria-hidden />
          <span>Внимание: игра рассчитана на ПК (клавиатура и мышь). Сенсорное управление не поддерживается.</span>
        </div>
      )}

      {roundError && !roundLoading && (
        <div
          className="hud-panel cut-control absolute inset-x-0 top-5 z-50 mx-auto flex w-fit max-w-[min(20rem,calc(100vw-3rem))] items-center gap-2 border-2 border-[#0b0e14] bg-[#1a0808]/95 px-4 py-2.5 text-center text-xs tracking-widest text-rose-300 shadow-[0_4px_0_#0b0e14]"
          role="alert"
        >
          <AlertTriangle size={15} className="shrink-0 text-rose-400" aria-hidden />
          <span>{roundError}</span>
        </div>
      )}

      {roundLoading && (
        <div
          className="scrim-over absolute inset-0 z-40 flex items-center justify-center"
          role="status"
          aria-live="polite"
        >
          <div className="flex flex-col items-center gap-3">
            <div className="loader" aria-hidden />
            <span className="text-sm tracking-hero text-white/70">ЗАГРУЗКА</span>
          </div>
        </div>
      )}
    </div>
  );
}
