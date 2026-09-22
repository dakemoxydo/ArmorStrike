// @vitest-environment jsdom
// ===== Поведенческие тесты App-flow хуков (пункт 3 аудита): H5-гонки,
// ===== M13b auto-hide, H6 mute-sync, горячие клавиши. Вместо source-scan. =====
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, renderHook } from '@testing-library/react';
import type { Dispatch, SetStateAction } from 'react';
import type { GameApi } from '../game/GameApi';
import type { UiModalsAction } from '../hooks/useUiModals';
import { useRoundState, useRoundFlow, type RoundState } from '../hooks/useRoundFlow';
import { useAppSettings } from '../hooks/useAppSettings';
import { useAppHotkeys } from '../hooks/useAppHotkeys';
import { MultiplayerService } from '../game/network/multiplayerService';

vi.mock('../game/network/multiplayerService', () => ({
  MultiplayerService: {
    quickMatch: vi.fn(),
    joinRoom: vi.fn(),
    createRoom: vi.fn(),
  },
}));

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
}

function deferred<T = void>(): Deferred<T> {
  let resolve!: Deferred<T>['resolve'];
  let reject!: Deferred<T>['reject'];
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

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
    togglePause: vi.fn(),
    toggleMute: vi.fn(() => true),
    setMatchMode: vi.fn(),
    setMode: vi.fn(),
    leaveMultiplayer: vi.fn(async () => {}),
    startMultiplayerRound: vi.fn(async () => {}),
    ...overrides,
  } as unknown as GameApi;
}

function setupRoundFlow(game: GameApi) {
  const dispatch = vi.fn();
  const setPaused = vi.fn();
  return renderHook(() => {
    const round = useRoundState();
    const flow = useRoundFlow({
      game,
      round,
      setPaused: setPaused as Dispatch<SetStateAction<boolean>>,
      dispatch: dispatch as Dispatch<UiModalsAction>,
    });
    return { round, flow };
  });
}

describe('H5: startRound race (behavioral)', () => {
  let errSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errSpy.mockRestore();
  });

  it('stale rejected start cannot post an error toast or clear the fresh ЗАГРУЗКА', async () => {
    const first = deferred();
    const second = deferred();
    const game = makeGame({
      startRound: vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise),
    });
    const { result } = setupRoundFlow(game);

    // Дабл-клик «В БОЙ»: второй старт вытесняет первый.
    act(() => {
      result.current.flow.confirmMap('village');
    });
    act(() => {
      result.current.flow.confirmMap('city');
    });
    expect(result.current.round.roundLoading).toBe(true);

    // Вытесненный старт падает — не должен трогать ни флаг, ни ошибку.
    await act(async () => {
      first.reject(new Error('stale startRound'));
    });
    expect(result.current.round.roundError).toBeNull();
    expect(result.current.round.roundLoading).toBe(true);

    // Свежий старт завершается — только он снимает загрузку.
    await act(async () => {
      second.resolve();
    });
    expect(result.current.round.roundLoading).toBe(false);
    expect(result.current.round.roundError).toBeNull();
    expect(result.current.round.roundLoading).toBe(false);
    expect((game.startRound as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(2);
  });

  it('single failing start posts the visible error once and clears loading', async () => {
    const boom = deferred();
    const game = makeGame({ startRound: vi.fn().mockReturnValueOnce(boom.promise) });
    const { result } = setupRoundFlow(game);

    act(() => {
      result.current.flow.confirmMap('factory');
    });
    expect(result.current.round.roundLoading).toBe(true);

    await act(async () => {
      boom.reject(new Error('webgl lost'));
    });
    expect(result.current.round.roundError).toBe('Не удалось начать раунд. Попробуйте ещё раз.');
    expect(result.current.round.roundLoading).toBe(false);
  });

  it('cross-flow: stale quickMatch failure cannot kill the fresh SP ЗАГРУЗКА (MP vs SP token)', async () => {
    const quick = deferred();
    const start = deferred();
    vi.mocked(MultiplayerService.quickMatch).mockReturnValueOnce(
      quick.promise as unknown as ReturnType<typeof MultiplayerService.quickMatch>,
    );
    const game = makeGame({ startRound: vi.fn().mockReturnValueOnce(start.promise) });
    const { result } = setupRoundFlow(game);

    act(() => {
      void result.current.flow.handleQuickMatch();
    });
    expect(result.current.round.roundLoading).toBe(true);

    // Пока MP-подбор висит, игрок прошёл ModeSelect → MapSelect → старт (SP).
    act(() => {
      result.current.flow.confirmMap('factory');
    });

    await act(async () => {
      quick.reject(new Error('нет свободных серверов'));
    });
    // Ошибка MP вытесненного — не показывается и спиннер не гасит.
    expect(result.current.round.roundError).toBeNull();
    expect(result.current.round.roundLoading).toBe(true);

    await act(async () => {
      start.resolve();
    });
    expect(result.current.round.roundLoading).toBe(false);
    expect(result.current.round.roundError).toBeNull();
  });

  it('quickMatch failure while still current posts the MP error and clears loading', async () => {
    const quick = deferred();
    vi.mocked(MultiplayerService.quickMatch).mockReturnValueOnce(
      quick.promise as unknown as ReturnType<typeof MultiplayerService.quickMatch>,
    );
    const game = makeGame();
    const { result } = setupRoundFlow(game);

    act(() => {
      void result.current.flow.handleQuickMatch();
    });
    expect(result.current.round.roundLoading).toBe(true);

    await act(async () => {
      quick.reject(new Error('down'));
    });
    expect(result.current.round.roundError).toBe('Ошибка поиска сетевой игры');
    expect(result.current.round.roundLoading).toBe(false);
  });
});

