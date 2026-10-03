// @vitest-environment jsdom
// ===== Загрузка облачного профиля: идемпотентность + токен поколения =====
// Вход дёргает `Game.loadCloudProfile` из двух мест сразу (AuthModal и
// подписка useGameBootstrap на `SIGNED_IN`), поэтому два параллельных вызова
// не должны дать два SELECT профиля, два `applyProfileToRunState` и два
// `garageChanged`. Плюс: поздний ответ по прошлому аккаунту не применяется, а
// выход из аккаунта не открывает заново стартовый флоу.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Game } from '../game/Game';
import { RunState } from '../game/RunState';
import { bootstrapGame } from '../game/GameBootstrap';
import type { GameContext } from '../game/GameBootstrap';
import {
  CloudSaveService,
  type CloudProfile,
  type LoadProfileResult,
} from '../game/auth/cloudSaveService';
import type { GameEvent } from '../game/types';

// Реальный bootstrapGame тянет three/WebGL — подменяем его, тест про
// логику загрузки профиля, а не про рендер.
vi.mock('../game/GameBootstrap', () => ({ bootstrapGame: vi.fn() }));
vi.mock('../lib/supabaseClient', () => ({ supabase: { from: vi.fn() } }));

// applyProfileToRunState/extractRunStateData остаются настоящими (статические
// методы класса не enumerable — перечисляем явно); гасим сеть и дебаунс
// сохранений, чтобы тест не ходил в Supabase.
vi.mock('../game/auth/cloudSaveService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../game/auth/cloudSaveService')>();
  return {
    CloudSaveService: {
      loadProfile: vi.fn(),
      scheduleSave: vi.fn(),
      saveProfileImmediate: vi.fn().mockResolvedValue(true),
      extractRunStateData: actual.CloudSaveService.extractRunStateData,
      applyProfileToRunState: actual.CloudSaveService.applyProfileToRunState,
    },
  };
});

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

function makeProfile(id: string, patch: Partial<CloudProfile> = {}): CloudProfile {
  return {
    id,
    username: `Player_${id}`,
    credits: 1000,
    unlocked_hulls: ['hunter', 'mammoth'],
    unlocked_turrets: ['railgun', 'gauss'],
    current_hull: 'mammoth',
    current_turret: 'gauss',
    starter_pack_claimed: true,
    quests: [],
    ...patch,
  };
}

/** Поддельный игровой контекст: Game.boot() трогает лишь верхушку объекта. */
function makeCtx(run: RunState) {
  const events: GameEvent[] = [];
  const ctx = {
    canvas: document.createElement('canvas'),
    scene: {},
    renderWorld: {},
    cameraRig: { setViewportSize: vi.fn(), setGarageInset: vi.fn() },
    sim: { run, hudModel: { rebuildMinimap: vi.fn() } },
    previewController: { dispose: vi.fn(), previewVisual: null },
    gameLoop: { start: vi.fn(), stop: vi.fn(), timeScale: {} },
    weaponDeps: {},
    garageInput: {},
    audio: { setMuted: vi.fn(), setPaused: vi.fn(), click: vi.fn(), dispose: vi.fn(), muted: false },
    emitEvent: (e: GameEvent) => events.push(e),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    onResize: vi.fn(),
    onVisibility: vi.fn(),
    hudSink: { current: null },
    hud: {},
    floats: {},
  } as unknown as GameContext;
  return { ctx, events };
}

function garageChangedCount(events: GameEvent[]): number {
  return events.filter((e) => e.type === 'garageChanged').length;
}

