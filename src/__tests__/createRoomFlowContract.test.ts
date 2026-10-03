// @vitest-environment jsdom
// ===== Контракт провала создания комнаты (useRoundFlow.handleCreateRoom).
// ===== Форма создания живёт весь промис и показывает ошибку у себя, поэтому
// ===== хендлер обязан пробрасывать reject — иначе модалка закрывается как при
// ===== успехе. H5-гейт по startToken при этом сохранён: вытесненная попытка не
// ===== пишет тост и не гасит свежую «ЗАГРУЗКА». =====
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { Dispatch, SetStateAction } from 'react';
import type { GameApi } from '../game/GameApi';
import type { UiModalsAction } from '../hooks/useUiModals';
import { useRoundFlow, useRoundState } from '../hooks/useRoundFlow';
import { MultiplayerService } from '../game/network/multiplayerService';
import type { CreateRoomOptions, RoomData } from '../game/network/types';

vi.mock('../game/network/multiplayerService', () => ({
  MultiplayerService: {
    quickMatch: vi.fn(),
    joinRoom: vi.fn(),
    createRoom: vi.fn(),
  },
}));

type CreateRoomResult = Awaited<ReturnType<typeof MultiplayerService.createRoom>>;

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: Deferred<T>['resolve'];
  let reject!: Deferred<T>['reject'];
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function room(over: Partial<RoomData> = {}): RoomData {
  return {
    id: 'room-a',
    name: 'Заводская битва',
    host_id: 'host-1',
    host_name: 'Тестер',
    mode: 'team_deathmatch',
    map_id: 'factory',
    max_players: 8,
    player_count: 0,
    has_password: false,
    bots_enabled: true,
    status: 'waiting',
    ...over,
  } as RoomData;
}

const OPTS: CreateRoomOptions = {
  name: 'Заводская битва',
  mode: 'team_deathmatch',
  map_id: 'factory',
  max_players: 8,
  bots_enabled: true,
};

function makeGame(overrides: Partial<Record<string, unknown>> = {}): GameApi {
  return {
    currentHull: 'hunter',
    currentTurret: 'railgun',
    currentMatchMode: 'deathmatch',
    currentMapId: 'factory',
    username: 'Тестер',
    isMultiplayer: false,
    credits: 0,
    quests: [],
    getNetworkId: () => 'net-test',
    startRound: vi.fn(async () => {}),
    setMatchMode: vi.fn(),
    setMode: vi.fn(),
    leaveMultiplayer: vi.fn(async () => {}),
    startMultiplayerRound: vi.fn(async () => {}),
    ...overrides,
  } as unknown as GameApi;
}

/**
 * Реальный round-state (иначе не увидеть ни флага загрузки, ни тоста) +
 * обёртка над setRoundError, чтобы дополнительно проверить сам вызов.
 */
function setup(game: GameApi) {
  const dispatch = vi.fn();
  const setPaused = vi.fn();
  const setRoundError = vi.fn();
  const { result } = renderHook(() => {
    const round = useRoundState();
    const flow = useRoundFlow({
      game,
      round: {
        ...round,
        setRoundError: (value: SetStateAction<string | null>) => {
          setRoundError(value);
          round.setRoundError(value);
        },
      },
      setPaused: setPaused as Dispatch<SetStateAction<boolean>>,
      dispatch: dispatch as Dispatch<UiModalsAction>,
    });
    return { round, flow };
  });
  return { result, dispatch, setPaused, setRoundError };
}

/** Исход submit'а формы: успех → модалка закрыта, провал → форма жива с текстом. */
async function submitLikeCreateModal(
  create: () => Promise<void>,
): Promise<{ closed: boolean; error: string | null }> {
  let closed = false;
  let error: string | null = null;
  try {
    await create();
    closed = true;
  } catch (err) {
    error = err instanceof Error ? err.message : 'Ошибка создания сервера';
  }
  return { closed, error };
}

let errSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  // logError из catch-ветки печатает в stderr — глушим, чтобы не шумел прогон.
  errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  errSpy.mockRestore();
});

describe('handleCreateRoom: успех', () => {
  it('резолвит и уводит игрока в матч хоста', async () => {
    vi.mocked(MultiplayerService.createRoom).mockResolvedValue({
      success: true,
      room: room(),
    });
    const game = makeGame();
    const { result, dispatch } = setup(game);

    await act(async () => {
      await expect(result.current.flow.handleCreateRoom(OPTS)).resolves.toBeUndefined();
    });

    expect(MultiplayerService.createRoom).toHaveBeenCalledWith(OPTS, {
      userId: 'net-test',
      username: 'Тестер',
      hullId: 'hunter',
      turretId: 'railgun',
    });
    expect(game.startMultiplayerRound).toHaveBeenCalledWith(room(), true, 'alpha');
    expect(dispatch).toHaveBeenCalledWith({ type: 'closeServerBrowser' });
    expect(result.current.round.roundLoading).toBe(false);
    expect(result.current.round.roundError).toBeNull();
  });
});