describe('M13b: roundError auto-hides after 4s (behavioral)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('visible toast clears itself on the 4s timer', () => {
    const { result } = renderHook(() => useRoundState());

    act(() => {
      result.current.setRoundError('Хост покинул игру. Сервер остановлен.');
    });
    expect(result.current.roundError).toBe('Хост покинул игру. Сервер остановлен.');

    act(() => {
      vi.advanceTimersByTime(3999);
    });
    expect(result.current.roundError).not.toBeNull();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.roundError).toBeNull();
  });
});

describe('H6: mute single source (behavioral)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('toggleMute follows the game.toggleMute return value', () => {
    const game = makeGame({ toggleMute: vi.fn(() => true) });
    const { result } = renderHook(() => useAppSettings(game));

    expect(result.current.muted).toBe(false);
    act(() => {
      result.current.toggleMute();
    });
    expect(game.toggleMute).toHaveBeenCalledTimes(1);
    expect(result.current.muted).toBe(true);
  });

  it('cross-tab as2_muted storage writes sync muted state; foreign keys ignored', () => {
    const game = makeGame();
    const { result } = renderHook(() => useAppSettings(game));
    expect(result.current.muted).toBe(false);

    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'as2_muted', newValue: '1' }));
    });
    expect(result.current.muted).toBe(true);

    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'as2_muted', newValue: '0' }));
    });
    expect(result.current.muted).toBe(false);

    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'as2_other', newValue: '1' }));
    });
    expect(result.current.muted).toBe(false);
  });
});

