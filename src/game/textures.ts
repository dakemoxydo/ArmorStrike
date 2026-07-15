// ===== Процедурные canvas-текстуры для прототипа =====
import * as THREE from 'three';

function makeCanvas(size: number) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return { c, ctx: c.getContext('2d')! };
}

function toTexture(c: HTMLCanvasElement, repeat = 1): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 4;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function noise(ctx: CanvasRenderingContext2D, size: number, n: number, alpha: number) {
  for (let i = 0; i < n; i++) {
    const v = Math.floor(Math.random() * 255);
    ctx.fillStyle = `rgba(${v},${v},${v},${alpha * Math.random()})`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
}

// --- Пол арены: тёмные металлические плиты + светящаяся сетка ---
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
  // крупная энергетическая сетка
  for (let i = 0; i <= S; i += cell * 4) {
    ctx.strokeStyle = 'rgba(46,230,192,0.16)';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, S); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(S, i); ctx.stroke();
  }
  // болты на стыках
  ctx.fillStyle = 'rgba(200,220,240,0.10)';
  for (let x = cell; x < S; x += cell) {
    for (let y = cell; y < S; y += cell) {
      ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
    }
  }
  // царапины
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

// --- Ящик/блок: металл + шевроны ---
export function crateTexture(accent: string, dark = '#232c3a', light = '#33405a'): THREE.CanvasTexture {
  const S = 512;
  const { c, ctx } = makeCanvas(S);
  const g = ctx.createLinearGradient(0, 0, 0, S);
  g.addColorStop(0, light);
  g.addColorStop(1, dark);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  noise(ctx, S, 2500, 0.06);

  // рамка панели
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = 22;
  ctx.strokeRect(11, 11, S - 22, S - 22);
  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.lineWidth = 3;
  ctx.strokeRect(30, 30, S - 60, S - 60);

  // крестовина
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 14;
  ctx.beginPath(); ctx.moveTo(40, 40); ctx.lineTo(S - 40, S - 40); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(S - 40, 40); ctx.lineTo(40, S - 40); ctx.stroke();

  // шевроны опасности снизу
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

  // заклёпки
  ctx.fillStyle = 'rgba(220,235,255,0.25)';
  for (const [x, y] of [[56, 56], [S - 56, 56], [56, S - 130], [S - 56, S - 130]] as const) {
    ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill();
  }
  return toTexture(c, 1);
}

// --- Стена: панели + предупреждающая полоса + окна ангара ---
export function wallTexture(): THREE.CanvasTexture {
  const S = 512;
  const { c, ctx } = makeCanvas(S);
  ctx.fillStyle = '#161d29';
  ctx.fillRect(0, 0, S, S);
  noise(ctx, S, 2200, 0.05);
  // вертикальные швы
  for (let x = 0; x <= S; x += 128) {
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, S); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x + 6, 0); ctx.lineTo(x + 6, S); ctx.stroke();
  }
  // ряд окон-щелей с тёплым светом
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
  // вентиляционные круги
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
  // тёплая световая полоса
  const g = ctx.createLinearGradient(0, 250, 0, 286);
  g.addColorStop(0, 'rgba(255,150,40,0)');
  g.addColorStop(0.5, 'rgba(255,150,40,0.5)');
  g.addColorStop(1, 'rgba(255,150,40,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 250, S, 36);
  // нижняя аварийная зона
  for (let x = -40; x < S + 40; x += 64) {
    ctx.fillStyle = 'rgba(255,170,40,0.55)';
    ctx.beginPath();
    ctx.moveTo(x, S); ctx.lineTo(x + 32, S - 56);
    ctx.lineTo(x + 64, S - 56); ctx.lineTo(x + 32, S);
    ctx.closePath(); ctx.fill();
  }
  return toTexture(c, 4);
}

// --- Гусеница ---
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

// --- Камуфляж корпуса ---
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

// --- Радиальное свечение (спрайты, вспышки) ---
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

