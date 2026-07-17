import * as THREE from 'three';
import { makeCanvas, toTexture, noise } from './shared';

export function groundTexture(): THREE.CanvasTexture {
  const S = 1024;
  const { c, ctx } = makeCanvas(S);
  ctx.fillStyle = '#10151d';
  ctx.fillRect(0, 0, S, S);
  noise(ctx, S, 6000, 0.05);

  const cell = 128;
  for (let i = 0; i <= S; i += cell) {
    ctx.strokeStyle = 'rgba(150,190,220,0.07)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, S); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(S, i); ctx.stroke();
  }
  for (let i = 0; i <= S; i += cell * 4) {
    ctx.strokeStyle = 'rgba(46,230,192,0.16)';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, S); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(S, i); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(200,220,240,0.10)';
  for (let x = cell; x < S; x += cell) {
    for (let y = cell; y < S; y += cell) {
      ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  for (let i = 0; i < 30; i++) {
    ctx.lineWidth = 1 + Math.random() * 2;
    const x = Math.random() * S, y = Math.random() * S;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (Math.random() - 0.5) * 260, y + (Math.random() - 0.5) * 260);
    ctx.stroke();
  }
  return toTexture(c, 7);
}

export function factoryGroundTexture(arenaSize: number): THREE.CanvasTexture {
  const S = 2048;
  const K = S / arenaSize;
  const half = arenaSize / 2;
  const px = (x: number) => (x + half) * K;
  const pz = (z: number) => (z + half) * K;
  const { c, ctx } = makeCanvas(S);

  const rectX = (x0: number, z0: number, w: number, d: number) => ctx.fillRect(px(x0), pz(z0), w * K, d * K);
  const hazardBand = (x0: number, z0: number, w: number, d: number) => {
    ctx.save();
    ctx.beginPath();
    ctx.rect(px(x0), pz(z0), w * K, d * K);
    ctx.clip();
    for (let i = -d; i < w + d; i += 2.6) {
      ctx.fillStyle = 'rgba(255,176,46,0.16)';
      ctx.save();
      ctx.translate(px(x0 + i), pz(z0));
      ctx.rotate(0.785);
      ctx.fillRect(0, -d * K, 1.3 * K, (w + 2 * d) * K);
      ctx.restore();
    }
    ctx.restore();
  };

  ctx.fillStyle = '#151920';
  ctx.fillRect(0, 0, S, S);
  noise(ctx, S, 9000, 0.05);

  ctx.fillStyle = 'rgba(120,140,165,0.08)'; rectX(-19, -16, 38, 32);
  ctx.fillStyle = 'rgba(255,110,40,0.07)';  rectX(-30, -62, 40, 26);
  ctx.fillStyle = 'rgba(70,160,190,0.06)';  rectX(4, 36, 40, 28);
  ctx.fillStyle = 'rgba(150,160,120,0.07)'; rectX(-66, -34, 32, 68);
  ctx.fillStyle = 'rgba(90,110,150,0.07)';  rectX(36, -38, 26, 76);

  ctx.strokeStyle = '#10141b';
  ctx.lineWidth = 10 * K;
  const inset = half - 13;
  ctx.strokeRect(px(-inset), pz(-inset), inset * 2 * K, inset * 2 * K);
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 0.25 * K;
  ctx.strokeRect(px(-inset + 4.6), pz(-inset + 4.6), (inset - 4.6) * 2 * K, (inset - 4.6) * 2 * K);

  const drawRoad = (x0: number, z0: number, w: number, d: number, horizontal: boolean) => {
    ctx.fillStyle = '#0f1319';
    rectX(x0, z0, w, d);
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 0.2 * K;
    ctx.strokeRect(px(x0), pz(z0), w * K, d * K);
    ctx.strokeStyle = 'rgba(255,200,80,0.30)';
    ctx.lineWidth = 0.3 * K;
    ctx.setLineDash([2.2 * K, 1.8 * K]);
    ctx.beginPath();
    if (horizontal) { ctx.moveTo(px(x0), pz(z0 + d / 2)); ctx.lineTo(px(x0 + w), pz(z0 + d / 2)); }
    else { ctx.moveTo(px(x0 + w / 2), pz(z0)); ctx.lineTo(px(x0 + w / 2), pz(z0 + d)); }
    ctx.stroke();
    ctx.setLineDash([]);
  };
  drawRoad(-inset, -22.5, inset * 2, 9, true);
  drawRoad(-inset, 13.5, inset * 2, 9, true);
  drawRoad(-34.5, -inset, 9, inset * 2, false);
  drawRoad(25.5, -inset, 9, inset * 2, false);

  const railY = { z0: -inset, z1: inset };
  ctx.fillStyle = 'rgba(20,16,12,0.85)';
  rectX(-39.6, railY.z0, 3.2, railY.z1 - railY.z0);
  ctx.fillStyle = 'rgba(60,48,36,0.7)';
  for (let z = railY.z0; z < railY.z1; z += 2.0) rectX(-40, z, 4.0, 0.5);
  ctx.fillStyle = 'rgba(150,160,175,0.5)';
  rectX(-39.2, railY.z0, 0.28, railY.z1 - railY.z0);
  rectX(-37.1, railY.z0, 0.28, railY.z1 - railY.z0);
  hazardBand(-41, -23.4, 6, 1.4);
  hazardBand(-41, 21.9, 6, 1.4);

  ctx.strokeStyle = 'rgba(255,255,255,0.035)';
  ctx.lineWidth = 2;
  for (let m = -half; m <= half; m += 12.5) {
    ctx.beginPath(); ctx.moveTo(px(m), 0); ctx.lineTo(px(m), S); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, pz(m)); ctx.lineTo(S, pz(m)); ctx.stroke();
  }

  hazardBand(-22.6, -8.6, 45.2, 1.6);
  hazardBand(-22.6, 7.0, 45.2, 1.6);

  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = `rgba(4,6,10,${0.14 + Math.random() * 0.12})`;
    ctx.beginPath();
    ctx.ellipse(S * (0.08 + Math.random() * 0.84), S * (0.08 + Math.random() * 0.84),
      (2 + Math.random() * 4) * K, (1.2 + Math.random() * 2.4) * K, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(8,10,12,0.28)';
  for (let i = 0; i < 12; i++) {
    ctx.lineWidth = 0.55 * K;
    ctx.beginPath();
    ctx.arc(S * (0.1 + Math.random() * 0.8), S * (0.1 + Math.random() * 0.8),
      (5 + Math.random() * 9) * K, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2 + 0.9);
    ctx.stroke();
  }
  for (let i = 0; i < 7; i++) {
    const x = S * (0.12 + Math.random() * 0.76), z = S * (0.12 + Math.random() * 0.76);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(x, z, 1.2 * K, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.moveTo(x - 0.8 * K, z); ctx.lineTo(x + 0.8 * K, z);
    ctx.stroke();
  }

  const label = (txt: string, x: number, z: number, rot: number, size: number, color = 'rgba(255,255,255,0.13)') => {
    ctx.save();
    ctx.translate(px(x), pz(z));
    ctx.rotate(rot);
    ctx.font = `bold ${Math.round(size * K)}px 'Russo One','Exo 2',sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.fillText(txt, 0, 0);
    ctx.restore();
  };
  label('ЦЕХ-7', 0, 20, 0, 6);
  label('ЛИТЕЙКА', -11, -34, 0, 4.6, 'rgba(255,150,70,0.16)');
  label('A-1', -51, -28, Math.PI / 2, 5);
  label('ПОГРУЗКА', -51, 0, Math.PI / 2, 4.2);
  label('БАНКИ', 24, 34, 0, 4.4, 'rgba(90,220,255,0.14)');
  label('М-12', 47, -36, Math.PI / 2, 4.4, 'rgba(140,170,255,0.14)');
  label('ОПАСНО', -8, -30, 0, 3.4, 'rgba(255,120,50,0.20)');

  hazardBand(-63, -14, 5, 28);
  hazardBand(56, -14, 5, 28);

  noise(ctx, S, 5000, 0.04);

  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 8;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
