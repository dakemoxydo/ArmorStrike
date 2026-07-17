import * as THREE from 'three';
import { makeCanvas, toTexture } from './shared';

export function glowTexture(): THREE.CanvasTexture {
  const S = 128;
  const { c, ctx } = makeCanvas(S);
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.7)');
  g.addColorStop(0.6, 'rgba(255,255,255,0.18)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function smokeTexture(): THREE.CanvasTexture {
  const S = 128;
  const { c, ctx } = makeCanvas(S);
  const g = ctx.createRadialGradient(S / 2, S / 2, 8, S / 2, S / 2, S / 2);
  g.addColorStop(0, 'rgba(255,255,255,0.85)');
  g.addColorStop(0.55, 'rgba(255,255,255,0.35)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  return toTexture(c, 1);
}

export function scorchTexture(): THREE.CanvasTexture {
  const S = 128;
  const { c, ctx } = makeCanvas(S);
  const g = ctx.createRadialGradient(S / 2, S / 2, 4, S / 2, S / 2, S / 2);
  g.addColorStop(0, 'rgba(0,0,0,0.9)');
  g.addColorStop(0.5, 'rgba(10,8,6,0.55)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  return toTexture(c, 1);
}

export function hexTexture(): THREE.CanvasTexture {
  const S = 256;
  const { c, ctx } = makeCanvas(S);
  ctx.clearRect(0, 0, S, S);
  ctx.strokeStyle = 'rgba(80,220,255,0.5)';
  ctx.lineWidth = 2;
  const r = 24;
  const h = Math.sin(Math.PI / 3) * r;
  for (let row = -1; row < S / (h * 2) + 1; row++) {
    for (let col = -1; col < S / (r * 3) + 1; col++) {
      const cx = col * r * 3 + (row % 2 ? r * 1.5 : 0);
      const cy = row * h * 2;
      ctx.beginPath();
      for (let i = 0; i <= 6; i++) {
        const a = (Math.PI / 3) * i + Math.PI / 6;
        const px = cx + r * Math.cos(a);
        const py = cy + r * Math.sin(a);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
  }
  const t = toTexture(c, 1);
  t.repeat.set(14, 3);
  return t;
}
