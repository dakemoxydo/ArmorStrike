// @vitest-environment jsdom
// ===== Мультиплеерные модалки: Escape (их не глушит глобальный useAppHotkeys),
// ===== клиентская фильтрация без сетевого шторма и живой путь ошибки/загрузки
// ===== в CreateServerModal. =====
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import ServerBrowserModal from '../components/multiplayer/ServerBrowserModal';
import CreateServerModal from '../components/multiplayer/CreateServerModal';
import PasswordPromptModal from '../components/multiplayer/PasswordPromptModal';
import { MultiplayerService } from '../game/network/multiplayerService';
import type { RoomData } from '../game/network/types';

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    channel: vi.fn(),
    removeChannel: vi.fn(),
  },
}));

function room(over: Partial<RoomData> = {}): RoomData {
  return {
    id: 'room-a',
    name: 'Заводская битва',
    host_id: 'host-1',
    host_name: 'IronCommander',
    mode: 'team_deathmatch',
    map_id: 'factory',
    max_players: 8,
    player_count: 4,
    has_password: false,
    bots_enabled: true,
    status: 'waiting',
    ...over,
  } as RoomData;
}

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function renderBrowser(over: {
  onJoinRoom?: (id: string, pw?: string) => Promise<void>;
  onCreateRoom?: (opts: unknown) => Promise<void>;
  onClose?: () => void;
} = {}) {
  const onJoinRoom = over.onJoinRoom ?? vi.fn(async () => {});
  const onCreateRoom = over.onCreateRoom ?? vi.fn(async () => {});
  const onClose = over.onClose ?? vi.fn();
  const utils = render(
    <ServerBrowserModal
      username="Тестер"
      onJoinRoom={onJoinRoom as (id: string, pw?: string) => Promise<void>}
      onCreateRoom={onCreateRoom as (opts: unknown) => Promise<void>}
      onQuickMatch={vi.fn()}
      onClose={onClose}
    />,
  );
  return { ...utils, onJoinRoom, onCreateRoom, onClose };
}

const BROWSER = 'Список серверов мультиплеера';
const CREATE = 'Создание игрового сервера';
const PASSWORD = 'Вход на защищённый сервер';

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Escape в мультиплеерных модалках', () => {
  it('Escape закрывает браузер серверов', async () => {
    vi.spyOn(MultiplayerService, 'listRooms').mockResolvedValue([room()]);
    const { onClose } = renderBrowser();

    await act(async () => {});
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Escape закрывает форму создания сервера', () => {
    const onCancel = vi.fn();
    render(
      <CreateServerModal defaultUsername="Тестер" onCreate={vi.fn()} onCancel={onCancel} />,
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('Escape закрывает ввод пароля', () => {
    const onCancel = vi.fn();
    render(<PasswordPromptModal roomName="Секрет" onConfirm={vi.fn()} onCancel={onCancel} />);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('Escape в под-диалоге не закрывает браузер серверов (верхний диалог забирает клавишу)', async () => {
    vi.spyOn(MultiplayerService, 'listRooms').mockResolvedValue([
      room({ id: 'room-locked', name: 'Приватный сервер', has_password: true }),
    ]);
    const { onClose } = renderBrowser();

    await act(async () => {});
    fireEvent.click(screen.getByRole('button', { name: 'ВОЙТИ' }));
    expect(screen.getByRole('dialog', { name: PASSWORD })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    // Под-диалог закрылся, браузер остался.
    expect(screen.queryByRole('dialog', { name: PASSWORD })).toBeNull();
    expect(screen.getByRole('dialog', { name: BROWSER })).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();

    // Второй Escape уже свободен для браузера.
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Escape игнорируется, пока форма создания висит на промисе (как disabled X)', async () => {
    const onCancel = vi.fn();
    const pending = deferred<void>();
    render(
      <CreateServerModal
        defaultUsername="Тестер"
        onCreate={() => pending.promise}
        onCancel={onCancel}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /СОЗДАТЬ И НАЧАТЬ/i }));
    expect(screen.getByRole('button', { name: /СОЗДАНИЕ/i })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCancel).not.toHaveBeenCalled();

    await act(async () => {
      pending.resolve();
    });
  });
});

describe('список комнат: фильтрация по загруженным данным', () => {
  it('набор строки поиска не шлёт listRooms, а фильтрует уже пришедшие комнаты', async () => {
    vi.useFakeTimers();
    const spy = vi
      .spyOn(MultiplayerService, 'listRooms')
      .mockResolvedValue([
        room({ id: 'a', name: 'Заводская битва' }),
        room({ id: 'b', name: 'Деревня рейд', map_id: 'village', mode: 'deathmatch' }),
      ]);
    renderBrowser();

    await act(async () => {});
    expect(spy).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Заводская битва')).toBeInTheDocument();

    const input = screen.getByPlaceholderText('Поиск по имени...');
    await act(async () => {
      fireEvent.change(input, { target: { value: 'Де' } });
    });
    // Ни одного запроса на символ: 15 символов = 0 round-trip'ов.
    expect(spy).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Заводская битва')).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(250);
    });
    // Дебаунс прошёл — фильтр применился к тому же загруженному списку.
    expect(spy).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Заводская битва')).toBeNull();
    expect(screen.getByText('Деревня рейд')).toBeInTheDocument();

    // Клики по фильтрам тоже не ходят в сеть.
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'ВСЕ РЕЖИМЫ' }));
      fireEvent.click(screen.getByRole('button', { name: 'ВСЕ КАРТЫ' }));
    });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Деревня рейд')).toBeInTheDocument();

    // Фильтры эквивалентны серверным: hidePassword убирает комнату с паролем.
    await act(async () => {
      fireEvent.click(screen.getByLabelText('Без пароля'));
    });
    expect(screen.getByText('Деревня рейд')).toBeInTheDocument();
  });

  it('фильтры полных/режима/карты применяются к загруженному списку', async () => {
    const spy = vi.spyOn(MultiplayerService, 'listRooms').mockResolvedValue([
      room({ id: 'full', name: 'Полный сервер', player_count: 8, max_players: 8 }),
      room({ id: 'dm', name: 'Одиночный бой', mode: 'deathmatch', map_id: 'city' }),
    ]);
    renderBrowser();
    await act(async () => {});
    expect(spy).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByLabelText('Скрыть полные'));
    expect(screen.queryByText('Полный сервер')).toBeNull();
    expect(screen.getByText('Одиночный бой')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'DM' }));
    expect(screen.getByText('Одиночный бой')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Город' }));
    expect(screen.getByText('Одиночный бой')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Завод' }));
    expect(screen.queryByText('Одиночный бой')).toBeNull();
    expect(screen.getByText('НЕТ ДОСТУПНЫХ СЕРВЕРОВ')).toBeInTheDocument();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('устаревший ответ не перетирает свежий (последний по seq)', async () => {
    vi.useFakeTimers();
    const first = deferred<RoomData[]>();
    const second = deferred<RoomData[]>();
    const spy = vi
      .spyOn(MultiplayerService, 'listRooms')
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    renderBrowser();

    await act(async () => {});
    expect(spy).toHaveBeenCalledTimes(1);

    // Фоновый опрос поднимает второй запрос, пока первый ещё в полёте.
    act(() => {
      vi.advanceTimersByTime(8000);
    });
    expect(spy).toHaveBeenCalledTimes(2);

    await act(async () => {
      second.resolve([room({ id: 'fresh', name: 'Свежий сервер' })]);
    });
    expect(screen.getByText('Свежий сервер')).toBeInTheDocument();

    // Первый (устаревший) резолвится последним — обязан быть проигнорирован.
    await act(async () => {
      first.resolve([room({ id: 'stale', name: 'Устаревший сервер' })]);
    });
    expect(screen.getByText('Свежий сервер')).toBeInTheDocument();
    expect(screen.queryByText('Устаревший сервер')).toBeNull();
  });

  it('запрос, размонтированный в полёте, не пишет в state', async () => {
    const inflight = deferred<RoomData[]>();
    vi.spyOn(MultiplayerService, 'listRooms').mockReturnValue(inflight.promise);
    const { unmount } = renderBrowser();

    await act(async () => {});
    unmount();

    // Поздний ответ после закрытия модалки: ошибок React быть не должно.
    await act(async () => {
      inflight.resolve([room()]);
    });
    expect(screen.queryByRole('dialog', { name: BROWSER })).toBeNull();
  });
});

