import * as THREE from 'three';
import { makeCanvas, toTexture, noise } from './shared';

export function wallTexture(): THREE.CanvasTexture {
  const S = 512;
  const { c, ctx } = makeCanvas(S);
  ctx.fillStyle = '#161d29';
  ctx.fillRect(0, 0, S, S);
  noise(ctx, S, 2200, 0.05);
  for (let x = 0; x <= S; x += 128) {
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, S); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x + 6, 0); ctx.lineTo(x + 6, S); ctx.stroke();
  }
  for (let x = 24; x < S; x += 128) {
    ctx.fillStyle = 'rgba(6,8,12,0.9)';
    ctx.fillRect(x, 36, 80, 42);
    if (Math.random() > 0.45) {
      const wg = ctx.createLinearGradient(0, 36, 0, 78);
      wg.addColorStop(0, 'rgba(255,170,80,0.55)');
      wg.addColorStop(1, 'rgba(255,120,40,0.15)');
      ctx.fillStyle = wg;
      ctx.fillRect(x + 6, 42, 68, 30);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.10)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, 36, 80, 42);
  }
  for (let x = 96; x < S; x += 180) {
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineWidth = 8;
    ctx.beginPath(); ctx.arc(x, 190, 26, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.10)';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(x, 190, 26, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 4;
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i;
      ctx.beginPath();
      ctx.moveTo(x, 190);
      ctx.lineTo(x + Math.cos(a) * 24, 190 + Math.sin(a) * 24);
      ctx.stroke();
    }
  }
  const g = ctx.createLinearGradient(0, 250, 0, 286);
  g.addColorStop(0, 'rgba(255,150,40,0)');
  g.addColorStop(0.5, 'rgba(255,150,40,0.5)');
  g.addColorStop(1, 'rgba(255,150,40,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 250, S, 36);
  for (let x = -40; x < S + 40; x += 64) {
    ctx.fillStyle = 'rgba(255,170,40,0.55)';
    ctx.beginPath();
    ctx.moveTo(x, S); ctx.lineTo(x + 32, S - 56);
    ctx.lineTo(x + 64, S - 56); ctx.lineTo(x + 32, S);
    ctx.closePath(); ctx.fill();
  }
  return toTexture(c, 4);
}

export function structureTexture(): THREE.CanvasTexture {
  const S = 256;
  const { c, ctx } = makeCanvas(S);
  ctx.fillStyle = '#1d2733';
  ctx.fillRect(0, 0, S, S);
  noise(ctx, S, 1400, 0.06);
  ctx.fillStyle = 'rgba(200,220,240,0.16)';
  for (let x = 16; x < S; x += 32) {
    for (let y = 16; y < S; y += 32) {
      ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.lineWidth = 3;
  for (let m = 0; m <= S; m += 128) {
    ctx.beginPath(); ctx.moveTo(m, 0); ctx.lineTo(m, S); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, m); ctx.lineTo(S, m); ctx.stroke();
  }
  return toTexture(c, 3);
}
