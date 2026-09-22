import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import type { GameApi } from '../game/GameApi';
import type { MapId } from '../game/maps/mapCatalog';
import { DEFAULT_MAP_ID } from '../game/maps/mapCatalog';
import type { MatchModeId } from '../game/types';
import { MultiplayerService } from '../game/network/multiplayerService';
import type { CreateRoomOptions } from '../game/network/types';
import type { UiModalsAction } from './useUiModals';

/**
 * Флаги загрузки/ошибки раунда живут отдельно от flow-callback'ов: boot-хуку
 * нужен setRoundError (hostDisconnected) раньше, чем существует game.
 * M13b: видимая ошибка самоскрывается через 4 с.
 */
export function useRoundState() {
  const [roundLoading, setRoundLoading] = useState(false);
  const [roundError, setRoundError] = useState<string | null>(null);

  useEffect(() => {
    if (!roundError) return;
    const timer = setTimeout(() => setRoundError(null), 4000);
    return () => clearTimeout(timer);
  }, [roundError]);

  return { roundLoading, roundError, setRoundLoading, setRoundError };
}

export type RoundState = ReturnType<typeof useRoundState>;

export interface RoundFlowDeps {
  game: GameApi | null;
  round: RoundState;
  setPaused: Dispatch<SetStateAction<boolean>>;
  dispatch: Dispatch<UiModalsAction>;
}

export interface RoundFlowResult {
  lastMapId: MapId;
  lastMatchMode: MatchModeId;
  openModeSelect: () => void;
  confirmMode: (mode: MatchModeId) => void;
  cancelModeSelect: () => void;
  confirmMap: (mapId: MapId) => void;
  cancelMapSelect: () => void;
  rematch: () => void;
  handleQuickMatch: () => Promise<void>;
  handleJoinRoom: (roomId: string, password?: string) => Promise<void>;
  handleCreateRoom: (opts: CreateRoomOptions) => Promise<void>;
  goGarage: () => void;
  goMenu: () => void;
}

/**
 * Flow: ModeSelect → MapSelect → startRound. MP handlers, garage/menu
 * navigation; startToken race guard (H5) на всех стартах.
 */
export function useRoundFlow(deps: RoundFlowDeps): RoundFlowResult {
  const { game, setPaused, dispatch } = deps;
  const { setRoundLoading, setRoundError } = deps.round;

  const [lastMapId, setLastMapId] = useState<MapId>(DEFAULT_MAP_ID);
  const [lastMatchMode, setLastMatchMode] = useState<MatchModeId>('deathmatch');
  const startToken = useRef(0);

  /** Единая точка старта: держит индикатор загрузки и глотает гонку stale-старта. */
  // H5: startRound вытесняется новым (дабл-клик «В БОЙ»/«БЫСТРАЯ ИГРА») и
  // резолвится досрочно — без токена stale-вызов гасил «ЗАГРУЗКА» посреди
  // перестройки нового раунда и показывал тост ошибки при успешном старте.
  const runStartRound = useCallback(async (g: GameApi, mapId: MapId) => {
    const token = ++startToken.current;
    setRoundLoading(true);
    setRoundError(null);
    try {
      await g.startRound(mapId);
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
  }, [setRoundLoading, setRoundError]);

  const openModeSelect = useCallback(() => {
    if (!game) return;
    dispatch({ type: 'openModeSelect' });
  }, [game, dispatch]);

  const confirmMode = useCallback((mode: MatchModeId) => {
    if (!game) return;
    setLastMatchMode(mode);
    game.setMatchMode(mode);
    dispatch({ type: 'openMapSelect' });
  }, [game, dispatch]);

  const cancelModeSelect = useCallback(() => {
    dispatch({ type: 'closeModeSelect' });
  }, [dispatch]);

  const confirmMap = useCallback((mapId: MapId) => {
    if (!game) return;
    setLastMapId(mapId);
    dispatch({ type: 'closeMapSelect' });
    dispatch({ type: 'closeModeSelect' });
    // Leaving pause/over UI before round starts.
    setPaused(false);
    void runStartRound(game, mapId);
  }, [game, dispatch, setPaused, runStartRound]);

  const cancelMapSelect = useCallback(() => {
    // Back to mode select when leaving map picker mid-setup.
    dispatch({ type: 'openModeSelect' });
  }, [dispatch]);

  /** Same mode + last map — skip ModeSelect (P6 rematch). */
  const rematch = useCallback(() => {
    if (!game) return;
    dispatch({ type: 'closeModeSelect' });
    dispatch({ type: 'closeMapSelect' });
    setPaused(false);
    void (async () => {
      if (game.isMultiplayer) await game.leaveMultiplayer();
      await runStartRound(game, lastMapId);
    })();
  }, [game, lastMapId, dispatch, setPaused, runStartRound]);

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
        dispatch({ type: 'closeServerBrowser' });
        dispatch({ type: 'closeModeSelect' });
        dispatch({ type: 'closeMapSelect' });
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
  }, [game, dispatch, setPaused, setRoundLoading, setRoundError]);

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
        dispatch({ type: 'closeServerBrowser' });
        dispatch({ type: 'closeModeSelect' });
        dispatch({ type: 'closeMapSelect' });
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
  }, [game, dispatch, setPaused, setRoundLoading, setRoundError]);

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
        dispatch({ type: 'closeServerBrowser' });
        dispatch({ type: 'closeModeSelect' });
        dispatch({ type: 'closeMapSelect' });
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
  }, [game, dispatch, setPaused, setRoundLoading, setRoundError]);

  const goGarage = useCallback(() => {
    if (!game) return;
    void game.leaveMultiplayer();
    dispatch({ type: 'closeMapSelect' });
    dispatch({ type: 'closeModeSelect' });
    dispatch({ type: 'closeServerBrowser' });
    game.setMode('garage');
  }, [game, dispatch]);

  const goMenu = useCallback(() => {
    if (!game) return;
    void game.leaveMultiplayer();
    dispatch({ type: 'closeMapSelect' });
    dispatch({ type: 'closeModeSelect' });
    dispatch({ type: 'closeServerBrowser' });
    game.setMode('menu');
  }, [game, dispatch]);

  return {
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
  };
}
