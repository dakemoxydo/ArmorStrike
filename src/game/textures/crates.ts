import * as THREE from 'three';
import { makeCanvas, toTexture, noise } from './shared';

export function crateTexture(accent: string, dark = '#232c3a', light = '#33405a'): THREE.CanvasTexture {
  const S = 512;
  const { c, ctx } = makeCanvas(S);
  const g = ctx.createLinearGradient(0, 0, 0, S);
  g.addColorStop(0, light);
  g.addColorStop(1, dark);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  noise(ctx, S, 2500, 0.06);

  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = 22;
  ctx.strokeRect(11, 11, S - 22, S - 22);
  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.lineWidth = 3;
  ctx.strokeRect(30, 30, S - 60, S - 60);

  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 14;
  ctx.beginPath(); ctx.moveTo(40, 40); ctx.lineTo(S - 40, S - 40); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(S - 40, 40); ctx.lineTo(40, S - 40); ctx.stroke();

  ctx.save();
  ctx.beginPath(); ctx.rect(30, S - 100, S - 60, 62); ctx.clip();
  for (let x = -80; x < S + 80; x += 56) {
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.moveTo(x, S - 38); ctx.lineTo(x + 28, S - 100);
    ctx.lineTo(x + 56, S - 100); ctx.lineTo(x + 28, S - 38);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();

  ctx.fillStyle = 'rgba(220,235,255,0.25)';
  for (const [x, y] of [[56, 56], [S - 56, 56], [56, S - 130], [S - 56, S - 130]] as const) {
    ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill();
  }
  return toTexture(c, 1);
}

export function containerTexture(color: string, label: string, darkShade: string): THREE.CanvasTexture {
  const S = 512;
  const { c, ctx } = makeCanvas(S);
  const bg = ctx.createLinearGradient(0, 0, 0, S);
  bg.addColorStop(0, color);
  bg.addColorStop(1, darkShade);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, S, S);

  for (let x = 0; x < S; x += 52) {
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.fillRect(x, 0, 14, S);
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.fillRect(x + 14, 0, 5, S);
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.65)';
  ctx.lineWidth = 20;
  ctx.strokeRect(10, 10, S - 20, S - 20);

  ctx.save();
  ctx.translate(S / 2, S * 0.42);
  ctx.font = `bold 76px 'Russo One','Exo 2',monospace`;
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillText(label, 0, 0);
  ctx.font = `bold 44px monospace`;
  ctx.fillStyle = 'rgba(255,255,255,0.30)';
  ctx.fillText('MAX 30480 KG', 0, 66);
  ctx.restore();

  ctx.save();
  ctx.beginPath(); ctx.rect(20, S - 96, S - 40, 58); ctx.clip();
  for (let x = -60; x < S + 60; x += 52) {
    ctx.fillStyle = 'rgba(255,196,20,0.75)';
    ctx.beginPath();
    ctx.moveTo(x, S - 38);
    ctx.lineTo(x + 26, S - 96);
    ctx.lineTo(x + 52, S - 96);
    ctx.lineTo(x + 26, S - 38);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();

  noise(ctx, S, 2600, 0.08);
  return toTexture(c, 1);
}

export function barrelTexture(color: string): THREE.CanvasTexture {
  const S = 256;
  const { c, ctx } = makeCanvas(S);
  const bg = ctx.createLinearGradient(0, 0, 0, S);
  bg.addColorStop(0, color);
  bg.addColorStop(1, '#141a22');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, S, S);
  for (const y of [58, 128, 198]) {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, y, S, 12);
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.fillRect(0, y - 3, S, 3);
  }
  ctx.font = `bold 34px monospace`;
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillText('FUEL-51', S / 2, 38);
  noise(ctx, S, 900, 0.07);
  return toTexture(c, 1);
}
