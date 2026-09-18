import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
    pan: param(),
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

describe('AudioFX — Spatial Audio & 3D Panning (G1)', () => {
  let createdNodes: ReturnType<typeof node>[] = [];
  let pannerNodes: ReturnType<typeof node>[] = [];
  let filterNodes: ReturnType<typeof node>[] = [];

  beforeEach(() => {
    createdNodes = [];
    pannerNodes = [];
    filterNodes = [];

    const mockCtx = {
      state: 'running',
      currentTime: 10,
      sampleRate: 44100,
      destination: node(),
      createGain: vi.fn(() => {
        const g = node();
        createdNodes.push(g);
        return g;
      }),
      createOscillator: vi.fn(() => {
        const o = node();
        createdNodes.push(o);
        return o;
      }),
      createBiquadFilter: vi.fn(() => {
        const f = node();
        filterNodes.push(f);
        createdNodes.push(f);
        return f;
      }),
      createBufferSource: vi.fn(() => {
        const s = node();
        createdNodes.push(s);
        return s;
      }),
      createBuffer: vi.fn(() => node()),
      createDynamicsCompressor: vi.fn(() => node()),
      createStereoPanner: vi.fn(() => {
        const p = node();
        pannerNodes.push(p);
        createdNodes.push(p);
        return p;
      }),
      suspend: vi.fn(async () => undefined),
      resume: vi.fn(async () => undefined),
      close: vi.fn(async () => undefined),
    };

    vi.stubGlobal('window', {
      AudioContext: function FakeAudioContext() { return mockCtx; },
      setTimeout: vi.fn((fn: () => void, ms: number) => setTimeout(fn, ms)),
      clearTimeout: vi.fn((id: number) => clearTimeout(id)),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('выстрел игрока (без позиции) подключается напрямую к мастер-шине без создания panner', () => {
    const fx = new AudioFX();
    fx.ensure();
    pannerNodes = [];
    fx.shoot('cannon');
    // Для выстрела игрока StereoPanner не создаётся
    expect(pannerNodes.length).toBe(0);
  });

  it('выстрел врага справа панорамируется в правое ухо (pan > 0)', () => {
    const fx = new AudioFX();
    fx.ensure();
    // Слушатель в (0, 0), смотрит на север (+Z, yaw = 0)
    fx.setListener(0, 0, 0);
    pannerNodes = [];

    // Враг в (20, 0) — строго справа (+X)
    fx.shoot('cannon', { x: 20, z: 0 });

    expect(pannerNodes.length).toBeGreaterThan(0);
    expect(pannerNodes[0].pan.value).toBeCloseTo(1.0, 1);
  });

  it('выстрел врага слева панорамируется в левое ухо (pan < 0)', () => {
    const fx = new AudioFX();
    fx.ensure();
    // Слушатель в (0, 0), смотрит на север (+Z, yaw = 0)
    fx.setListener(0, 0, 0);
    pannerNodes = [];

    // Враг в (-20, 0) — строго слева (-X)
    fx.shoot('railgun', { x: -20, z: 0 });

    expect(pannerNodes.length).toBeGreaterThan(0);
    expect(pannerNodes[0].pan.value).toBeCloseTo(-1.0, 1);
  });

  it('выстрел прямо по курсу имеет pan = 0', () => {
    const fx = new AudioFX();
    fx.ensure();
    fx.setListener(0, 0, 0);
    pannerNodes = [];

    // Враг в (0, 25) — строго спереди (+Z)
    fx.shoot('gauss', { x: 0, z: 25 });

    expect(pannerNodes.length).toBeGreaterThan(0);
    expect(pannerNodes[0].pan.value).toBeCloseTo(0.0, 2);
  });

  it('звук за пределами 90 м отсекается (не создает источников)', () => {
    const fx = new AudioFX();
    fx.ensure();
    fx.setListener(0, 0, 0);
    createdNodes = [];

    // Враг на дистанции 120 м
    fx.shoot('cannon', { x: 0, z: 120 });

    // Никаких новых осцилляторов и паннеров не создано
    expect(createdNodes.length).toBe(0);
  });

  it('звук за спиной слушателя (relZ < -2) активирует lowpass фильтр 3800 Гц', () => {
    const fx = new AudioFX();
    fx.ensure();
    fx.setListener(0, 0, 0);
    filterNodes = [];

    // Взрыв за спиной в (0, -25)
    fx.explosion({ x: 0, z: -25 });

    // Должен быть создан biquad lowpass фильтр на 3800 Гц
    const rearFilter = filterNodes.find((f) => f.type === 'lowpass' && f.frequency.value === 3800);
    expect(rearFilter).toBeDefined();
  });

  it('синтез звука башни «Изида» (shoot isida) генерирует характерные слои', () => {
    const fx = new AudioFX();
    fx.ensure();
    createdNodes = [];
    fx.shoot('isida');
    expect(createdNodes.length).toBeGreaterThan(0);
  });
});
