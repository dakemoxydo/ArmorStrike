import { afterEach, describe, expect, it, vi } from 'vitest';
import { staticLayerKey, MAP_SIZE, MAP_HALF, drawMinimap } from '../components/hud/minimapDraw';
import type { CaptureHudPoint, MinimapDynamic, MinimapStatic } from '../game/types';
import type { GameApi } from '../game/GameApi';

function entry(
  partial: Partial<MinimapStatic> & Pick<MinimapStatic, 'id' | 'alive'>,
): MinimapStatic {
  return {
    x: 0, z: 0, w: 2, d: 2, kind: 'block',
    ...partial,
  };
}

describe('minimapDraw static layer key (shipped)', () => {
  it('exports map constants used by radar canvas', () => {
    expect(MAP_SIZE).toBe(172);
    expect(MAP_HALF).toBe(156);
  });

  it('staticLayerKey is stable for identical static lists', () => {
    const a: MinimapStatic[] = [
      entry({ id: 1, alive: true, kind: 'wall' }),
      entry({ id: 2, alive: true, kind: 'block' }),
    ];
    const b: MinimapStatic[] = [
      entry({ id: 1, alive: true, kind: 'wall' }),
      entry({ id: 2, alive: true, kind: 'block' }),
    ];
    expect(staticLayerKey(a)).toBe(staticLayerKey(b));
  });

  it('staticLayerKey changes when a block dies (forces static layer rebuild)', () => {
    const alive: MinimapStatic[] = [
      entry({ id: 1, alive: true }),
      entry({ id: 2, alive: true }),
    ];
    const dead: MinimapStatic[] = [
      entry({ id: 1, alive: true }),
      entry({ id: 2, alive: false }),
    ];
    expect(staticLayerKey(alive)).not.toBe(staticLayerKey(dead));
  });

  it('staticLayerKey changes when collider count changes', () => {
    const short = [entry({ id: 1, alive: true })];
    const long = [entry({ id: 1, alive: true }), entry({ id: 2, alive: true })];
    expect(staticLayerKey(short)).not.toBe(staticLayerKey(long));
  });
});

// ===== H1/K2: поведенческая верификация drawMinimap ==========================
// jsdom не рисует — рекордер ловит порядок вызовов, fillStyle/strokeStyle
// в момент fill/stroke/fillText. Скриншоты заменяют these-пины (BACKLOG H1).

interface Call {
  op: string;
  style?: string;
  args?: unknown[];
}

function attachRecorder(calls: Call[]) {
  const state = { fill: '', stroke: '' };
  return {
    get fillStyle() {
      return state.fill;
    },
    set fillStyle(v: string) {
      state.fill = v;
    },
    get strokeStyle() {
      return state.stroke;
    },
    set strokeStyle(v: string) {
      state.stroke = v;
    },
    font: '',
    textAlign: '',
    textBaseline: '',
    lineWidth: 0,
    clearRect: () => {
      calls.push({ op: 'clearRect' });
    },
    fillRect: () => {
      calls.push({ op: 'fillRect', style: state.fill });
    },
    drawImage: () => {
      calls.push({ op: 'drawImage' });
    },
    beginPath: () => {
      calls.push({ op: 'beginPath' });
    },
    moveTo: (x: number, y: number) => {
      calls.push({ op: 'moveTo', args: [x, y] });
    },
    lineTo: (x: number, y: number) => {
      calls.push({ op: 'lineTo', args: [x, y] });
    },
    closePath: () => {
      calls.push({ op: 'closePath' });
    },
    arc: () => {
      calls.push({ op: 'arc' });
    },
    fill: () => {
      calls.push({ op: 'fill', style: state.fill });
    },
    stroke: () => {
      calls.push({ op: 'stroke', style: state.stroke });
    },
    fillText: (t: string) => {
      calls.push({ op: 'fillText', style: state.fill, args: [t] });
    },
    save: () => {},
    restore: () => {},
    translate: () => {},
    rotate: () => {},
    createConicGradient: () => {
      calls.push({ op: 'createConicGradient' });
      return { addColorStop: () => {} };
    },
    createRadialGradient: () => ({ addColorStop: () => {} }),
  };
}

function makeCanvas(calls: Call[]): HTMLCanvasElement {
  const ctx = attachRecorder(calls);
  return { width: 0, height: 0, getContext: () => ctx } as unknown as HTMLCanvasElement;
}

interface RunOpts {
  cps?: CaptureHudPoint[];
  dynamics?: MinimapDynamic[];
}

function defaultDynamics(): MinimapDynamic[] {
  return [
    { x: 0, z: -40, yaw: 0, turret: 0, isPlayer: true, relation: 'self' },
    { x: 10, z: -40, yaw: 0, turret: 0, isPlayer: false, relation: 'ally' },
    { x: -10, z: -40, yaw: 0, turret: 0, isPlayer: false, relation: 'enemy' },
  ];
}

