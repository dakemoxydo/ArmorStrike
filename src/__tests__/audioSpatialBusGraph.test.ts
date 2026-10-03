/**
 * Регрессия на рост аудио-графа: `getSpatialBus` строил цепочку
 * gain → [lowpass] → [panner] → master на КАЖДЫЙ позиционный звук и никогда её
 * не отключал (в audio.ts не было ни одного disconnect()). За матч 5×5 с
 * ботами-рельсгаунами master накапливал по одному дочернему подграфу на
 * выстрел/взрыв.
 *
 * Фейк AudioContext здесь НЕ no-op: connect/disconnect ведут настоящий учёт
 * входов (master.children) и учитывают отложенный конец источника (`stop()` →
 * `onended` при продвижении часов), поэтому тест видит реальный рост/сжатие
 * графа, а не число вызовов фабрик.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioFX } from '../game/audio';

interface FakeParam {
  value: number;
  setValueAtTime: (v: number, t: number) => FakeParam;
  exponentialRampToValueAtTime: (v: number, t: number) => FakeParam;
  linearRampToValueAtTime: (v: number, t: number) => FakeParam;
  setTargetAtTime: (v: number, t: number, tc: number) => FakeParam;
  cancelScheduledValues: (t: number) => FakeParam;
}

interface FakeNode {
  kind: string;
  /** Прямые входы узла (чьи сигналы в него приходят) — «дети» в графе. */
  children: FakeNode[];
  /** Куда узел подключён сам. */
  outputs: FakeNode[];
  type: string;
  loop: boolean;
  buffer: unknown;
  gain: FakeParam;
  frequency: FakeParam;
  pan: FakeParam;
  threshold: FakeParam;
  knee: FakeParam;
  ratio: FakeParam;
  attack: FakeParam;
  release: FakeParam;
  onended: (() => void) | null;
  /** Сколько раз вызывался disconnect — проверка явного освобождения. */
  disconnectCount: number;
  connect: (dest: FakeNode) => FakeNode;
  disconnect: (dest?: FakeNode) => void;
  start: (t?: number) => void;
  stop: (t?: number) => void;
}

interface Harness {
  ctx: unknown;
  /** Все созданные узлы в порядке создания. */
  nodes: FakeNode[];
  /** Узлы-источники (осцилляторы/буферы) с их временем конца. */
  sources: FakeNode[];
  /** Конец воспроизведения источника (абсолютное время ctx), null если не задан. */
  stopAt: WeakMap<FakeNode, number>;
  now: () => number;
  /** Продвинуть часы и выстрелить событиями ended у доигравших источников. */
  advanceTo: (t: number) => void;
  ofKind: (kind: string) => FakeNode[];
}

function param(): FakeParam {
  const p: FakeParam = {
    value: 0,
    setValueAtTime: (v) => { p.value = v; return p; },
    exponentialRampToValueAtTime: (v) => { p.value = v; return p; },
    linearRampToValueAtTime: (v) => { p.value = v; return p; },
    setTargetAtTime: (v) => { p.value = v; return p; },
    cancelScheduledValues: () => p,
  };
  return p;
}