describe('handleCreateRoom: провал', () => {
  it('отклоняется с текстом сервера и параллельно пишет его в тост', async () => {
    vi.mocked(MultiplayerService.createRoom).mockResolvedValue({
      success: false,
      error: 'комната уже существует',
    });
    const { result, setRoundError } = setup(makeGame());

    let rejected = false;
    let message: string | null = null;
    await act(async () => {
      try {
        await result.current.flow.handleCreateRoom(OPTS);
      } catch (err) {
        rejected = true;
        message = err instanceof Error ? err.message : null;
      }
    });

    expect(rejected).toBe(true);
    expect(message).toBe('комната уже существует');
    // Тост остаётся страховкой (например, браузер размонтирован в полёте) —
    // но вызывающая сторона теперь тоже знает исход.
    expect(setRoundError).toHaveBeenCalledWith('комната уже существует');
    expect(result.current.round.roundError).toBe('комната уже существует');
    expect(result.current.round.roundLoading).toBe(false);
  });

  it('исключение сервиса даёт обобщённый русский текст, тоже через reject', async () => {
    vi.mocked(MultiplayerService.createRoom).mockRejectedValue(new Error('Failed to fetch'));
    const { result, setRoundError } = setup(makeGame());

    let message: string | null = null;
    await act(async () => {
      try {
        await result.current.flow.handleCreateRoom(OPTS);
      } catch (err) {
        message = err instanceof Error ? err.message : null;
      }
    });

    // Сырой текст сетевой ошибки игроку не показываем.
    expect(message).toBe('Не удалось создать игровой сервер');
    expect(setRoundError).toHaveBeenCalledWith('Не удалось создать игровой сервер');
  });

  it('падение startMultiplayerRound тоже честно отклоняется', async () => {
    vi.mocked(MultiplayerService.createRoom).mockResolvedValue({
      success: true,
      room: room(),
    });
    const game = makeGame({
      startMultiplayerRound: vi.fn(async () => {
        throw new Error('webgl lost');
      }),
    });
    const { result } = setup(game);

    let rejected = false;
    await act(async () => {
      try {
        await result.current.flow.handleCreateRoom(OPTS);
      } catch {
        rejected = true;
      }
    });

    expect(rejected).toBe(true);
    expect(result.current.round.roundError).toBe('Не удалось создать игровой сервер');
  });
});

describe('handleCreateRoom: H5-гейт по startToken', () => {
  it('вытесненная попытка не пишет тост и не гасит свежую ЗАГРУЗКА, но отклоняется', async () => {
    const first = deferred<CreateRoomResult>();
    const second = deferred<CreateRoomResult>();
    vi.mocked(MultiplayerService.createRoom)
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const { result, setRoundError } = setup(makeGame());

    // Дабл-клик «СОЗДАТЬ И НАЧАТЬ»: вторая попытка вытесняет первую.
    let staleMessage: string | null = null;
    act(() => {
      void result.current.flow.handleCreateRoom(OPTS).catch((err: unknown) => {
        staleMessage = err instanceof Error ? err.message : null;
      });
    });
    act(() => {
      void result.current.flow.handleCreateRoom(OPTS).catch(() => {});
    });
    expect(result.current.round.roundLoading).toBe(true);

    await act(async () => {
      first.reject(new Error('устаревшая попытка'));
    });

    // Тост и флаг загрузки принадлежат свежей попытке — вытесненная их не трогает.
    expect(result.current.round.roundError).toBeNull();
    expect(result.current.round.roundLoading).toBe(true);
    expect(setRoundError).not.toHaveBeenCalledWith('Не удалось создать игровой сервер');
    // …но промис всё равно отклонён: иначе форма закрылась бы на чужом провале.
    expect(staleMessage).toBe('Не удалось создать игровой сервер');

    await act(async () => {
      second.resolve({ success: true, room: room() });
    });
    expect(result.current.round.roundLoading).toBe(false);
    expect(result.current.round.roundError).toBeNull();
  });
});

describe('вызывающая сторона различает успех и провал', () => {
  it('onCreate закрывает форму по успеху и держит её с ошибкой по reject', async () => {
    vi.mocked(MultiplayerService.createRoom)
      .mockResolvedValueOnce({ success: true, room: room() })
      .mockResolvedValueOnce({ success: false, error: 'нет свободных мест' });
    const { result } = setup(makeGame());

    let okOutcome: { closed: boolean; error: string | null } | null = null;
    await act(async () => {
      okOutcome = await submitLikeCreateModal(() => result.current.flow.handleCreateRoom(OPTS));
    });
    expect(okOutcome).toEqual({ closed: true, error: null });

    let failOutcome: { closed: boolean; error: string | null } | null = null;
    await act(async () => {
      failOutcome = await submitLikeCreateModal(() => result.current.flow.handleCreateRoom(OPTS));
    });
    expect(failOutcome).toEqual({ closed: false, error: 'нет свободных мест' });
    expect(result.current.round.roundError).toBe('нет свободных мест');
  });
});