function runDraw(opts: RunOpts = {}) {
  const main: Call[] = [];
  const layer: Call[] = [];
  vi.stubGlobal('document', {
    createElement: (tag: string) => (tag === 'canvas' ? makeCanvas(layer) : undefined),
  });
  const statics: MinimapStatic[] = [
    entry({ id: 1, alive: true, kind: 'wall', x: 0, z: 0, w: 6, d: 6 }),
  ];
  const dynamics = opts.dynamics ?? defaultDynamics();
  const cps = opts.cps ?? [];
  const game = {
    getMinimapStatic: () => statics,
    fillMinimapDynamics: (out: MinimapDynamic[]) => {
      out.length = 0;
      out.push(...dynamics);
      return out;
    },
    getCaptureMinimap: () => cps,
  } as unknown as GameApi;
  const cv = makeCanvas(main);
  drawMinimap(game, cv, []);
  return { main, layer, cv };
}

/** Ops between the last beginPath before the matching fill and that fill. */
function pathOpsBeforeFill(calls: Call[], style: string): string[] {
  const i = calls.findIndex((c) => c.op === 'fill' && c.style === style);
  expect(i).toBeGreaterThanOrEqual(0);
  const ops: string[] = [];
  for (let j = i - 1; j >= 0; j--) {
    if (calls[j].op === 'beginPath') break;
    ops.push(calls[j].op);
  }
  return ops;
}

describe('drawMinimap pipeline (H1)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('paints layers in order: bg → sweep → statics → CP → blips; sweep is baked', () => {
    const { main, layer } = runDraw({
      cps: [{ id: 'A', x: 0, z: 0, owner: null, progress: 0, contested: false }],
    });

    const iBg = main.findIndex((c) => c.op === 'fillRect' && c.style === 'rgba(5,12,18,0.72)');
    const draws = main.flatMap((c, i) => (c.op === 'drawImage' ? [i] : []));
    const iCp = main.findIndex((c) => c.op === 'arc');
    const iBlip = main.findIndex((c) => c.op === 'fill' && c.style === '#f59e0b');

    expect(iBg).toBeGreaterThanOrEqual(0);
    expect(draws).toHaveLength(2); // sweep, затем statics
    expect(iBg).toBeLessThan(draws[0]);
    expect(draws[0]).toBeLessThan(draws[1]);
    expect(draws[1]).toBeLessThan(iCp); // CP-марkers поверх статики
    expect(iCp).toBeLessThan(iBlip); // блипы — верхний слой канваса
    // Sweep запечён один раз через createConicGradient (не per-frame)
    expect(layer.some((c) => c.op === 'createConicGradient')).toBe(true);
  });

  it('blips use team tokens and distinct shapes per relation (K2)', () => {
    const { main } = runDraw(); // без CP

    const fills = main.filter((c) => c.op === 'fill').map((c) => c.style);
    expect(fills).toContain('#f59e0b'); // self — amber token
    expect(fills).toContain('#38bdf8'); // ally — --team-alpha
    expect(fills).toContain('#f87171'); // enemy — --team-bravo

    // Ally = круг: без CP единственные arc на канвасе — две окружности блипа
    expect(main.filter((c) => c.op === 'arc')).toHaveLength(2);

    // Self = ромб, enemy = треугольник: polyline-пути, не дуги
    expect(pathOpsBeforeFill(main, '#f59e0b')).toContain('lineTo');
    expect(pathOpsBeforeFill(main, '#f87171')).toContain('lineTo');
  });

  it('CP rings share the --team token palette with blips on the same canvas', () => {
    const { main } = runDraw({
      dynamics: [],
      cps: [
        { id: 'A', x: 0, z: 0, owner: 'alpha', progress: 1, contested: false },
        { id: 'B', x: 20, z: 0, owner: 'bravo', progress: 1, contested: false },
        { id: 'C', x: -20, z: 0, owner: null, progress: 0.5, contested: true },
      ],
    });

    const strokes = main.filter((c) => c.op === 'stroke').map((c) => c.style);
    expect(strokes).toContain('rgba(56,189,248,0.9)'); // --team-alpha token
    expect(strokes).toContain('rgba(248,113,113,0.9)'); // --team-bravo token
    expect(strokes).toContain('rgba(255,210,74,0.9)'); // contested
    // Старый engine-палитры на канвасе не остаётся
    expect(strokes).not.toContain('rgba(59,158,255,0.9)');
    expect(strokes).not.toContain('rgba(255,77,61,0.9)');

    const letters = main.filter((c) => c.op === 'fillText').map((c) => c.args?.[0]);
    expect(letters).toEqual(['A', 'B', 'C']);
  });
});