function makeHarness(): Harness {
  let now = 10;
  const nodes: FakeNode[] = [];
  const sources: FakeNode[] = [];
  const stopAt = new WeakMap<FakeNode, number>();

  const mkNode = (kind: string): FakeNode => {
    const n: FakeNode = {
      kind,
      children: [],
      outputs: [],
      type: '',
      loop: false,
      buffer: null,
      gain: param(),
      frequency: param(),
      pan: param(),
      threshold: param(),
      knee: param(),
      ratio: param(),
      attack: param(),
      release: param(),
      onended: null,
      disconnectCount: 0,
      connect: (dest) => {
        if (!n.outputs.includes(dest)) {
          n.outputs.push(dest);
          dest.children.push(n);
        }
        return dest;
      },
      disconnect: (dest) => {
        n.disconnectCount += 1;
        for (const d of dest ? [dest] : n.outputs.slice()) {
          const i = n.outputs.indexOf(d);
          if (i >= 0) n.outputs.splice(i, 1);
          const j = d.children.indexOf(n);
          if (j >= 0) d.children.splice(j, 1);
        }
      },
      start: () => undefined,
      stop: (t) => { stopAt.set(n, t ?? now); },
    };
    nodes.push(n);
    return n;
  };

  const mkSource = (kind: string): FakeNode => {
    const n = mkNode(kind);
    sources.push(n);
    return n;
  };

  const ctx = {
    state: 'running',
    get currentTime() { return now; },
    sampleRate: 44100,
    destination: mkNode('destination'),
    createGain: () => mkNode('gain'),
    createOscillator: () => mkSource('osc'),
    createBiquadFilter: () => mkNode('biquad'),
    createBufferSource: () => mkSource('bufferSource'),
    createBuffer: () => ({ getChannelData: () => new Float32Array(4) }),
    createDynamicsCompressor: () => mkNode('compressor'),
    createStereoPanner: () => mkNode('panner'),
    suspend: vi.fn(async () => undefined),
    resume: vi.fn(async () => undefined),
    close: vi.fn(async () => undefined),
  };

  return {
    ctx,
    nodes,
    sources,
    stopAt,
    now: () => now,
    advanceTo: (t) => {
      now = t;
      for (const src of sources) {
        const end = stopAt.get(src);
        if (end === undefined || end > t || src.onended === null) continue;
        // Событие конца одноразовое: браузер не повторяет onended.
        const fire = src.onended;
        src.onended = null;
        fire();
      }
    },
    ofKind: (kind) => nodes.filter((n) => n.kind === kind),
  };
}

/** Живые пространственные шины AudioFX (private, только для проверки утечек). */
function busEntries(fx: AudioFX): Array<{ input: FakeNode; tail: FakeNode; pending: number }> {
  return [...(Reflect.get(fx, 'spatialBuses') as Map<AudioNode, { input: FakeNode; tail: FakeNode; pending: number }>).values()];
}

function busCount(fx: AudioFX): number {
  return busEntries(fx).length;
}

function masterOf(fx: AudioFX): FakeNode {
  return Reflect.get(fx, 'master') as FakeNode;
}

