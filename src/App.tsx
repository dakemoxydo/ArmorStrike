import { useCallback, useEffect, useRef, useState } from 'react';
import { Game } from './game/Game';
import type { GameApi } from './game/GameApi';
import type { HudSnapshot } from './game/types';
import type { GameMode } from './game/types';
import { HULLS, TURRETS } from './core/catalog';
import type { HullId, TurretId } from './core/catalog';
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
import AuthModal, { type AuthTab } from './components/auth/AuthModal';
import { AuthService } from './game/auth/authService';
import type { MapId } from './game/maps/mapCatalog';
import { DEFAULT_MAP_ID } from './game/maps/mapCatalog';
import type { MatchModeId } from './game/types';
import type { MatchRewards } from './game/economy/matchRewards';
import { isInteractiveKeyboardTarget } from './ui/keyboardTarget';
import { loadMuted } from './game/audio';
import {
  loadCrosshairStyle,
  saveCrosshairStyle,
  type CrosshairStyle,
} from './ui/crosshairStyle';
import { loadDamageNumbers, saveDamageNumbers } from './ui/damageNumbersSetting';
import ServerBrowserModal from './components/multiplayer/ServerBrowserModal';
import { MultiplayerService } from './game/network/multiplayerService';
import type { CreateRoomOptions } from './game/network/types';

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
    bestStreak: 0,
    playerWon: false,
    winnerName: null as string | null,
    winnerTeam: null as import('./game/types').TeamId,
    reason: 'score' as import('./game/types').MatchEndReason,
    mode: 'deathmatch' as import('./game/types').MatchModeId,
    matchTimeSec: 0,
    teamKills: { alpha: 0, bravo: 0 },
    teamScore: { alpha: 0, bravo: 0 },
    rewards: undefined as MatchRewards | undefined,
  });
  const [questsOpen, setQuestsOpen] = useState(false);
  const [, setEconomyVersion] = useState(0);
  const [modeSelectOpen, setModeSelectOpen] = useState(false);
  const [mapSelectOpen, setMapSelectOpen] = useState(false);
  const [lastMapId, setLastMapId] = useState<MapId>(DEFAULT_MAP_ID);
  const [lastMatchMode, setLastMatchMode] = useState<MatchModeId>('deathmatch');
  const [muted, setMuted] = useState(loadMuted);
  /** Пресет прицела из настроек (меню паузы); persist — as2_crosshair. */
  const [crosshair, setCrosshair] = useState<CrosshairStyle>(loadCrosshairStyle);
  /** Показывать числа урона/лечения (п.1); persist — as2_damage_numbers. */
  const [damageNumbers, setDamageNumbers] = useState<boolean>(loadDamageNumbers);
  /** startRound асинхронен (GLB-корпуса) — без этого арена молча пустует. */
  const [roundLoading, setRoundLoading] = useState(false);
  /** Видимая ошибка старта раунда (M13b): раньше был только console.error. */
  const [roundError, setRoundError] = useState<string | null>(null);
  /** Стартовый пак новобранца: распакован ли (иначе открывается StarterPackModal). */
  const [starterClaimed, setStarterClaimed] = useState(true);
  /** Модальное окно авторизации/регистрации/сброса пароля */
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalInitialTab, setAuthModalInitialTab] = useState<AuthTab>('login');
  /** Модальное окно списка серверов мультиплеера */
  const [serverBrowserOpen, setServerBrowserOpen] = useState(false);

  // Boot: Game.create awaits async tank mesh / systems; listeners are safe pre/post ready.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let g: GameApi | null = null;
    let cancelled = false;

    (async () => {
      try {
        // Fail-fast до Game.create: временный canvas, игровой не трогаем (W-1).
        const probe = document.createElement('canvas').getContext('webgl2');
        if (!probe) {
          setBootError({
            message: 'WebGL недоступен или не удалось создать графический контекст.',
            detail: 'webgl2 context probe failed',
          });
          return;
        }
        const instance = await Game.create(canvas);
        if (cancelled) {
          instance.dispose();
          return;
        }
        g = instance;
        // DEV-only ручка в консоль (`__as2`): «стреляет ли игра вообще, какой
        // пресет, идёт ли раунд» проверяется без единого проброса по дереву React.
        // Только узкий GameApi — sim/движок наружу не течёт, в прод не попадает.
        if (import.meta.env.DEV) {
          (window as unknown as { __as2?: GameApi }).__as2 = g;
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
              bestStreak: e.bestStreak,
              playerWon: e.playerWon,
              winnerName: e.winnerName,
              winnerTeam: e.winnerTeam,
              reason: e.reason,
              mode: e.mode,
              matchTimeSec: e.matchTimeSec,
              teamKills: e.teamKills,
              teamScore: e.teamScore,
              rewards: e.rewards,
            });
            setPaused(false);
          }
          if (e.type === 'pauseChanged') setPaused(e.value);
          if (e.type === 'garageChanged') {
            setStarterClaimed(instance.starterPackClaimed);
            setEconomyVersion((v) => v + 1);
          }
        });
        setStarterClaimed(instance.starterPackClaimed);
        setGame(g);
      } catch (err) {
        if (cancelled) return;
        const e = err instanceof Error ? err : new Error(String(err));
        const webgl = /webgl|WebGL|context/i.test(e.message);
        setBootError({
          message: webgl
            ? 'WebGL недоступен или не удалось создать графический контекст.'
            : 'Ошибка инициализации игры.',
          detail: e.message,
        });
      }
    })();

    return () => {
      cancelled = true;
      g?.dispose();
    };
  }, []);

  // Слушатель изменения состояния авторизации Supabase
  useEffect(() => {
    const sub = AuthService.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setAuthModalInitialTab('reset_password');
        setAuthModalOpen(true);
      } else if (event === 'SIGNED_IN' && session?.user) {
        if (game) {
          await game.loadCloudProfile(session.user.id);
        }
      } else if (event === 'SIGNED_OUT') {
        if (game) {
          game.setAuthUser(null);
        }
      }
    });

    return () => {
      sub.unsubscribe();
    };
  }, [game]);

  // Первичная подгрузка облачного профиля, если пользователь уже авторизован
  useEffect(() => {
    if (!game) return;
    (async () => {
      const user = await AuthService.getCurrentUser();
      if (user) {
        await game.loadCloudProfile(user.id);
      }
    })();
  }, [game]);

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

  /** Единая точка старта: держит индикатор загрузки и глотает гонку stale-старта. */
  // H5: startRound вытесняется новым (дабл-клик «В БОЙ»/«БЫСТРАЯ ИГРА») и
  // резолвится досрочно — без токена stale-вызов гасил «ЗАГРУЗКА» посреди
  // перестройки нового раунда и показывал тост ошибки при успешном старте.
  const startToken = useRef(0);
  const runStartRound = useCallback(async (game: GameApi, mapId: MapId) => {
    const token = ++startToken.current;
    setRoundLoading(true);
    setRoundError(null);
    try {
      await game.startRound(mapId);
    } catch (err) {
      console.error('[ArmorStrike] startRound failed', err);
      if (token === startToken.current) {
        setRoundError('Не удалось начать раунд. Попробуйте ещё раз.');
      }
    } finally {
      if (token === startToken.current) {
        setRoundLoading(false);
      }
    }
  }, []);

  const confirmMap = useCallback((mapId: MapId) => {
    if (!game) return;
    setLastMapId(mapId);
    setMapSelectOpen(false);
    setModeSelectOpen(false);
    // Leaving pause/over UI before round starts.
    setPaused(false);
    void runStartRound(game, mapId);
  }, [game, runStartRound]);

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
    void (async () => {
      if (game.isMultiplayer) await game.leaveMultiplayer();
      await runStartRound(game, lastMapId);
    })();
  }, [game, lastMapId, runStartRound]);

  /** Сетевая игра: мгновенный подбор матча (быстрая игра) */
  const handleQuickMatch = useCallback(async () => {
    if (!game) return;
    // MP-токен (как runStartRound H5): двойной клик «БЫСТРАЯ ИГРА» не гасит
    // чужой ЗАГРУЗКА — stale-вызов не трогает флаг и не пишет ошибку.
    const token = ++startToken.current;
    setRoundLoading(true);
    setRoundError(null);
    try {
      const playerInfo = {
        userId: game.getNetworkId(),
        username: game.username,
        hullId: game.currentHull,
        turretId: game.currentTurret,
      };
      const res = await MultiplayerService.quickMatch(playerInfo);
      if (res.success && res.room) {
        setServerBrowserOpen(false);
        setModeSelectOpen(false);
        setMapSelectOpen(false);
        setPaused(false);
        setLastMapId(res.room.map_id);
        setLastMatchMode(res.room.mode);
        await game.startMultiplayerRound(res.room, res.isHost, res.team);
      } else {
        if (token === startToken.current) {
          setRoundError(res.error || 'Не удалось найти свободный сервер');
        }
      }
    } catch (err) {
      console.error('[ArmorStrike] quickMatch failed:', err);
      if (token === startToken.current) {
        setRoundError('Ошибка поиска сетевой игры');
      }
    } finally {
      if (token === startToken.current) {
        setRoundLoading(false);
      }
    }
  }, [game]);

  /** Подключение к выбранному серверу */
  const handleJoinRoom = useCallback(async (roomId: string, password?: string) => {
    if (!game) return;
    const token = ++startToken.current;
    setRoundLoading(true);
    setRoundError(null);
    try {
      const playerInfo = {
        userId: game.getNetworkId(),
        username: game.username,
        hullId: game.currentHull,
        turretId: game.currentTurret,
      };
      const res = await MultiplayerService.joinRoom(roomId, playerInfo, password);
      if (res.success && res.room) {
        setServerBrowserOpen(false);
        setModeSelectOpen(false);
        setMapSelectOpen(false);
        setPaused(false);
        setLastMapId(res.room.map_id);
        setLastMatchMode(res.room.mode);
        await game.startMultiplayerRound(res.room, false, res.team);
      } else {
        if (token === startToken.current) {
          setRoundError(res.error || 'Ошибка входа на сервер');
        }
      }
    } catch (err) {
      console.error('[ArmorStrike] joinRoom failed:', err);
      if (token === startToken.current) {
        setRoundError('Не удалось подключиться к серверу');
      }
    } finally {
      if (token === startToken.current) {
        setRoundLoading(false);
      }
    }
  }, [game]);

  /** Создание сервера */
  const handleCreateRoom = useCallback(async (opts: CreateRoomOptions) => {
    if (!game) return;
    const token = ++startToken.current;
    setRoundLoading(true);
    setRoundError(null);
    try {
      const playerInfo = {
        userId: game.getNetworkId(),
        username: game.username,
        hullId: game.currentHull,
        turretId: game.currentTurret,
      };
      const res = await MultiplayerService.createRoom(opts, playerInfo);
      if (res.success && res.room) {
        setServerBrowserOpen(false);
        setModeSelectOpen(false);
        setMapSelectOpen(false);
        setPaused(false);
        setLastMapId(res.room.map_id);
        setLastMatchMode(res.room.mode);
        const isTeam = opts.mode === 'team_deathmatch' || opts.mode === 'capture_point';
        await game.startMultiplayerRound(res.room, true, isTeam ? 'alpha' : null);
      } else {
        if (token === startToken.current) {
          setRoundError(res.error || 'Ошибка создания сервера');
        }
      }
    } catch (err) {
      console.error('[ArmorStrike] createRoom failed:', err);
      if (token === startToken.current) {
        setRoundError('Не удалось создать игровой сервер');
      }
    } finally {
      if (token === startToken.current) {
        setRoundLoading(false);
      }
    }
  }, [game]);

  const goGarage = useCallback(() => {
    if (!game) return;
    void game.leaveMultiplayer();
    setMapSelectOpen(false);
    setModeSelectOpen(false);
    setServerBrowserOpen(false);
    game.setMode('garage');
  }, [game]);

  const goMenu = useCallback(() => {
    if (!game) return;
    void game.leaveMultiplayer();
    setMapSelectOpen(false);
    setModeSelectOpen(false);
    setServerBrowserOpen(false);
    game.setMode('menu');
  }, [game]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!game) return;
      // Mode/map select own Escape / Enter while open.
      if (mapSelectOpen || modeSelectOpen || authModalOpen || questsOpen || serverBrowserOpen) return;
      if (e.code === 'Escape') {
        if (uiMode === 'playing') game.togglePause();
        else if (uiMode === 'garage') goMenu();
      }
      if (e.code === 'KeyM') {
        if (isInteractiveKeyboardTarget(e.target)) return;
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
  }, [game, uiMode, goMenu, openModeSelect, mapSelectOpen, modeSelectOpen, authModalOpen, questsOpen, serverBrowserOpen]);

  const snap: HudSnapshot | null = game ? game.getHud() : null;

  const toggleMute = useCallback(() => {
    if (!game) return;
    const nowMuted = game.toggleMute();
    setMuted(nowMuted);
  }, [game]);

  // H6: кросс-вкладочная синхронизация флага mute: App.muted (PauseMenu)
  // обязан следовать за внешними записями 'as2_muted' (другая вкладка).
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'as2_muted') setMuted(e.newValue === '1');
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const changeCrosshair = useCallback((style: CrosshairStyle) => {
    saveCrosshairStyle(style);
    setCrosshair(style);
  }, []);

  const changeDamageNumbers = useCallback((on: boolean) => {
    saveDamageNumbers(on);
    setDamageNumbers(on);
  }, []);

  const resume = () => {
    if (!game) return;
    game.togglePause();
  };

  const handleClaimStarterPack = useCallback((hullId: HullId, turretId: TurretId) => {
    if (!game) return;
    game.claimStarterPack(hullId, turretId).then(() => {
      setStarterClaimed(true);
    });
  }, [game]);

  if (bootError) {
    return <BootError message={bootError.message} detail={bootError.detail} />;
  }

  const currHull = HULLS[game?.currentHull ?? 'hunter'];
  const currTurret = TURRETS[game?.currentTurret ?? 'railgun'];
  const claimableQuestsCount = game?.quests.filter((q) => q.current >= q.target && !q.claimed).length ?? 0;
  // Во время загрузки раунда режим ещё прежний — прячем меню под оверлей.
  const hideChrome = mapSelectOpen || modeSelectOpen || roundLoading;

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
          onQuests={() => setQuestsOpen(true)}
          onOpenAuth={() => {
            setAuthModalInitialTab('login');
            setAuthModalOpen(true);
          }}
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
          onServerBrowser={() => setServerBrowserOpen(true)}
          onGarage={goGarage}
          onQuests={() => setQuestsOpen(true)}
          onOpenAuth={() => {
            setAuthModalInitialTab('login');
            setAuthModalOpen(true);
          }}
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
          onQuests={() => setQuestsOpen(true)}
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

      {game && !starterClaimed && (
        <StarterPackModal onComplete={handleClaimStarterPack} />
      )}

      {questsOpen && (
        <QuestsModal game={game} onClose={() => setQuestsOpen(false)} />
      )}

      {authModalOpen && (
        <AuthModal
          game={game}
          initialTab={authModalInitialTab}
          onClose={() => setAuthModalOpen(false)}
        />
      )}

      {serverBrowserOpen && (
        <ServerBrowserModal
          username={game?.username ?? 'Боец'}
          onJoinRoom={handleJoinRoom}
          onCreateRoom={handleCreateRoom}
          onQuickMatch={handleQuickMatch}
          onClose={() => setServerBrowserOpen(false)}
        />
      )}

      {roundError && !roundLoading && (
        <div
          className="absolute inset-x-0 top-5 z-50 mx-auto w-fit max-w-[min(20rem,calc(100vw-3rem))] px-4 py-2.5 text-center text-xs tracking-widest text-amber-200 hud-panel"
          role="alert"
        >
          {roundError}
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
