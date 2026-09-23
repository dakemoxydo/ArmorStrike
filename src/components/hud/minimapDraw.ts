// ===== Отрисовка миникарты на canvas (без React) =====
// Static colliders baked into an offscreen layer; redrawn only when alive flags change.
import type { GameApi } from '../../game/GameApi';
import type { MinimapDynamic, MinimapStatic } from '../../game/types';

export const MAP_SIZE = 172;
export const MAP_HALF = 156;

/**
 * Fingerprint of static layer content (layout + block alive flags).
 *
 * A rolling integer hash, not a string: this runs every frame, and the previous
 * string concatenation allocated a full key per tick. Geometry is part of the
 * hash so a map switch repaints the baked layer even when collider ids and
 * alive flags happen to match.
 */
export function staticLayerKey(statics: readonly MinimapStatic[]): number {
  let h = statics.length;
  for (let i = 0; i < statics.length; i++) {
    const m = statics[i];
    h = (Math.imul(h, 31) + m.id) | 0;
    h = (Math.imul(h, 31) + q(m.x) + q(m.z)) | 0;
    h = (Math.imul(h, 31) + q(m.w) + q(m.d)) | 0;
    h = (Math.imul(h, 31) + (m.alive ? 1 : 0)) | 0;
  }
  return h;
}

/** Sub-pixel quantization (1/16 unit) — keeps the hash integer without losing layout detail. */
function q(v: number): number {
  return Math.round(v * 16);
}

function paintStatics(
  ctx: CanvasRenderingContext2D,
  statics: readonly MinimapStatic[],
  S: number,
  scale: number,
  toX: (x: number) => number,
  toY: (z: number) => number,
) {
  ctx.clearRect(0, 0, S, S);
  for (const m of statics) {
    if (m.kind === 'wall') {
      ctx.fillStyle = 'rgba(120,160,200,0.30)';
    } else if (m.kind === 'ramp') {
      ctx.fillStyle = 'rgba(130,170,220,0.35)';
    } else {
      ctx.fillStyle = m.alive ? 'rgba(255,176,46,0.55)' : 'rgba(90,80,70,0.18)';
    }
    ctx.fillRect(toX(m.x - m.w / 2), toY(m.z - m.d / 2), m.w * scale, m.d * scale);
  }
}

interface CanvasCache {
  ctx: CanvasRenderingContext2D;
  staticCv: HTMLCanvasElement;
  staticCtx: CanvasRenderingContext2D;
  staticKey: number;
  /** Pre-baked conic radar sweep (R-4) — rotated per frame instead of rebuilt. */
  sweepCv: HTMLCanvasElement;
  w: number;
  h: number;
}

const cacheByCanvas = new WeakMap<HTMLCanvasElement, CanvasCache>();

/** Bake the rotating radar gradient once; drawMinimap only rotates it. */
function bakeSweep(S: number): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = S;
  cv.height = S;
  const c = cv.getContext('2d')!;
  const grad = c.createConicGradient
    ? c.createConicGradient(0, S / 2, S / 2)
    : null;
  if (grad) {
    grad.addColorStop(0, 'rgba(245,158,11,0.12)');
    grad.addColorStop(0.15, 'rgba(245,158,11,0)');
    grad.addColorStop(1, 'rgba(245,158,11,0)');
    c.fillStyle = grad;
    c.fillRect(0, 0, S, S);
  }
  return cv;
}

function getCache(cv: HTMLCanvasElement): CanvasCache | null {
  const ctx = cv.getContext('2d');
  if (!ctx) return null;
  let c = cacheByCanvas.get(cv);
  if (!c || c.w !== cv.width || c.h !== cv.height) {
    const staticCv = document.createElement('canvas');
    staticCv.width = cv.width;
    staticCv.height = cv.height;
    const staticCtx = staticCv.getContext('2d');
    if (!staticCtx) return null;
    // NaN never equals itself → the baked layer is repainted on the first frame
    // after a cache rebuild (including a DPR change).
    c = { ctx, staticCv, staticCtx, staticKey: Number.NaN, sweepCv: bakeSweep(cv.width), w: cv.width, h: cv.height };
    cacheByCanvas.set(cv, c);
  }
  return c;
}

/** Backing-store scale. Capped at 2 so 3x phones don't pay for a needless 3x buffer. */
function deviceScale(): number {
  if (typeof window === 'undefined') return 1;
  return Math.min(2, window.devicePixelRatio || 1);
}

/**
 * Rotating radar sweep is continuous decorative motion, so it is frozen under
 * `prefers-reduced-motion: reduce`. The MediaQueryList is created once and its
 * `change` event keeps the flag live without a matchMedia() call per frame.
 */
const motionQuery =
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null;
let reducedMotion = motionQuery?.matches ?? false;
motionQuery?.addEventListener?.('change', (e) => { reducedMotion = e.matches; });

