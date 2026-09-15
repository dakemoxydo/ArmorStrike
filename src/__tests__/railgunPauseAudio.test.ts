/**
 * Пауза замораживает аудио-таймлайн (недочёт #8 hotfix): гул заряда рельсы
 * и его ускоряющиеся тики не должны доигрывать под затемнением паузы.
 * node-окружение: window/AudioContext подменяются минимальным фейком,
 * setTimeout — фейковыми таймерами vitest.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioFX } from '../game/audio';

function param() {
  return {
    value: 0,
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    setTargetAtTime: vi.fn(),
    cancelScheduledValues: vi.fn(),
  };
}

function node() {
  return {
    type: '',
    gain: param(),
    frequency: param(),
    // AudioParam'ы компрессора (createDynamicsCompressor в ensure()).
    threshold: param(),
    knee: param(),
    ratio: param(),
    attack: param(),
    release: param(),
    buffer: null,
    loop: false,
    connect: vi.fn((dest: unknown) => dest),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    getChannelData: () => new Float32Array(4),
  };
}

function makeCtx() {
  const listeners: Array<() => void> = [];
  const ctx = {
    state: 'running',
    currentTime: 0,
    sampleRate: 44100,
    destination: node(),
    createGain: () => node(),
    createOscillator: () => node(),
    createBiquadFilter: () => node(),
    createBufferSource: () => node(),
    createBuffer: (_ch: number, _len: number, _rate: number) => node(),
    createDynamicsCompressor: () => node(),
    suspend: vi.fn(async () => { ctx.state = 'suspended'; }),
    resume: vi.fn(async () => { ctx.state = 'running'; }),
    close: vi.fn(async () => { ctx.state = 'closed'; }),
    addEventListener: (_t: string, fn: () => void) => { listeners.push(fn); },
  };
  return ctx;
}

describe('AudioFX.setPaused — charge audio respects the game pause', () => {
  let ctx: ReturnType<typeof makeCtx>;

  beforeEach(() => {
    ctx = makeCtx();
    vi.useFakeTimers();
    vi.stubGlobal('window', {
      AudioContext: function FakeAudioContext() { return ctx; },
      setTimeout: vi.fn((fn: () => void, ms: number) => setTimeout(fn, ms)),
      clearTimeout: vi.fn((id: number) => clearTimeout(id)),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('suspends the WebAudio clock while paused and resumes after', () => {
    const fx = new AudioFX();
    fx.ensure();
    fx.setPaused(true);
    expect(ctx.suspend).toHaveBeenCalledTimes(1);
    // Идемпотентно: второй вызов с тем же состоянием не трогает контекст.
    fx.setPaused(true);
    expect(ctx.suspend).toHaveBeenCalledTimes(1);
    fx.setPaused(false);
    expect(ctx.resume).toHaveBeenCalledTimes(1);
    fx.dispose();
  });

  it('ensure() does not undo an active pause (autoplay-resume stays gated)', () => {
    const fx = new AudioFX();
    fx.ensure();
    fx.setPaused(true);
    vi.clearAllMocks();
    ctx.state = 'suspended';
    fx.ensure();
    expect(ctx.resume).not.toHaveBeenCalled();
    fx.dispose();
  });

  it('charge ticks do not fire into a paused context', () => {
    const fx = new AudioFX();
    fx.ensure();
    const createOsc = vi.spyOn(ctx, 'createOscillator');
    const handle = fx.chargeRailgun(1.1); // 5 слоёв гула создаются сразу
    const baseCalls = createOsc.mock.calls.length;
    fx.setPaused(true);
    // Прокручиваем окно заряда целиком: тики (setTimeout) обязаны молчать.
    vi.advanceTimersByTime(1200);
    expect(createOsc.mock.calls.length).toBe(baseCalls);
    fx.stopChargeRailgun(handle, true);
    fx.dispose();
  });

  it('charge ticks play while the game runs', () => {
    const fx = new AudioFX();
    fx.ensure();
    const createOsc = vi.spyOn(ctx, 'createOscillator');
    const handle = fx.chargeRailgun(1.1);
    const baseCalls = createOsc.mock.calls.length;
    vi.advanceTimersByTime(1200);
    expect(createOsc.mock.calls.length).toBeGreaterThan(baseCalls);
    fx.stopChargeRailgun(handle, true);
    fx.dispose();
  });
});