// --- Дым ---
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

// --- Ожог на земле ---
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

// --- Гекс-сетка для энергетического купола ---
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

// ============================================================
// ===== БОЛЬШАЯ КАРТА ПОЛА ЗАВОДА (один canvas на всю арену) =====
// ============================================================
export function factoryGroundTexture(arenaSize: number): THREE.CanvasTexture {
  const S = 2048;
  const K = S / arenaSize;                       // px на метр
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

  // --- базовый бетон ---
  ctx.fillStyle = '#151920';
  ctx.fillRect(0, 0, S, S);
  noise(ctx, S, 9000, 0.05);

  // --- тонировки цехов ---
  ctx.fillStyle = 'rgba(120,140,165,0.08)'; rectX(-19, -16, 38, 32);             // центральный цех
  ctx.fillStyle = 'rgba(255,110,40,0.07)';  rectX(-30, -62, 40, 26);            // литейный
  ctx.fillStyle = 'rgba(70,160,190,0.06)';  rectX(4, 36, 40, 28);               // резервуары
  ctx.fillStyle = 'rgba(150,160,120,0.07)'; rectX(-66, -34, 32, 68);            // контейнерный двор
  ctx.fillStyle = 'rgba(90,110,150,0.07)';  rectX(36, -38, 26, 76);             // трубопроводы

  // --- периметровое кольцевое шоссе ---
  ctx.strokeStyle = '#10141b';
  ctx.lineWidth = 10 * K;
  const inset = half - 13;
  ctx.strokeRect(px(-inset), pz(-inset), inset * 2 * K, inset * 2 * K);
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 0.25 * K;
  ctx.strokeRect(px(-inset + 4.6), pz(-inset + 4.6), (inset - 4.6) * 2 * K, (inset - 4.6) * 2 * K);

  // --- главные дороги (H: z=±18, V: x=±30) ---
  const drawRoad = (x0: number, z0: number, w: number, d: number, horizontal: boolean) => {
    ctx.fillStyle = '#0f1319';
    rectX(x0, z0, w, d);
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 0.2 * K;
    ctx.strokeRect(px(x0), pz(z0), w * K, d * K);
    // пунктир по центру
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

  // --- ж/д пути на западе (x = -38) ---
  const railY = { z0: -inset, z1: inset };
  ctx.fillStyle = 'rgba(20,16,12,0.85)';
  rectX(-39.6, railY.z0, 3.2, railY.z1 - railY.z0);
  // шпалы
  ctx.fillStyle = 'rgba(60,48,36,0.7)';
  for (let z = railY.z0; z < railY.z1; z += 2.0) rectX(-40, z, 4.0, 0.5);
  // рельсы
  ctx.fillStyle = 'rgba(150,160,175,0.5)';
  rectX(-39.2, railY.z0, 0.28, railY.z1 - railY.z0);
  rectX(-37.1, railY.z0, 0.28, railY.z1 - railY.z0);
  // переезды через дороги
  hazardBand(-41, -23.4, 6, 1.4);
  hazardBand(-41, 21.9, 6, 1.4);

  // --- швами плиты каждые 12.5 м ---
  ctx.strokeStyle = 'rgba(255,255,255,0.035)';
  ctx.lineWidth = 2;
  for (let m = -half; m <= half; m += 12.5) {
    ctx.beginPath(); ctx.moveTo(px(m), 0); ctx.lineTo(px(m), S); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, pz(m)); ctx.lineTo(S, pz(m)); ctx.stroke();
  }

  // --- аварийные полосы у козлового крана и рамп ---
  hazardBand(-22.6, -8.6, 45.2, 1.6);
  hazardBand(-22.6, 7.0, 45.2, 1.6);

  // --- разливы масла ---
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = `rgba(4,6,10,${0.14 + Math.random() * 0.12})`;
    ctx.beginPath();
    ctx.ellipse(S * (0.08 + Math.random() * 0.84), S * (0.08 + Math.random() * 0.84),
      (2 + Math.random() * 4) * K, (1.2 + Math.random() * 2.4) * K, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  // --- следы шин ---
  ctx.strokeStyle = 'rgba(8,10,12,0.28)';
  for (let i = 0; i < 12; i++) {
    ctx.lineWidth = 0.55 * K;
    ctx.beginPath();
    ctx.arc(S * (0.1 + Math.random() * 0.8), S * (0.1 + Math.random() * 0.8),
      (5 + Math.random() * 9) * K, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2 + 0.9);
    ctx.stroke();
  }
  // --- люки ---
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

  // --- крупные маркировки цехов ---
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

  // --- зоны погрузки: полосатые площадки ---
  hazardBand(-63, -14, 5, 28);
  hazardBand(56, -14, 5, 28);

  noise(ctx, S, 5000, 0.04);

  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 8;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// --- Морской/производственный контейнер ---
export function containerTexture(color: string, label: string, darkShade: string): THREE.CanvasTexture {
  const S = 512;
  const { c, ctx } = makeCanvas(S);
  const bg = ctx.createLinearGradient(0, 0, 0, S);
  bg.addColorStop(0, color);
  bg.addColorStop(1, darkShade);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, S, S);

  // вертикальные рёбра контейнера
  for (let x = 0; x < S; x += 52) {
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.fillRect(x, 0, 14, S);
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.fillRect(x + 14, 0, 5, S);
  }
  // рама
  ctx.strokeStyle = 'rgba(0,0,0,0.65)';
  ctx.lineWidth = 20;
  ctx.strokeRect(10, 10, S - 20, S - 20);

  // стенсил-надпись
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

  // нижняя полоса опасности
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

// --- Барельеф металлической бочки ---
export function barrelTexture(color: string): THREE.CanvasTexture {
  const S = 256;
  const { c, ctx } = makeCanvas(S);
  const bg = ctx.createLinearGradient(0, 0, 0, S);
  bg.addColorStop(0, color);
  bg.addColorStop(1, '#141a22');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, S, S);
  // обручи
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

// --- Промышленный щит-вывеска ---
export function signTexture(main: string, sub: string): THREE.CanvasTexture {
  const W = 1024, H = 256;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d')!;
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#141b26');
  bg.addColorStop(1, '#0a0e15');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  noise(ctx, H, 900, 0.06);
  // рамка + хзард углы
  ctx.strokeStyle = 'rgba(255,176,46,0.8)';
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, W - 10, H - 10);
  // текст
  ctx.textAlign = 'center';
  ctx.font = `bold 118px 'Russo One','Exo 2',sans-serif`;
  const tg = ctx.createLinearGradient(0, 40, 0, 160);
  tg.addColorStop(0, '#7dfce0');
  tg.addColorStop(1, '#2fbf9e');
  ctx.fillStyle = tg;
  ctx.fillText(main, W / 2, 150);
  ctx.font = `bold 44px 'Exo 2',sans-serif`;
  ctx.fillStyle = 'rgba(255,190,90,0.85)';
  ctx.fillText(sub, W / 2, 216);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// --- Тёмный мозаичный металл для опорных конструкций ---
export function structureTexture(): THREE.CanvasTexture {
  const S = 256;
  const { c, ctx } = makeCanvas(S);
  ctx.fillStyle = '#1d2733';
  ctx.fillRect(0, 0, S, S);
  noise(ctx, S, 1400, 0.06);
  // заклёпки по сетке
  ctx.fillStyle = 'rgba(200,220,240,0.16)';
  for (let x = 16; x < S; x += 32) {
    for (let y = 16; y < S; y += 32) {
      ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
    }
  }
  // швы
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.lineWidth = 3;
  for (let m = 0; m <= S; m += 128) {
    ctx.beginPath(); ctx.moveTo(m, 0); ctx.lineTo(m, S); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, m); ctx.lineTo(S, m); ctx.stroke();
  }
  return toTexture(c, 3);
}