describe('AudioFX spatial bus — граф не растёт (утечка bus-узлов)', () => {
  let h: Harness;
  let fx: AudioFX;
  let master: FakeNode;
  let baseline: number;

  beforeEach(() => {
    h = makeHarness();
    vi.stubGlobal('window', {
      AudioContext: function FakeAudioContext() { return h.ctx; },
      setTimeout: vi.fn((fn: () => void, ms: number) => setTimeout(fn, ms)),
      clearTimeout: vi.fn((id: number) => clearTimeout(id)),
    });
    fx = new AudioFX();
    fx.ensure();
    fx.setListener(0, 0, 0); // слушатель в (0,0), курс на север (+Z)
    master = masterOf(fx);
    baseline = master.children.length;
    // Ничего не входит в master: ensure() строит master → компрессор →
    // destination, то есть компрессор стоит ПОСЛЕ master, а не входит в него.
    // Всё, что ниже прибавляется к baseline, — утечка bus-графа.
    expect(baseline).toBe(0);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('60 позиционных выстрелов не оставляют bus-узлов на master', () => {
    for (let i = 0; i < 60; i++) {
      // Через раз — источник за спиной (ветка с lowpass), остальные спереди.
      const pos = i % 2 === 0 ? { x: 20, z: 5 } : { x: -18, z: -30 };
      fx.shoot(i % 3 === 0 ? 'gauss' : 'railgun', pos);
    }
    // Пока звук играет, шины действительно висят на master (иначе тест не vacuous).
    expect(master.children.length).toBe(baseline + 60);
    expect(busCount(fx)).toBe(60);

    h.advanceTo(h.now() + 5); // все источники доиграли

    expect(master.children.length).toBe(baseline);
    expect(busCount(fx)).toBe(0);
  });

  it('повторные волны выстрелов и взрывов тоже не растят граф', () => {
    for (let wave = 0; wave < 3; wave++) {
      for (let i = 0; i < 20; i++) {
        fx.shoot('railgun', { x: 10 + i, z: -25 });
        fx.explosion({ x: -12, z: 40 });
      }
      expect(master.children.length).toBe(baseline + 40);
      h.advanceTo(h.now() + 3);
      expect(master.children.length).toBe(baseline);
      expect(busCount(fx)).toBe(0);
    }
  });

  it('выстрел игрока (без позиции) идёт прямо в master, дальше 90 м — в никуда', () => {
    const before = h.nodes.length;
    fx.shoot('railgun');
    // Шесть слоёв рельсгауна подключены к самому master, ни одной шины.
    expect(master.children.length).toBe(baseline + 6);
    expect(busCount(fx)).toBe(0);
    expect(h.ofKind('panner').length).toBe(0);

    const afterPlayerShot = h.nodes.length;
    // 6 слоёв рельсгауна: 4 осциллятора + 2 шумовых источника, 6 gain, 2 biquad.
    expect(afterPlayerShot).toBe(before + 14);

    fx.shoot('cannon', { x: 0, z: 120 }); // 120 м > 90 м — отсечка
    expect(h.nodes.length).toBe(afterPlayerShot);
    expect(master.children.length).toBe(baseline + 6);
    expect(busCount(fx)).toBe(0);
  });

  it('одновременные выстрелы не мешают друг другу: своя панорама и своя громкость', () => {
    // Слева-спереди (25 м) и справа-сзади (32 м): разные pan и разные gain.
    fx.shoot('cannon', { x: -25, z: 6 });
    fx.shoot('cannon', { x: 20, z: -25 });

    const panners = h.ofKind('panner');
    expect(panners.length).toBe(2);
    const [panL, panR] = panners;
    expect(panL.pan.value).toBeLessThan(0);
    expect(panR.pan.value).toBeGreaterThan(0);
    // Каждая шина несёт свою панораму — вторая не переписала первую.
    expect(panL.pan.value).toBeCloseTo(-25 / Math.hypot(25, 6), 2);
    expect(panR.pan.value).toBeCloseTo(20 / Math.hypot(20, 25), 2);

    // Сзади — lowpass 3800 Гц, у первого выстрела (спереди) фильтра нет.
    const rear = panR.children[0];
    expect(rear.kind).toBe('biquad');
    expect(rear.type).toBe('lowpass');
    expect(rear.frequency.value).toBe(3800);
    // Спереди вход панорамы — сам busGain.
    const gainL = panL.children[0];
    expect(gainL.kind).toBe('gain');

    // Громкость каждой шины своя: дистанция + заднее приглушение 0.82.
    const gainR = rear.children[0] as FakeNode;
    const volL = gainL.gain.value;
    const volR = gainR.gain.value;
    expect(volL).toBeGreaterThan(0);
    expect(volR).toBeGreaterThan(0);
    expect(volR).toBeLessThan(volL * 0.75); // 32 м и за спиной
    expect(volR).toBeGreaterThan(volL * 0.5);
  });

  it('шина отпускается только когда отработали ВСЕ её источники', () => {
    fx.shoot('railgun', { x: -25, z: 6 }); // 6 слоёв, 0.045..0.32 с
    const bus = masterOf(fx);
    const panner = h.ofKind('panner')[0];
    expect(bus.children.length).toBe(baseline + 1);

    const t0 = h.now();
    // Самый короткий слой истёк (0.045 + 0.1), самый длинный ещё играет.
    h.advanceTo(t0 + 0.15);
    expect(panner.children.length).toBe(1); // шина ещё на месте

    h.advanceTo(t0 + 5);
    expect(panner.children.length).toBe(0);
    expect(bus.children.length).toBe(baseline);
  });

  it('dispose() освобождает и живые шины', () => {
    fx.shoot('railgun', { x: -25, z: 6 });
    fx.shoot('cannon', { x: 20, z: -25 });
    const buses = busEntries(fx);
    expect(master.children.length).toBe(baseline + 2);
    expect(buses).toHaveLength(2);

    fx.dispose();

    expect(master.children.length).toBe(baseline); // с master сняты оба хвоста
    expect(busCount(fx)).toBe(0);
    for (const b of buses) {
      expect(b.tail.disconnectCount).toBeGreaterThanOrEqual(1);
      expect(b.tail.outputs.length).toBe(0);
      expect(b.input.disconnectCount).toBeGreaterThanOrEqual(1);
      expect(b.input.outputs.length).toBe(0);
    }
    // Повторный dispose не падает (шины уже сняты, onended сработает позже).
    expect(() => fx.dispose()).not.toThrow();
  });
});