export function drawMinimap(game: GameApi, cv: HTMLCanvasElement | null, buf: MinimapDynamic[]) {
  if (!cv) return;
  // Canvas is sized in device pixels; its CSS size is owned by `.radar-panel`
  // (see hud.css) so one breakpoint can shrink the radar on small viewports.
  // getCache() rebuilds when the backing size moves.
  const backing = Math.round(MAP_SIZE * deviceScale());
  if (cv.width !== backing || cv.height !== backing) {
    cv.width = backing;
    cv.height = backing;
  }
  const cache = getCache(cv);
  if (!cache) return;
  const { ctx } = cache;
  const S = cv.width;
  /** Fixed-size strokes/fonts are authored in CSS px — scale them to the backing store. */
  const k = S / MAP_SIZE;
  const scale = S / (MAP_HALF * 2);
  const toX = (x: number) => (x + MAP_HALF) * scale;
  // +Z is north. Canvas Y grows down, so flip: north is toward the N label at the top.
  const toY = (z: number) => (MAP_HALF - z) * scale;

  const statics = game.getMinimapStatic();
  const key = staticLayerKey(statics);
  if (key !== cache.staticKey) {
    paintStatics(cache.staticCtx, statics, S, scale, toX, toY);
    cache.staticKey = key;
  }

  ctx.clearRect(0, 0, S, S);
  ctx.fillStyle = 'rgba(5,12,18,0.72)';
  ctx.fillRect(0, 0, S, S);

  // Radar sweep (R-4): pre-baked conic gradient, rotated per frame —
  // no createConicGradient + full-canvas gradient rebuild per tick.
  const t = reducedMotion ? 0 : performance.now() * 0.0012;
  if (cache.sweepCv.width > 0) {
    ctx.save();
    ctx.translate(S / 2, S / 2);
    ctx.rotate(t);
    ctx.drawImage(cache.sweepCv, -S / 2, -S / 2);
    ctx.restore();
  }

  ctx.drawImage(cache.staticCv, 0, 0);

  // Capture point markers (A/B/C) under tank blips.
  const cps = game.getCaptureMinimap?.() ?? [];
  for (const cp of cps) {
    const cx = toX(cp.x);
    const cy = toY(cp.z);
    // Кольца CP — токены --team-alpha/--team-bravo (та же палитра, что у блипов):
    // один канвас — одна палитра; 3D-мир остаётся на COLORS.team* (core/constants).
    const col =
      cp.contested
        ? 'rgba(255,210,74,0.9)'
        : cp.owner === 'alpha'
          ? 'rgba(56,189,248,0.9)'
          : cp.owner === 'bravo'
            ? 'rgba(248,113,113,0.9)'
            : 'rgba(160,170,180,0.85)';
    ctx.save();
    // Comic ink border around capture point
    ctx.beginPath();
    ctx.arc(cx, cy, 6 * k, 0, Math.PI * 2);
    ctx.fillStyle = '#0b0e14';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, 5.2 * k, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(11,16,25,0.9)';
    ctx.fill();
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.6 * k;
    ctx.stroke();
    ctx.fillStyle = col;
    ctx.font = `bold ${8.5 * k}px 'Russo One', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(cp.id, cx, cy + 0.5 * k);
    ctx.restore();
  }

  game.fillMinimapDynamics(buf);
  for (const d of buf) {
    const x = toX(d.x);
    const y = toY(d.z);
    const rel = d.relation ?? (d.isPlayer ? 'self' : 'enemy');
    // Цвета команд — токены из styles/variables.css (--team-alpha/--team-bravo),
    // не локальные hex-дубли. Форма тоже несёт роль (K2, colorblind):
    // self = ромб, ally = круг, enemy = треугольник — различие без опоры на цвет.
    const fill =
      rel === 'self' ? '#f59e0b' : rel === 'ally' ? '#38bdf8' : '#f87171';
    const stroke =
      rel === 'self'
        ? 'rgba(245,158,11,0.95)'
        : rel === 'ally'
          ? 'rgba(56,189,248,0.9)'
          : 'rgba(248,113,113,0.85)';
    ctx.save();
    ctx.translate(x, y);

    // Ink outline for turret line:
    ctx.strokeStyle = '#0b0e14';
    ctx.lineWidth = 2.4 * k;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.sin(d.turret) * 7.5 * k, -Math.cos(d.turret) * 7.5 * k);
    ctx.stroke();

    // Turret line in accent color:
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.2 * k;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.sin(d.turret) * 7.5 * k, -Math.cos(d.turret) * 7.5 * k);
    ctx.stroke();

    ctx.rotate(d.yaw);

    if (rel === 'ally') {
      // Круг — форма союзника (K2): читается и без цвета.
      ctx.beginPath();
      ctx.arc(0, 0, 4.2 * k, 0, Math.PI * 2);
      ctx.fillStyle = '#0b0e14';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, 0, 3.2 * k, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.fill();
    } else if (rel === 'self') {
      // Ромб — уникальная форма игрока (K2), ink rim конвенцией треугольника.
      ctx.beginPath();
      ctx.moveTo(0, -4.8 * k);
      ctx.lineTo(3.8 * k, 0);
      ctx.lineTo(0, 4.8 * k);
      ctx.lineTo(-3.8 * k, 0);
      ctx.closePath();
      ctx.fillStyle = '#0b0e14';
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, -3.6 * k);
      ctx.lineTo(2.8 * k, 0);
      ctx.lineTo(0, 3.6 * k);
      ctx.lineTo(-2.8 * k, 0);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
    } else {
      // Comic ink outline for tank triangle (enemy; sharp ink rim, no fuzzy blur):
      ctx.beginPath();
      ctx.moveTo(0, -4.8 * k);
      ctx.lineTo(3.8 * k, 3.8 * k);
      ctx.lineTo(-3.8 * k, 3.8 * k);
      ctx.closePath();
      ctx.fillStyle = '#0b0e14';
      ctx.fill();

      // Inner filled triangle:
      ctx.beginPath();
      ctx.moveTo(0, -3.8 * k);
      ctx.lineTo(2.8 * k, 2.9 * k);
      ctx.lineTo(-2.8 * k, 2.9 * k);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
    }
    ctx.restore();
  }
}