describe('hotkeys (behavioral)', () => {
  interface HotkeyResult {
    game: GameApi;
    onToggleMute: ReturnType<typeof vi.fn>;
    openModeSelect: ReturnType<typeof vi.fn>;
    goMenu: ReturnType<typeof vi.fn>;
  }

  function setupHotkeys(opts: {
    uiMode?: 'menu' | 'garage' | 'playing' | 'over';
    authModalOpen?: boolean;
    mapSelectOpen?: boolean;
    questsOpen?: boolean;
    serverBrowserOpen?: boolean;
  } = {}): HotkeyResult {
    const game = makeGame();
    const onToggleMute = vi.fn();
    const openModeSelect = vi.fn();
    const goMenu = vi.fn();
    renderHook(() =>
      useAppHotkeys({
        game,
        uiMode: opts.uiMode ?? 'playing',
        mapSelectOpen: opts.mapSelectOpen ?? false,
        modeSelectOpen: false,
        authModalOpen: opts.authModalOpen ?? false,
        questsOpen: opts.questsOpen ?? false,
        serverBrowserOpen: opts.serverBrowserOpen ?? false,
        goMenu,
        openModeSelect,
        onToggleMute,
      }),
    );
    return { game, onToggleMute, openModeSelect, goMenu };
  }

  it('Escape in playing toggles pause', () => {
    const { game } = setupHotkeys({ uiMode: 'playing' });
    fireEvent.keyDown(window, { code: 'Escape' });
    expect(game.togglePause).toHaveBeenCalledTimes(1);
  });

  it('Escape in garage navigates to menu', () => {
    const { game, goMenu } = setupHotkeys({ uiMode: 'garage' });
    fireEvent.keyDown(window, { code: 'Escape' });
    expect(game.togglePause).not.toHaveBeenCalled();
    expect(goMenu).toHaveBeenCalledTimes(1);
  });

  it('Escape/KeyM are ignored while a modal (auth/quests/browser/map) is open', () => {
    for (const opts of [
      { authModalOpen: true },
      { questsOpen: true },
      { serverBrowserOpen: true },
      { mapSelectOpen: true },
    ]) {
      const { game, onToggleMute } = setupHotkeys({ uiMode: 'playing', ...opts });
      fireEvent.keyDown(window, { code: 'Escape' });
      fireEvent.keyDown(window, { code: 'KeyM' });
      expect(game.togglePause).not.toHaveBeenCalled();
      expect(onToggleMute).not.toHaveBeenCalled();
    }
  });

  it('KeyM routes to onToggleMute; ignored when focus is in a text input', () => {
    const { onToggleMute } = setupHotkeys({ uiMode: 'playing' });
    fireEvent.keyDown(window, { code: 'KeyM' });
    expect(onToggleMute).toHaveBeenCalledTimes(1);

    const input = document.createElement('input');
    document.body.appendChild(input);
    fireEvent.keyDown(input, { code: 'KeyM' });
    expect(onToggleMute).toHaveBeenCalledTimes(1);
    input.remove();
  });

  it('Enter in menu opens mode select; ignored when a button owns the key', () => {
    const { openModeSelect } = setupHotkeys({ uiMode: 'menu' });
    fireEvent.keyDown(window, { code: 'Enter' });
    expect(openModeSelect).toHaveBeenCalledTimes(1);

    const btn = document.createElement('button');
    document.body.appendChild(btn);
    fireEvent.keyDown(btn, { code: 'Enter' });
    expect(openModeSelect).toHaveBeenCalledTimes(1);
    btn.remove();
  });
});

describe('round flow wiring (behavioral)', () => {
  it('confirmMode closes mode select and opens map select via dispatch', () => {
    const dispatch = vi.fn();
    const round = { setRoundLoading: vi.fn(), setRoundError: vi.fn() } as unknown as RoundState;
    const game = makeGame();
    const { result } = renderHook(() =>
      useRoundFlow({
        game,
        round,
        setPaused: vi.fn() as Dispatch<SetStateAction<boolean>>,
        dispatch: dispatch as Dispatch<UiModalsAction>,
      }),
    );

    act(() => {
      result.current.confirmMode('team_deathmatch');
    });
    expect(game.setMatchMode).toHaveBeenCalledWith('team_deathmatch');
    expect(dispatch).toHaveBeenCalledWith({ type: 'openMapSelect' });

    act(() => {
      result.current.cancelModeSelect();
    });
    expect(dispatch).toHaveBeenCalledWith({ type: 'closeModeSelect' });
  });

  it('rematch leaves multiplayer and restarts on the last map', async () => {
    const game = makeGame({ isMultiplayer: true, startRound: vi.fn(async () => {}) });
    const round = { setRoundLoading: vi.fn(), setRoundError: vi.fn() } as unknown as RoundState;
    const dispatch = vi.fn();
    const { result } = renderHook(() =>
      useRoundFlow({
        game,
        round,
        setPaused: vi.fn() as Dispatch<SetStateAction<boolean>>,
        dispatch: dispatch as Dispatch<UiModalsAction>,
      }),
    );

    act(() => {
      result.current.confirmMap('city');
    });
    await act(async () => {});
    expect(game.startRound).toHaveBeenCalledWith('city');

    act(() => {
      result.current.rematch();
    });
    await act(async () => {});
    expect(game.leaveMultiplayer).toHaveBeenCalled();
    expect(game.startRound).toHaveBeenCalledWith('city');
    expect(dispatch).toHaveBeenCalledWith({ type: 'closeMapSelect' });
  });
});
