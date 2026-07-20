// ===== Отрисовка миникарты на canvas (без React) =====
// Static colliders baked into an offscreen layer; redrawn only when alive flags change.
import type { GameApi } from '../../game/GameApi';
import type { MinimapDynamic, MinimapStatic } from '../../game/types';

export const MAP_SIZE = 172;
export const MAP_HALF = 156;

/** Fingerprint of static layer content (layout + block alive flags). */
export function staticLayerKey(statics: readonly MinimapStatic[]): string {
  let key = `${statics.length}|`;
  for (let i = 0; i < statics.length; i++) {
    const m = statics[i];
    key += `${m.id}:${m.alive ? 1 : 0},`;
  }
  return key;
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
  staticKey: string;
  w: number;
  h: number;
}

const cacheByCanvas = new WeakMap<HTMLCanvasElement, CanvasCache>();

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
    c = { ctx, staticCv, staticCtx, staticKey: '', w: cv.width, h: cv.height };
    cacheByCanvas.set(cv, c);
  }
  return c;
}

export function drawMinimap(game: GameApi, cv: HTMLCanvasElement | null, buf: MinimapDynamic[]) {
  if (!cv) return;
  const cache = getCache(cv);
  if (!cache) return;
  const { ctx } = cache;
  const S = cv.width;
  const scale = S / (MAP_HALF * 2);
  const toX = (x: number) => (x + MAP_HALF) * scale;
  const toY = (z: number) => (z + MAP_HALF) * scale;

  const statics = game.getMinimapStatic();
  const key = staticLayerKey(statics);
  if (key !== cache.staticKey) {
    paintStatics(cache.staticCtx, statics, S, scale, toX, toY);
    cache.staticKey = key;
  }

  ctx.clearRect(0, 0, S, S);
  ctx.fillStyle = 'rgba(5,12,18,0.72)';
  ctx.fillRect(0, 0, S, S);

  const t = performance.now() * 0.0012;
  const grad = ctx.createConicGradient ? ctx.createConicGradient(t, S / 2, S / 2) : null;
  if (grad) {
    grad.addColorStop(0, 'rgba(46,230,192,0.10)');
    grad.addColorStop(0.15, 'rgba(46,230,192,0)');
    grad.addColorStop(1, 'rgba(46,230,192,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, S, S);
  }

  ctx.drawImage(cache.staticCv, 0, 0);

  // Capture point markers (A/B/C) under tank blips.
  const cps = game.getCaptureMinimap?.() ?? [];
  for (const cp of cps) {
    const cx = toX(cp.x);
    const cy = toY(cp.z);
    const col =
      cp.contested
        ? 'rgba(255,210,74,0.9)'
        : cp.owner === 'alpha'
          ? 'rgba(59,158,255,0.9)'
          : cp.owner === 'bravo'
            ? 'rgba(255,77,61,0.9)'
            : 'rgba(160,170,180,0.85)';
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, 5.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(5,12,18,0.75)';
    ctx.fill();
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.fillStyle = col;
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(cp.id, cx, cy + 0.5);
    ctx.restore();
  }

  game.fillMinimapDynamics(buf);
  for (const d of buf) {
    const x = toX(d.x);
    const y = toY(d.z);
    const rel = d.relation ?? (d.isPlayer ? 'self' : 'enemy');
    const fill =
      rel === 'self' ? '#2ee6c0' : rel === 'ally' ? '#3b9eff' : '#ff4d3d';
    const stroke =
      rel === 'self'
        ? 'rgba(46,230,192,0.8)'
        : rel === 'ally'
          ? 'rgba(59,158,255,0.75)'
          : 'rgba(255,80,60,0.65)';
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.sin(d.turret) * 7, -Math.cos(d.turret) * 7);
    ctx.stroke();
    ctx.rotate(Math.PI - d.yaw);
    ctx.fillStyle = fill;
    ctx.shadowColor = fill;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(0, -4.5);
    ctx.lineTo(3.4, 3.6);
    ctx.lineTo(-3.4, 3.6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}