describe('создание сервера: форма живёт до резолва промиса', () => {
  it('пока промис в полёте — форма на месте (иначе setError бьёт в мёртвый компонент)', async () => {
    vi.spyOn(MultiplayerService, 'listRooms').mockResolvedValue([room()]);
    const pending = deferred<void>();
    const onCreateRoom = vi.fn(() => pending.promise);
    renderBrowser({ onCreateRoom });

    await act(async () => {});
    fireEvent.click(screen.getByRole('button', { name: /СОЗДАТЬ СЕРВЕР/i }));
    expect(screen.getByRole('dialog', { name: CREATE })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /СОЗДАТЬ И НАЧАТЬ/i }));
    expect(onCreateRoom).toHaveBeenCalledTimes(1);
    // Не размонтировались: спиннер и форма ещё здесь.
    expect(screen.getByRole('dialog', { name: CREATE })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /СОЗДАНИЕ/i })).toBeInTheDocument();

    await act(async () => {
      pending.resolve();
    });
    // Успех — форма закрывается.
    expect(screen.queryByRole('dialog', { name: CREATE })).toBeNull();
  });

  it('reject от onCreate держит форму открытой и показывает role="alert"', async () => {
    vi.spyOn(MultiplayerService, 'listRooms').mockResolvedValue([room()]);
    const onCreateRoom = vi
      .fn()
      .mockRejectedValue(new Error('комната уже существует'));
    renderBrowser({ onCreateRoom });

    await act(async () => {});
    fireEvent.click(screen.getByRole('button', { name: /СОЗДАТЬ СЕРВЕР/i }));
    fireEvent.click(screen.getByRole('button', { name: /СОЗДАТЬ И НАЧАТЬ/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('комната уже существует');
    expect(screen.getByRole('dialog', { name: CREATE })).toBeInTheDocument();
    // Кнопка снова активна — можно повторить попытку.
    expect(screen.getByRole('button', { name: /СОЗДАТЬ И НАЧАТЬ/i })).toBeEnabled();
  });

  it('пустое имя сервера валидируется без обращения к сети', async () => {
    const onCreate = vi.fn();
    render(
      <CreateServerModal defaultUsername="Тестер" onCreate={onCreate} onCancel={vi.fn()} />,
    );

    fireEvent.change(screen.getByPlaceholderText('Название сервера...'), {
      target: { value: '   ' },
    });
    fireEvent.click(screen.getByRole('button', { name: /СОЗДАТЬ И НАЧАТЬ/i }));

    expect(screen.getByRole('alert')).toHaveTextContent('Укажите название сервера');
    expect(onCreate).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByRole('dialog', { name: CREATE })).toBeInTheDocument());
  });
});