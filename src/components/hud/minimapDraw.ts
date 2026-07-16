// ===== Отрисовка миникарты на canvas (без React) =====
import type { Game } from '../../game/Game';
import type { MinimapDynamic } from '../../game/types';

export const MAP_SIZE = 172;
export const MAP_HALF = 80;

export function drawMinimap(game: Game, cv: HTMLCanvasElement | null, buf: MinimapDynamic[]) {
  if (!cv) return;
  const ctx = cv.getContext('2d');
  if (!ctx) return;
  const S = cv.width;
  const scale = S / (MAP_HALF * 2);
  const toX = (x: number) => (x + MAP_HALF) * scale;
  const toY = (z: number) => (z + MAP_HALF) * scale;

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

  for (const m of game.getMinimapStatic()) {
    if (m.kind === 'wall') {
      ctx.fillStyle = 'rgba(120,160,200,0.30)';
    } else if (m.kind === 'ramp') {
      ctx.fillStyle = 'rgba(130,170,220,0.35)';
    } else {
      ctx.fillStyle = m.alive ? 'rgba(255,176,46,0.55)' : 'rgba(90,80,70,0.18)';
    }
    ctx.fillRect(toX(m.x - m.w / 2), toY(m.z - m.d / 2), m.w * scale, m.d * scale);
  }

  game.fillMinimapDynamics(buf);
  for (const d of buf) {
    const x = toX(d.x);
    const y = toY(d.z);
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = d.isPlayer ? 'rgba(46,230,192,0.8)' : 'rgba(255,80,60,0.65)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.sin(d.turret) * 7, -Math.cos(d.turret) * 7);
    ctx.stroke();
    ctx.rotate(Math.PI - d.yaw);
    ctx.fillStyle = d.isPlayer ? '#2ee6c0' : '#ff4d3d';
    ctx.shadowColor = ctx.fillStyle as string;
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
