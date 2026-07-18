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
  const S = 3072;
  const K = S / arenaSize;
  const half = arenaSize / 2;
  const px = (x: number) => (x + half) * K;
  const pz = (z: number) => (z + half) * K;
  const { c, ctx } = makeCanvas(S);
  const rectX = (x0: number, z0: number, w: number, d: number) =>
    ctx.fillRect(px(x0), pz(z0), w * K, d * K);

  ctx.fillStyle = '#2a2418';
  ctx.fillRect(0, 0, S, S);
  noise(ctx, S, 14000, 0.06);

  // grass patches
  for (let i = 0; i < 160; i++) {
    ctx.fillStyle = `rgba(50,90,40,${0.08 + Math.random() * 0.12})`;
    ctx.beginPath();
    ctx.ellipse(
      S * (0.05 + Math.random() * 0.9),
      S * (0.05 + Math.random() * 0.9),
      (6 + Math.random() * 20) * K,
      (5 + Math.random() * 16) * K,
      Math.random() * Math.PI,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  const dirtRoad = (x0: number, z0: number, w: number, d: number) => {
    ctx.fillStyle = '#3a3020';
    rectX(x0, z0, w, d);
    // wheel ruts
    ctx.strokeStyle = 'rgba(30,24,14,0.4)';
    ctx.lineWidth = 0.5 * K;
    const horiz = w > d;
    ctx.beginPath();
    if (horiz) {
      ctx.moveTo(px(x0), pz(z0 + d * 0.35)); ctx.lineTo(px(x0 + w), pz(z0 + d * 0.35));
      ctx.moveTo(px(x0), pz(z0 + d * 0.65)); ctx.lineTo(px(x0 + w), pz(z0 + d * 0.65));
    } else {
      ctx.moveTo(px(x0 + w * 0.35), pz(z0)); ctx.lineTo(px(x0 + w * 0.35), pz(z0 + d));
      ctx.moveTo(px(x0 + w * 0.65), pz(z0)); ctx.lineTo(px(x0 + w * 0.65), pz(z0 + d));
    }
    ctx.stroke();
  };

  // main dirt cross (fire lanes) x∈[-10,10], z∈[-10,10]
  dirtRoad(-half + 16, -10, arenaSize - 32, 20);
  dirtRoad(-10, -half + 16, 20, arenaSize - 32);

  // diagonal-ish paths to barn clusters (NW / SE)
  const barnPath = (x0: number, z0: number, x1: number, z1: number) => {
    ctx.strokeStyle = 'rgba(58,48,32,0.7)';
    ctx.lineWidth = 7 * K;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(px(x0), pz(z0));
    ctx.lineTo(px(x1), pz(z1));
    ctx.stroke();
    ctx.lineCap = 'butt';
  };
  barnPath(-10, 10, -90, 82);   // to NW barns
  barnPath(10, -10, 92, -82);   // to SE barns
  barnPath(-10, -10, -82, -46); // to mid-W barn
  barnPath(10, 10, 78, 48);     // to mid-E barn

  // village square (packed earth, worn light)
  ctx.fillStyle = 'rgba(96,80,54,0.4)';
  rectX(-28, -28, 56, 56);
  // cobble ring hint around well
  ctx.strokeStyle = 'rgba(120,108,84,0.3)';
  ctx.lineWidth = 0.6 * K;
  ctx.beginPath();
  ctx.arc(px(0), pz(0), 12 * K, 0, Math.PI * 2);
  ctx.stroke();

  // paddock field patches (green/tilled) near clusters
  ctx.fillStyle = 'rgba(70,100,45,0.14)';
  rectX(-124, -116, 60, 56);
  rectX(60, 62, 64, 60);
  ctx.fillStyle = 'rgba(120,90,40,0.12)';
  rectX(62, -116, 58, 54);   // tilled SE field
  rectX(-120, 58, 54, 64);   // tilled NW field
  // furrow lines on tilled fields
  ctx.strokeStyle = 'rgba(40,32,18,0.25)';
  ctx.lineWidth = 0.4 * K;
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    ctx.moveTo(px(62 + i * 7), pz(-116)); ctx.lineTo(px(62 + i * 7), pz(-62));
    ctx.stroke();
  }

  // soft grid
  ctx.strokeStyle = 'rgba(180,150,80,0.05)';
  ctx.lineWidth = 2;
  for (let m = -half; m <= half; m += 25) {
    ctx.beginPath(); ctx.moveTo(px(m), 0); ctx.lineTo(px(m), S); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, pz(m)); ctx.lineTo(S, pz(m)); ctx.stroke();
  }

  noise(ctx, S, 6000, 0.04);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 8;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Asphalt city grid for City map. */
