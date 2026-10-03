// @vitest-environment jsdom
// ===== Lifecycle бутстрапа игры (строгая проверка, не source-scan) =====
// 1) StrictMode делает mount → cleanup → mount синхронно: второй прогон boot-эффекта
//    обязан ЗАБРАТЬ тот же инстанс, а не вызвать второй `Game.create` (а значит
//    второй `new THREE.WebGLRenderer({ canvas })` на том же webgl2-контексте
//    плюс второй `gameLoop.start()`).
// 2) Настоящий unmount обязан освобождать инстанс — и в том числе созданный
//    «в полёте», иначе остаётся живой рендерер и игровой цикл.
// 3) Пробный webgl2-контекст обязан отпускаться через WEBGL_lose_context
//    (браузер держит ~16 контекстов на документ, dev/HMR их копит).
import { StrictMode, createRef, type RefObject } from 'react';
import { act, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Dispatch, SetStateAction } from 'react';
import { Game } from '../game/Game';
import type { GameApi } from '../game/GameApi';
import { useGameBootstrap } from '../hooks/useGameBootstrap';
import type { UiModalsAction } from '../hooks/useUiModals';

// Реальный Game тянет WebGL/three — подменяем только фабрику: тест про
// количество созданий, а не про рендер.
vi.mock('../game/Game', () => ({ Game: { create: vi.fn() } }));
vi.mock('../game/auth/authService', () => ({
  AuthService: {
    onAuthStateChange: vi.fn(() => ({ unsubscribe: vi.fn() })),
    getCurrentUser: vi.fn().mockResolvedValue(null),
  },
}));
vi.mock('../game/leaderboard/leaderboardService', () => ({
  LeaderboardService: { submitMatchResult: vi.fn().mockResolvedValue(null) },
}));

const setRoundError: Dispatch<SetStateAction<string | null>> = vi.fn();
const dispatch: Dispatch<UiModalsAction> = vi.fn();

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: Deferred<T>['resolve'];
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

/** Минимум GameApi, который реально трогает boot-эффект. */
function makeGameStub() {
  const dispose = vi.fn();
  const stub = {
    starterPackClaimed: true,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispose,
    setMode: vi.fn(),
    leaveMultiplayer: vi.fn(async () => {}),
  };
  return { stub: stub as unknown as GameApi, dispose };
}

/** jsdom не умеет getContext: ставим заглушку webgl2 с WEBGL_lose_context. */
function installWebgl2Stub() {
  const probed: HTMLCanvasElement[] = [];
  const loseContext = vi.fn();
  const getExtension = vi.fn((name: string) =>
    name === 'WEBGL_lose_context' ? { loseContext } : null,
  );
  const getContext = vi.fn(function stubGetContext(this: HTMLCanvasElement) {
    probed.push(this);
    return { getExtension };
  });
  HTMLCanvasElement.prototype.getContext =
    getContext as unknown as typeof HTMLCanvasElement.prototype.getContext;
  return { getContext, loseContext, probed };
}

function Harness({ canvasRef }: { canvasRef: RefObject<HTMLCanvasElement | null> }) {
  const boot = useGameBootstrap(canvasRef, setRoundError, dispatch);
  return (
    <>
      <canvas ref={canvasRef} />
      <div
        data-testid="boot"
        data-has-game={String(boot.game !== null)}
        data-starter={String(boot.starterClaimed)}
      />
    </>
  );
}

/** Промис-резолвер + ожидание его микротасков внутри act. */
async function resolveInside(
  d: Deferred<Game>,
  value: unknown,
): Promise<void> {
  await act(async () => {
    d.resolve(value as Game);
  });
}

/** Дать отложенному dispose (setTimeout 0) сработать. */
async function flushMacrotask(): Promise<void> {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

let originalGetContext: typeof HTMLCanvasElement.prototype.getContext;

beforeEach(() => {
  vi.clearAllMocks();
  originalGetContext = HTMLCanvasElement.prototype.getContext;
});

afterEach(() => {
  HTMLCanvasElement.prototype.getContext = originalGetContext;
});

describe('bootstrap идемпотентен на одном canvas', () => {
  it('StrictMode: один Game.create, один addListener, инстанс не dispose при remount', async () => {
    const { loseContext } = installWebgl2Stub();
    const create = vi.mocked(Game.create);
    const pending = deferred<Game>();
    const { stub, dispose } = makeGameStub();
    create.mockReturnValue(pending.promise);

    const canvasRef = createRef<HTMLCanvasElement>();
    render(
      <StrictMode>
        <Harness canvasRef={canvasRef} />
      </StrictMode>,
    );

    // Второй прогон эффекта уже стартовал — он обязан был взять тот же слот.
    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0][0]).toBe(canvasRef.current);
    // По одному пробному контексту на прогон эффекта, и каждый отпущен.
    expect(loseContext).toHaveBeenCalledTimes(2);

    await resolveInside(pending, stub);
    expect(screen.getByTestId('boot')).toHaveAttribute('data-has-game', 'true');

    // Строгих инвариантов: один рендерер, один слушатель, ноль dispose.
    expect(create).toHaveBeenCalledTimes(1);
    expect(stub.addListener).toHaveBeenCalledTimes(1);
    expect(dispose).not.toHaveBeenCalled();
  });

  it('настоящий unmount освобождает готовый инстанс', async () => {
    installWebgl2Stub();
    const create = vi.mocked(Game.create);
    const pending = deferred<Game>();
    const { stub, dispose } = makeGameStub();
    create.mockReturnValue(pending.promise);

    const canvasRef = createRef<HTMLCanvasElement>();
    const { unmount } = render(<Harness canvasRef={canvasRef} />);
    await resolveInside(pending, stub);

    unmount();
    await flushMacrotask();

    expect(dispose).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('unmount до резолва create тоже не оставляет живой инстанс', async () => {
    installWebgl2Stub();
    const create = vi.mocked(Game.create);
    const pending = deferred<Game>();
    const { stub, dispose } = makeGameStub();
    create.mockReturnValue(pending.promise);

    const canvasRef = createRef<HTMLCanvasElement>();
    const { unmount } = render(<Harness canvasRef={canvasRef} />);
    unmount();

    await resolveInside(pending, stub);
    await flushMacrotask();

    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it('проба webgl2 не трогает игровой canvas и отпускает свой контекст', async () => {
    const { probed, loseContext } = installWebgl2Stub();
    const create = vi.mocked(Game.create);
    const pending = deferred<Game>();
    const { stub } = makeGameStub();
    create.mockReturnValue(pending.promise);

    const canvasRef = createRef<HTMLCanvasElement>();
    render(<Harness canvasRef={canvasRef} />);

    // Проба берёт ВРЕМЕННЫЙ canvas, игровой остаётся нетронутым (W-1), и её
    // контекст сразу отпускается через WEBGL_lose_context.
    expect(probed).toHaveLength(1);
    expect(probed[0]).not.toBe(canvasRef.current);
    expect(loseContext).toHaveBeenCalledTimes(1);

    await resolveInside(pending, stub);
    expect(stub.addListener).toHaveBeenCalledTimes(1);
  });

  it('без webgl2 игра не стартует и инстанс не создаётся', async () => {
    HTMLCanvasElement.prototype.getContext = (() =>
      null) as unknown as typeof HTMLCanvasElement.prototype.getContext;
    const create = vi.mocked(Game.create);

    const canvasRef = createRef<HTMLCanvasElement>();
    render(<Harness canvasRef={canvasRef} />);

    expect(create).not.toHaveBeenCalled();
    await flushMacrotask();
  });
});