import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from 'react';
import { Game } from '../game/Game';
import type { GameApi } from '../game/GameApi';
import type { GameMode, MatchEndReason, MatchModeId, TeamId } from '../game/types';
import type { MatchRewards } from '../game/economy/matchRewards';
import type { HullId, TurretId } from '../core/catalog';
import { AuthService } from '../game/auth/authService';
import {
  LeaderboardService,
  type LeaderboardSubmitResult,
} from '../game/leaderboard/leaderboardService';
import type { UiModalsAction } from './useUiModals';

export interface FinalStats {
  score: number;
  kills: number;
  deaths: number;
  bestStreak: number;
  playerWon: boolean;
  winnerName: string | null;
  winnerTeam: TeamId;
  reason: MatchEndReason;
  mode: MatchModeId;
  matchTimeSec: number;
  teamKills: { alpha: number; bravo: number };
  teamScore: { alpha: number; bravo: number };
  rewards: MatchRewards | undefined;
}

export interface BootstrapResult {
  game: GameApi | null;
  bootError: { message: string; detail?: string } | null;
  uiMode: GameMode;
  paused: boolean;
  finalStats: FinalStats;
  starterClaimed: boolean;
  /** Bump-счётчик garageChanged: держит derived-значения (кредиты/квесты) свежими. */
  economyVersion: number;
  /** L3: статус авто-отправки рекорда в глобальный лидерборд (null — ещё не было). */
  leaderboardSubmit: LeaderboardSubmitResult | 'pending' | null;
  setPaused: Dispatch<SetStateAction<boolean>>;
  claimStarterPack: (hullId: HullId, turretId: TurretId) => void;
}

const initialFinalStats: FinalStats = {
  score: 0,
  kills: 0,
  deaths: 0,
  bestStreak: 0,
  playerWon: false,
  winnerName: null,
  winnerTeam: null,
  reason: 'score',
  mode: 'deathmatch',
  matchTimeSec: 0,
  teamKills: { alpha: 0, bravo: 0 },
  teamScore: { alpha: 0, bravo: 0 },
  rewards: undefined,
};

/**
 * Boot: Game.create awaits async tank mesh / systems; listeners are safe pre/post ready.
 * Owns engine lifecycle, auth-cloud sync, and mode/pause/finalStats/starter state.
 * `setRoundError` и `dispatch` приходят снаружи: round-state живёт раньше
 * bootstrap'а (useRoundState), модалки — в useUiModals.
 */
export function useGameBootstrap(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  setRoundError: Dispatch<SetStateAction<string | null>>,
  dispatch: Dispatch<UiModalsAction>,
): BootstrapResult {
  const [game, setGame] = useState<GameApi | null>(null);
  const [bootError, setBootError] = useState<{ message: string; detail?: string } | null>(null);
  const [uiMode, setUiMode] = useState<GameMode>('menu');
  const [paused, setPaused] = useState(false);
  const [finalStats, setFinalStats] = useState<FinalStats>(initialFinalStats);
  const [starterClaimed, setStarterClaimed] = useState(true);
  const [economyVersion, setEconomyVersion] = useState(0);
  const [leaderboardSubmit, setLeaderboardSubmit] = useState<
    LeaderboardSubmitResult | 'pending' | null
  >(null);
  /** Моно-токен: поздний ответ по прошлому матчу не перетирает свежий статус. */
  const leaderboardToken = useRef(0);
  const roundErrorRef = useRef(setRoundError);
  roundErrorRef.current = setRoundError;

  // Boot effect
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
            // L3: авто-запись рекорда один раз на gameOver-ивент (не на mount
            // React — StrictMode не должен дублировать отправку).
            const token = ++leaderboardToken.current;
            setLeaderboardSubmit('pending');
            void LeaderboardService.submitMatchResult({
              score: e.score,
              kills: e.kills,
              deaths: e.deaths,
              bestStreak: e.bestStreak,
              mode: e.mode,
              matchTimeSec: e.matchTimeSec,
            }).then((result) => {
              if (token === leaderboardToken.current) {
                setLeaderboardSubmit(result);
              }
            });
          }
          if (e.type === 'pauseChanged') setPaused(e.value);
          if (e.type === 'garageChanged') {
            setStarterClaimed(instance.starterPackClaimed);
            setEconomyVersion((v) => v + 1);
          }
          if (e.type === 'hostDisconnected') {
            void instance.leaveMultiplayer();
            instance.setMode('menu');
            roundErrorRef.current('Хост покинул игру. Сервер остановлен.');
            setPaused(false);
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
  }, [canvasRef]);

  // Слушатель изменения состояния авторизации Supabase
  useEffect(() => {
    const sub = AuthService.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        dispatch({ type: 'openAuth', tab: 'reset_password' });
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
  }, [game, dispatch]);

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

  const claimStarterPack = useCallback((hullId: HullId, turretId: TurretId) => {
    if (!game) return;
    game.claimStarterPack(hullId, turretId).then(() => {
      setStarterClaimed(true);
    });
  }, [game]);

  return {
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
  };
}