/** City ground: orthogonal main cross + secondary ring, synced to cityMap layout. */
export function cityGroundTexture(arenaSize: number): THREE.CanvasTexture {
  const S = 3072;
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
  const block = 32;
  for (let x = -half + 8; x < half - 8; x += block) {
    for (let z = -half + 8; z < half - 8; z += block) {
      ctx.fillStyle = `rgba(42,50,62,${0.10 + Math.random() * 0.07})`;
      rectX(x + 2.4, z + 2.4, block - 4.8, block - 4.8);
    }
  }

  // sidewalks along main avenues (lighter strip outside road)
  const sidewalk = (x0: number, z0: number, w: number, d: number) => {
    ctx.fillStyle = 'rgba(70,82,98,0.16)';
    rectX(x0, z0, w, d);
  };
  // main NS road x∈[-14,14] → sidewalks at |x| 14–19
  sidewalk(-19, -half + 12, 5, arenaSize - 24);
  sidewalk(14, -half + 12, 5, arenaSize - 24);
  // main EW road z∈[-14,14]
  sidewalk(-half + 12, -19, arenaSize - 24, 5);
  sidewalk(-half + 12, 14, arenaSize - 24, 5);

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
    ctx.lineWidth = 0.28 * K;
    ctx.setLineDash([4.6 * K, 3.4 * K]);
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

  // Main cross — synced to cityMap clear corridors |x|<14, |z|<14
  drawAve(-14, -half + 10, 28, arenaSize - 20, false, true);
  drawAve(-half + 10, -14, arenaSize - 20, 28, true, true);

  // Secondary ring corridors ~|x|,|z|≈56 (width ~16)
  drawAve(48, -half + 10, 16, arenaSize - 20, false, false);
  drawAve(-64, -half + 10, 16, arenaSize - 20, false, false);
  drawAve(-half + 10, 48, arenaSize - 20, 16, true, false);
  drawAve(-half + 10, -64, arenaSize - 20, 16, true, false);

  // Plaza under monument
  ctx.fillStyle = 'rgba(50,75,110,0.20)';
  rectX(-30, -30, 60, 60);
  ctx.strokeStyle = 'rgba(94,200,255,0.28)';
  ctx.lineWidth = 0.55 * K;
  ctx.strokeRect(px(-30), pz(-30), 60 * K, 60 * K);
  // inner fountain ring hint
  ctx.strokeStyle = 'rgba(94,200,255,0.14)';
  ctx.lineWidth = 0.4 * K;
  ctx.beginPath();
  ctx.arc(px(0), pz(0), 9 * K, 0, Math.PI * 2);
  ctx.stroke();

  // Crosswalks at main intersection
  for (const [cx, cz, horiz] of [
    [0, -16, true], [0, 16, true], [-16, 0, false], [16, 0, false],
  ] as const) {
    for (let i = 0; i < 9; i++) {
      ctx.fillStyle = 'rgba(220,230,245,0.16)';
      if (horiz) rectX(cx - 14 + i * 3.2, cz - 2.3, 2.3, 4.6);
      else rectX(cx - 2.3, cz - 14 + i * 3.2, 4.6, 2.3);
    }
  }

  // Secondary crosswalks (main × secondary)
  for (const s of [56, -56] as const) {
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = 'rgba(200,220,240,0.10)';
      rectX(s - 6 + i * 2.8, -2.0, 1.8, 4.0);
      rectX(-2.0, s - 6 + i * 2.8, 4.0, 1.8);
    }
  }

  // NE parking stalls paint
  ctx.fillStyle = 'rgba(30,38,48,0.22)';
  rectX(68, 52, 48, 60);
  ctx.strokeStyle = 'rgba(200,210,230,0.12)';
  ctx.lineWidth = 0.2 * K;
  for (let i = 0; i < 5; i++) {
    ctx.strokeRect(px(72), pz(56 + i * 10), 28 * K, 8 * K);
  }

  // Overpass shadow band (south secondary z≈-80)
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  rectX(-74, -88, 148, 16);
  ctx.strokeStyle = 'rgba(255,77,154,0.10)';
  ctx.lineWidth = 0.3 * K;
  ctx.strokeRect(px(-74), pz(-88), 148 * K, 16 * K);

  // cyan edge wet-glow on main cross centerlines
  ctx.strokeStyle = 'rgba(94,200,255,0.08)';
  ctx.lineWidth = 0.7 * K;
  ctx.beginPath();
  ctx.moveTo(px(0), pz(-half + 16));
  ctx.lineTo(px(0), pz(half - 16));
  ctx.moveTo(px(-half + 16), pz(0));
  ctx.lineTo(px(half - 16), pz(0));
  ctx.stroke();

  noise(ctx, S, 3500, 0.035);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 8;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
