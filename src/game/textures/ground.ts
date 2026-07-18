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

/** Earthy packed-dirt ground for Village map. */
export function villageGroundTexture(arenaSize: number): THREE.CanvasTexture {
  const S = 2048;
  const K = S / arenaSize;
  const half = arenaSize / 2;
  const px = (x: number) => (x + half) * K;
  const pz = (z: number) => (z + half) * K;
  const { c, ctx } = makeCanvas(S);
  const rectX = (x0: number, z0: number, w: number, d: number) =>
    ctx.fillRect(px(x0), pz(z0), w * K, d * K);

  ctx.fillStyle = '#2a2418';
  ctx.fillRect(0, 0, S, S);
  noise(ctx, S, 10000, 0.06);

  // grass patches
  for (let i = 0; i < 80; i++) {
    ctx.fillStyle = `rgba(50,90,40,${0.08 + Math.random() * 0.12})`;
    ctx.beginPath();
    ctx.ellipse(
      S * (0.05 + Math.random() * 0.9),
      S * (0.05 + Math.random() * 0.9),
      (4 + Math.random() * 12) * K,
      (3 + Math.random() * 10) * K,
      Math.random() * Math.PI,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  // dirt roads (cross)
  ctx.fillStyle = '#3a3020';
  rectX(-half + 8, -5, arenaSize - 16, 10);
  rectX(-5, -half + 8, 10, arenaSize - 16);

  // village square
  ctx.fillStyle = 'rgba(90,75,50,0.35)';
  rectX(-14, -14, 28, 28);

  // field patches
  ctx.fillStyle = 'rgba(70,100,45,0.12)';
  rectX(-60, -55, 30, 28);
  rectX(28, 30, 32, 30);
  ctx.fillStyle = 'rgba(120,90,40,0.10)';
  rectX(30, -55, 28, 26);
  rectX(-58, 28, 26, 32);

  // soft grid
  ctx.strokeStyle = 'rgba(180,150,80,0.06)';
  ctx.lineWidth = 2;
  for (let m = -half; m <= half; m += 12.5) {
    ctx.beginPath(); ctx.moveTo(px(m), 0); ctx.lineTo(px(m), S); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, pz(m)); ctx.lineTo(S, pz(m)); ctx.stroke();
  }

  noise(ctx, S, 4000, 0.04);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 8;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Asphalt city grid for City map. */
/** City ground: orthogonal main cross + secondary ring, synced to cityMap layout. */
export function cityGroundTexture(arenaSize: number): THREE.CanvasTexture {
  const S = 2048;
  const K = S / arenaSize;
  const half = arenaSize / 2;
  const px = (x: number) => (x + half) * K;
  const pz = (z: number) => (z + half) * K;
  const { c, ctx } = makeCanvas(S);
  const rectX = (x0: number, z0: number, w: number, d: number) =>
    ctx.fillRect(px(x0), pz(z0), w * K, d * K);

  ctx.fillStyle = '#10141a';
  ctx.fillRect(0, 0, S, S);
  noise(ctx, S, 7000, 0.04);

  // district pavement tiles (slightly varied blocks)
  const block = 16;
  for (let x = -half + 4; x < half - 4; x += block) {
    for (let z = -half + 4; z < half - 4; z += block) {
      ctx.fillStyle = `rgba(42,50,62,${0.10 + Math.random() * 0.07})`;
      rectX(x + 1.2, z + 1.2, block - 2.4, block - 2.4);
    }
  }

  // sidewalks along main avenues (lighter strip outside road)
  const sidewalk = (x0: number, z0: number, w: number, d: number) => {
    ctx.fillStyle = 'rgba(70,82,98,0.16)';
    rectX(x0, z0, w, d);
  };
  // main NS road x∈[-7,7] → sidewalks at |x| 7–9.5
  sidewalk(-9.5, -half + 6, 2.5, arenaSize - 12);
  sidewalk(7, -half + 6, 2.5, arenaSize - 12);
  // main EW road z∈[-7,7]
  sidewalk(-half + 6, -9.5, arenaSize - 12, 2.5);
  sidewalk(-half + 6, 7, arenaSize - 12, 2.5);

  const drawAve = (x0: number, z0: number, w: number, d: number, horizontal: boolean, glow = false) => {
    ctx.fillStyle = '#0a0c10';
    rectX(x0, z0, w, d);
    // wet-sheen edge
    if (glow) {
      ctx.strokeStyle = 'rgba(94,200,255,0.12)';
      ctx.lineWidth = 0.35 * K;
      ctx.strokeRect(px(x0), pz(z0), w * K, d * K);
    }
    ctx.strokeStyle = 'rgba(220,230,255,0.20)';
    ctx.lineWidth = 0.22 * K;
    ctx.setLineDash([2.4 * K, 1.8 * K]);
    ctx.beginPath();
    if (horizontal) {
      ctx.moveTo(px(x0), pz(z0 + d / 2));
      ctx.lineTo(px(x0 + w), pz(z0 + d / 2));
    } else {
      ctx.moveTo(px(x0 + w / 2), pz(z0));
      ctx.lineTo(px(x0 + w / 2), pz(z0 + d));
    }
    ctx.stroke();
    ctx.setLineDash([]);
  };

  // Main cross — synced to cityMap clear corridors |x|<7, |z|<7
  drawAve(-7, -half + 5, 14, arenaSize - 10, false, true);
  drawAve(-half + 5, -7, arenaSize - 10, 14, true, true);

  // Secondary ring corridors ~|x|≈28, |z|≈28 (width ~8)
  drawAve(24, -half + 5, 8, arenaSize - 10, false, false);
  drawAve(-32, -half + 5, 8, arenaSize - 10, false, false);
  drawAve(-half + 5, 24, arenaSize - 10, 8, true, false);
  drawAve(-half + 5, -32, arenaSize - 10, 8, true, false);

  // Plaza under monument
  ctx.fillStyle = 'rgba(50,75,110,0.20)';
  rectX(-15, -15, 30, 30);
  ctx.strokeStyle = 'rgba(94,200,255,0.28)';
  ctx.lineWidth = 0.45 * K;
  ctx.strokeRect(px(-15), pz(-15), 30 * K, 30 * K);
  // inner fountain ring hint
  ctx.strokeStyle = 'rgba(94,200,255,0.14)';
  ctx.lineWidth = 0.3 * K;
  ctx.beginPath();
  ctx.arc(px(0), pz(0), 5 * K, 0, Math.PI * 2);
  ctx.stroke();

  // Crosswalks at main intersection
  for (const [cx, cz, horiz] of [
    [0, -8, true], [0, 8, true], [-8, 0, false], [8, 0, false],
  ] as const) {
    for (let i = 0; i < 7; i++) {
      ctx.fillStyle = 'rgba(220,230,245,0.16)';
      if (horiz) rectX(cx - 7 + i * 2.05, cz - 1.15, 1.15, 2.3);
      else rectX(cx - 1.15, cz - 7 + i * 2.05, 2.3, 1.15);
    }
  }

  // Secondary crosswalks (main × secondary)
  for (const s of [28, -28] as const) {
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = 'rgba(200,220,240,0.10)';
      rectX(s - 3 + i * 1.4, -1.0, 0.9, 2.0);
      rectX(-1.0, s - 3 + i * 1.4, 2.0, 0.9);
    }
  }

  // NE parking stalls paint
  ctx.fillStyle = 'rgba(30,38,48,0.22)';
  rectX(34, 26, 24, 30);
  ctx.strokeStyle = 'rgba(200,210,230,0.12)';
  ctx.lineWidth = 0.15 * K;
  for (let i = 0; i < 5; i++) {
    ctx.strokeRect(px(36), pz(28 + i * 5), 14 * K, 4 * K);
  }

  // Overpass shadow band (south secondary)
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  rectX(-36, -44, 72, 8);
  ctx.strokeStyle = 'rgba(255,77,154,0.10)';
  ctx.lineWidth = 0.25 * K;
  ctx.strokeRect(px(-36), pz(-44), 72 * K, 8 * K);

  // cyan edge wet-glow on main cross centerlines
  ctx.strokeStyle = 'rgba(94,200,255,0.08)';
  ctx.lineWidth = 0.5 * K;
  ctx.beginPath();
  ctx.moveTo(px(0), pz(-half + 8));
  ctx.lineTo(px(0), pz(half - 8));
  ctx.moveTo(px(-half + 8), pz(0));
  ctx.lineTo(px(half - 8), pz(0));
  ctx.stroke();

  noise(ctx, S, 3500, 0.035);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 8;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
