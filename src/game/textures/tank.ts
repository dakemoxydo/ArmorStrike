import * as THREE from 'three';
import { makeCanvas, toTexture, noise } from './shared';

export function trackTexture(): THREE.CanvasTexture {
  const S = 256;
  const { c, ctx } = makeCanvas(S);
  ctx.fillStyle = '#0b0d12';
  ctx.fillRect(0, 0, S, S);
  for (let y = 0; y < S; y += 32) {
    ctx.fillStyle = '#1c222e';
    ctx.fillRect(0, y + 5, S, 22);
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.fillRect(0, y + 5, S, 4);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(S * 0.46, y + 5, S * 0.08, 22);
  }
  return toTexture(c, 1);
}

export function camoTexture(base: string, dark: string, light: string): THREE.CanvasTexture {
  const S = 256;
  const { c, ctx } = makeCanvas(S);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, S, S);
  for (let i = 0; i < 26; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? dark : light;
    ctx.globalAlpha = 0.5 + Math.random() * 0.3;
    ctx.beginPath();
    const x = Math.random() * S, y = Math.random() * S;
    ctx.ellipse(x, y, 16 + Math.random() * 40, 10 + Math.random() * 26, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  noise(ctx, S, 1400, 0.07);
  return toTexture(c, 1);
}