async function makeGame(run: RunState) {
  const { ctx, events } = makeCtx(run);
  vi.mocked(bootstrapGame).mockResolvedValue(ctx);
  const game = await Game.create(document.createElement('canvas'));
  return { game, events };
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe('Game.loadCloudProfile: один заход на один userId', () => {
  it('параллельные вызовы (AuthModal + SIGNED_IN) дают один SELECT и один garageChanged', async () => {
    const profile = makeProfile('usr_a', { credits: 2400, username: 'IronGeneral' });
    const pending = deferred<LoadProfileResult>();
    vi.mocked(CloudSaveService.loadProfile).mockReturnValue(pending.promise);

    const run = new RunState();
    const { game, events } = await makeGame(run);

    const fromModal = game.loadCloudProfile('usr_a');
    const fromAuthEvent = game.loadCloudProfile('usr_a');
    pending.resolve({ profile, failed: false });

    expect(await fromModal).toBe(true);
    expect(await fromAuthEvent).toBe(true);

    expect(CloudSaveService.loadProfile).toHaveBeenCalledTimes(1);
    expect(garageChangedCount(events)).toBe(1);
    expect(run.credits).toBe(2400);
    expect(run.username).toBe('IronGeneral');
    expect(run.starterPackClaimed).toBe(true);
  });

  it('повторный вызов уже загруженного профиля — no-op (ни SELECT, ни события)', async () => {
    const profile = makeProfile('usr_a');
    vi.mocked(CloudSaveService.loadProfile).mockResolvedValue({ profile, failed: false });

    const run = new RunState();
    const { game, events } = await makeGame(run);

    expect(await game.loadCloudProfile('usr_a')).toBe(true);
    expect(await game.loadCloudProfile('usr_a')).toBe(true);

    expect(CloudSaveService.loadProfile).toHaveBeenCalledTimes(1);
    expect(garageChangedCount(events)).toBe(1);
  });

  it('поздний ответ по прошлому аккаунту не применяется (токен поколения)', async () => {
    const first = deferred<LoadProfileResult>();
    const second = deferred<LoadProfileResult>();
    vi.mocked(CloudSaveService.loadProfile)
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);

    const run = new RunState();
    const { game, events } = await makeGame(run);

    const forA = game.loadCloudProfile('usr_a');
    const forB = game.loadCloudProfile('usr_b');
    second.resolve({ profile: makeProfile('usr_b', { credits: 777 }), failed: false });
    expect(await forB).toBe(true);

    first.resolve({ profile: makeProfile('usr_a', { credits: 111 }), failed: false });
    expect(await forA).toBe(false);

    // Данные вытесненного аккаунта не легли поверх свежих.
    expect(run.credits).toBe(777);
    expect(run.userId).toBe('usr_b');
    expect(garageChangedCount(events)).toBe(1);
  });

  it('ошибка сети не кэшируется и не перезаписывает облако', async () => {
    vi.mocked(CloudSaveService.loadProfile)
      .mockResolvedValueOnce({ profile: null, failed: true })
      .mockResolvedValueOnce({ profile: makeProfile('usr_a'), failed: false });

    const run = new RunState();
    run.credits = 55;
    const { game, events } = await makeGame(run);

    expect(await game.loadCloudProfile('usr_a')).toBe(false);
    expect(garageChangedCount(events)).toBe(0);
    expect(run.credits).toBe(55);

    // Повтор после сетевой ошибки имеет право перезагрузить профиль.
    expect(await game.loadCloudProfile('usr_a')).toBe(true);
    expect(CloudSaveService.loadProfile).toHaveBeenCalledTimes(2);
    expect(run.credits).toBe(1000);
  });

  it('выход сбрасывает кэш применённого облака — следующий вход грузит заново', async () => {
    vi.mocked(CloudSaveService.loadProfile).mockResolvedValue({
      profile: makeProfile('usr_a'),
      failed: false,
    });

    const run = new RunState();
    const { game } = await makeGame(run);

    expect(await game.loadCloudProfile('usr_a')).toBe(true);
    game.setAuthUser(null);
    expect(await game.loadCloudProfile('usr_a')).toBe(true);

    expect(CloudSaveService.loadProfile).toHaveBeenCalledTimes(2);
  });
});

describe('стартовый комплект: это прогресс игрока, а не гостевой флаг', () => {
  it('resetToGuest не открывает стартовый флоу заново', () => {
    const run = new RunState();
    run.claimStarterPack('mammoth', 'gauss');
    run.credits = 900;
    run.unlockHull('titan');

    run.resetToGuest();

    expect(run.isGuest).toBe(true);
    expect(run.userId).toBeNull();
    expect(run.credits).toBe(0);
    expect(run.unlockedHulls).toEqual([]);
    // Флаг остался: hideChrome/старт-флоу не должны прыгать посреди раунда.
    expect(run.starterPackClaimed).toBe(true);
  });

  it('после выхода из аккаунта флаг игнорируется — выбитый в раунд HUD не гаснет', async () => {
    vi.mocked(CloudSaveService.loadProfile).mockResolvedValue({
      profile: makeProfile('usr_a'),
      failed: false,
    });

    const run = new RunState();
    const { game } = await makeGame(run);
    expect(await game.loadCloudProfile('usr_a')).toBe(true);
    expect(game.starterPackClaimed).toBe(true);

    game.setAuthUser(null);

    expect(game.starterPackClaimed).toBe(true);
    expect(game.isGuest).toBe(true);
  });

  it('новый игрок (профиля не было) по-прежнему получает стартовый флоу', () => {
    const run = new RunState();
    expect(run.starterPackClaimed).toBe(false);
    // Флаг из localStorage = false → флоу доступен.
    expect(Boolean(JSON.parse(localStorage.getItem('as2_loadout') ?? '{}')
      .starterPackClaimed)).toBe(false);
  });
});