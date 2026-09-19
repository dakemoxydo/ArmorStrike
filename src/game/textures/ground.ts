import * as THREE from 'three';
import { cachedTexture, cachedTextureEvict, cachedTextureHas, makeCanvas } from './shared';

/**
 * Factory ground: литейный комплекс ЗАВОД-51 (arena 300).
 * Синхронизировано с layout из `arena/factoryMap.ts`:
 *   main cross x∈[−13,13] / z∈[−13,13] · centre plaza |x|,|z|<34 + CP-B ring
 *   ring road |x|,|z|∈[34,46] · foundry (NW) molten zone · container bays (NE)
 *   tank-farm pads (SE) · assembly pads + pipe-rack shadow (SW) · rail siding (SE outer)
 *   outer storage pads on the diagonals · CP rings A/B/C · hazard bands
 */
export function factoryGroundTexture(arenaSize: number): THREE.CanvasTexture {
  return cachedGround('ground:factory', arenaSize, () => {
  const S = 3072;
  const K = S / arenaSize;
  const half = arenaSize / 2;
  const px = (x: number) => (x + half) * K;
  const pz = (z: number) => (z + half) * K;
  const { c, ctx } = makeCanvas(S);

  const rectX = (x0: number, z0: number, w: number, d: number) => ctx.fillRect(px(x0), pz(z0), w * K, d * K);
  const hazardBand = (x0: number, z0: number, w: number, d: number, alpha = 0.16) => {
    ctx.save();
    ctx.beginPath();
    ctx.rect(px(x0), pz(z0), w * K, d * K);
    ctx.clip();
    for (let i = -d; i < w + d; i += 2.6) {
      ctx.fillStyle = `rgba(255,176,46,${alpha})`;
      ctx.save();
      ctx.translate(px(x0 + i), pz(z0));
      ctx.rotate(0.785);
      ctx.fillRect(0, -d * K, 1.3 * K, (w + 2 * d) * K);
      ctx.restore();
    }
    ctx.restore();
  };
  const ring = (x: number, z: number, r: number, stroke: string, width: number, dash: number[] = []) => {
    ctx.save();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width * K;
    ctx.setLineDash(dash.map((v) => v * K));
    ctx.beginPath();
    ctx.arc(px(x), pz(z), r * K, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  };
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

  // ── base: строгий индустриальный сланец (без перлина) ─────────────────────
  ctx.fillStyle = '#3c4452';
  ctx.fillRect(0, 0, S, S);

  // ── district slabs (тональная разметка промышленных зон) ───────────────────
  ctx.fillStyle = 'rgba(239,68,68,0.12)';    rectX(-120, 30, 84, 56);   // NW foundry (термо-плита)
  ctx.fillStyle = 'rgba(59,130,246,0.12)';   rectX(40, 30, 96, 56);     // NE containers (стальной терминал)
  ctx.fillStyle = 'rgba(34,197,94,0.10)';    rectX(-124, -84, 92, 58);  // SW assembly
  ctx.fillStyle = 'rgba(100,116,139,0.14)';  rectX(38, -84, 100, 60);   // SE power/tanks
  ctx.fillStyle = 'rgba(241,245,249,0.14)';  rectX(-34, -34, 68, 68);   // centre plaza (светлый бетон)

  // ── lanes: main cross + ring road ─────────────────────────────────────────
  const lane = (x0: number, z0: number, w: number, d: number, horizontal: boolean, glow = false) => {
    ctx.fillStyle = '#222832';
    rectX(x0, z0, w, d);
    ctx.strokeStyle = 'rgba(11,14,20,0.45)';
    ctx.lineWidth = 0.25 * K;
    ctx.strokeRect(px(x0), pz(z0), w * K, d * K);
    if (glow) {
      ctx.strokeStyle = 'rgba(96,165,250,0.35)';
      ctx.lineWidth = 0.45 * K;
      ctx.strokeRect(px(x0), pz(z0), w * K, d * K);
    }
    // Чистая кипенно-белая разметка
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 0.35 * K;
    ctx.setLineDash([3.0 * K, 2.2 * K]);
    ctx.beginPath();
    if (horizontal) { ctx.moveTo(px(x0), pz(z0 + d / 2)); ctx.lineTo(px(x0 + w), pz(z0 + d / 2)); }
    else { ctx.moveTo(px(x0 + w / 2), pz(z0)); ctx.lineTo(px(x0 + w / 2), pz(z0 + d)); }
    ctx.stroke();
    ctx.setLineDash([]);
  };
  lane(-13, -half + 6, 26, arenaSize - 12, false, true);   // N–S main (primary fire lane)
  lane(-half + 6, -13, arenaSize - 12, 26, true, true);    // E–W main (primary fire lane)
  // ring road |x|,|z| ∈ [34,46] — secondary circulation around the plaza
  lane(34, -half + 6, 12, arenaSize - 12, false);
  lane(-46, -half + 6, 12, arenaSize - 12, false);
  lane(-half + 6, 34, arenaSize - 12, 12, true);
  lane(-half + 6, -46, arenaSize - 12, 12, true);

  // hazard stripes on the plaza mouths (crossing the ring road)
  hazardBand(-13, 30, 26, 5);
  hazardBand(-13, -35, 26, 5);
  hazardBand(30, -13, 5, 26);
  hazardBand(-35, -13, 5, 26);

  // ── centre plaza: chevrons под козловым краном + CP-B ─────────────────────
  hazardBand(-32, -6, 64, 12, 0.12);
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 0.45 * K;
  ctx.strokeRect(px(-32), pz(-32), 64 * K, 64 * K);
  // crane rail beds (legs at x ±36, z ±9)
  ctx.fillStyle = 'rgba(10,13,17,0.92)';
  rectX(-40, -11.4, 80, 2.6);
  rectX(-40, 8.8, 80, 2.6);
  ctx.fillStyle = 'rgba(240,245,255,0.6)';
  rectX(-40, -10.4, 80, 0.32);
  rectX(-40, 10.2, 80, 0.32);
  // molten runner crossing the plaza floor (visual tie-in с литейкой)
  ctx.strokeStyle = 'rgba(239,68,68,0.30)';
  ctx.lineWidth = 1.6 * K;
  ctx.beginPath();
  ctx.moveTo(px(-30), pz(24));
  ctx.lineTo(px(-30), pz(-14));
  ctx.lineTo(px(30), pz(-14));
  ctx.stroke();

  // ── capture-point rings (anchors from match/captureAnchors.ts) ────────────
  const cp: [string, number, number][] = [['A', -88, 8], ['B', 0, 0], ['C', 92, -6]];
  for (const [id, cx, cz] of cp) {
    ring(cx, cz, 20, 'rgba(59,130,246,0.5)', 0.5, [3.2, 2.4]);
    ring(cx, cz, 6, 'rgba(255,255,255,0.35)', 0.35);
    label(id, cx, cz, 0, 7, '#ffffff');
  }

  // ── пробивающаяся зелень и мох в индустриальной зоне ───────────────────────
  const grassPatch = (gx: number, gz: number, gw: number, gd: number) => {
    ctx.fillStyle = 'rgba(46,125,50,0.35)';
    rectX(gx, gz, gw, gd);
    ctx.fillStyle = 'rgba(67,160,71,0.25)';
    rectX(gx + 1, gz + 1, Math.max(1, gw - 2), Math.max(1, gd - 2));
    ctx.strokeStyle = 'rgba(27,94,32,0.4)';
    ctx.lineWidth = 0.25 * K;
    ctx.strokeRect(px(gx), pz(gz), gw * K, gd * K);
  };
  grassPatch(82, -122, 62, 5);
  grassPatch(80, -104, 60, 4);
  grassPatch(-136, -136, 24, 20);
  grassPatch(112, 112, 22, 22);
  grassPatch(-136, 112, 20, 22);
  grassPatch(-128, -60, 10, 30);
  grassPatch(124, 20, 8, 36);

  // ── NW foundry: расплав, шлак, трещины ────────────────────────────────────
  ctx.fillStyle = 'rgba(255,106,16,0.14)';
  rectX(-72, 52, 22, 18);
  ctx.fillStyle = 'rgba(255,140,40,0.10)';
  rectX(-100, 34, 34, 20);
  // molten runners: furnace (−62,62) → ladle (−62,44) → casting hall (−96,40)
  ctx.strokeStyle = 'rgba(255,106,16,0.30)';
  ctx.lineWidth = 1.5 * K;
  ctx.beginPath();
  ctx.moveTo(px(-62), pz(56));
  ctx.lineTo(px(-62), pz(46));
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(px(-66), pz(44));
  ctx.lineTo(px(-88), pz(42));
  ctx.stroke();
  // heat-cracked slab
  ctx.strokeStyle = 'rgba(255,120,40,0.16)';
  for (let i = 0; i < 10; i++) {
    ctx.lineWidth = 0.2 * K;
    const sx = px(-118 + Math.random() * 60);
    const sz = pz(32 + Math.random() * 46);
    ctx.beginPath();
    ctx.moveTo(sx, sz);
    ctx.lineTo(sx + (Math.random() - 0.5) * 14 * K, sz + (Math.random() - 0.5) * 14 * K);
    ctx.stroke();
  }
  label('ЛИТЕЙКА', -64, 70, 0, 5.6, 'rgba(255,150,70,0.20)');
  label('ДОМНА-1', -62, 62, 0, 3.6, 'rgba(255,120,50,0.26)');
  label('РАЗЛИВКА', -96, 46, 0, 4.4, 'rgba(255,150,70,0.16)');
  label('ОПАСНО', -62, 36, 0, 3.2, 'rgba(255,120,50,0.22)');

  // ── NE container terminal: stacking bays ──────────────────────────────────
  ctx.strokeStyle = 'rgba(200,220,240,0.10)';
  ctx.lineWidth = 0.22 * K;
  for (let bz = 34; bz <= 70; bz += 12) {
    ctx.strokeRect(px(48), pz(bz), 10 * K, 8 * K);
    ctx.strokeRect(px(64), pz(bz), 10 * K, 8 * K);
  }
  ctx.fillStyle = 'rgba(30,38,48,0.20)';
  rectX(44, 32, 36, 42);
  label('КОНТЕЙНЕРЫ', 70, 74, 0, 5.2, 'rgba(90,200,255,0.16)');
  label('ТЕРМИНАЛ-2', 66, 52, Math.PI / 2, 3.6, 'rgba(140,190,230,0.14)');

  // ── SE tank farm: bunded circular pads ────────────────────────────────────
  for (const [tx, tz] of [[92, -52], [108, -52], [92, -68], [108, -68]] as const) {
    ctx.fillStyle = 'rgba(70,82,98,0.22)';
    ctx.beginPath();
    ctx.arc(px(tx), pz(tz), 6.6 * K, 0, Math.PI * 2);
    ctx.fill();
    ring(tx, tz, 6.6, 'rgba(255,176,46,0.22)', 0.4, [2.0, 1.6]);
  }
  ctx.fillStyle = 'rgba(150,160,120,0.05)';
  rectX(80, -84, 44, 42);
  label('РЕЗЕРВУАРЫ', 100, -80, 0, 5.0, 'rgba(140,170,255,0.15)');
  label('М-12', 118, -60, Math.PI / 2, 3.6, 'rgba(140,170,255,0.14)');

  // ── SW assembly: workshop pads + pipe-rack shadow ─────────────────────────
  ctx.fillStyle = 'rgba(150,160,120,0.10)';
  rectX(-114, -62, 36, 20);
  rectX(-66, -79, 28, 18);
  // pipe rack runs along z = −38, x −120..−40
  ctx.fillStyle = 'rgba(6,8,11,0.55)';
  rectX(-120, -41.6, 80, 7.2);
  ctx.fillStyle = 'rgba(150,160,175,0.16)';
  for (const rz of [-41.0, -40.0, -39.0]) rectX(-120, rz, 80, 0.22);
  label('СБОРКА', -96, -52, 0, 5.0, 'rgba(180,200,160,0.15)');
  label('ЦЕХ-7', -52, -70, 0, 4.2, 'rgba(180,200,160,0.14)');

  // ── SE outer: rail siding (x 84..142 at z = −112) ─────────────────────────
  ctx.fillStyle = 'rgba(20,16,12,0.85)';
  rectX(84, -114.6, 58, 5.2);
  ctx.fillStyle = 'rgba(60,48,36,0.7)';
  for (let rx = 84; rx < 142; rx += 2.0) rectX(rx, -115.2, 0.7, 6.4);
  ctx.fillStyle = 'rgba(150,160,175,0.5)';
  rectX(84, -114.2, 58, 0.26);
  rectX(84, -110.0, 58, 0.26);
  label('ПОГРУЗКА', 112, -106, 0, 4.0, 'rgba(255,255,255,0.12)');

  // ── outer storage pads (diagonals) ────────────────────────────────────────
  for (const [sx, sz] of [[-108, 108], [108, 108], [-108, -108], [108, -108]] as const) {
    ctx.fillStyle = 'rgba(60,70,84,0.22)';
    rectX(sx - 16, sz - 14, 32, 28);
    hazardBand(sx - 16, sz - 14, 32, 2.0, 0.12);
    hazardBand(sx - 16, sz + 12, 32, 2.0, 0.12);
  }
  label('СКЛАД', -108, 100, 0, 4.4, 'rgba(255,255,255,0.12)');
  label('ТРУБЫ', 108, 100, 0, 4.4, 'rgba(255,255,255,0.12)');
  label('МЕТАЛЛОЛОМ', -108, -100, 0, 4.0, 'rgba(255,255,255,0.12)');
  label('А-1', 108, -100, 0, 4.4, 'rgba(255,255,255,0.12)');

  // corner smokestack scorch rings (±144, ±144)
  for (const [sx, sz] of [[-144, 144], [144, 144], [-144, -144], [144, -144]] as const) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.arc(px(sx), pz(sz), 5.4 * K, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── perimeter service road inside the walls ───────────────────────────────
  ctx.strokeStyle = 'rgba(255,255,255,0.045)';
  ctx.lineWidth = 0.5 * K;
  ctx.setLineDash([6 * K, 4 * K]);
  ctx.strokeRect(px(-132), pz(-132), 264 * K, 264 * K);
  ctx.setLineDash([]);

  // ── ink slab grid (комиксные швы плит, без зерна) ─────────────────────────
  ctx.strokeStyle = 'rgba(11,14,20,0.22)';
  ctx.lineWidth = 2;
  for (let m = -half; m <= half; m += 25) {
    ctx.beginPath(); ctx.moveTo(px(m), 0); ctx.lineTo(px(m), S); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, pz(m)); ctx.lineTo(S, pz(m)); ctx.stroke();
  }
  label('ЗАВОД-51', 0, 128, 0, 9, 'rgba(255,255,255,0.35)');
  label('ЗАВОД-51', 0, -136, 0, 9, 'rgba(255,255,255,0.35)');

    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 8;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  });
}

/** Earthy packed-dirt ground for Village map (LRU-1 slot: 'ground:last'). */
export function villageGroundTexture(arenaSize: number): THREE.CanvasTexture {
  // LRU-1: evicts the previous 'ground:last' entry (and its GPU texture)
  // before building this one — see cachedGround() below.
  return cachedGround('ground:village', arenaSize, () => {
  const S = 3072;
  const K = S / arenaSize;
  const half = arenaSize / 2;
  const px = (x: number) => (x + half) * K;
  const pz = (z: number) => (z + half) * K;
  const { c, ctx } = makeCanvas(S);
  const rectX = (x0: number, z0: number, w: number, d: number) =>
    ctx.fillRect(px(x0), pz(z0), w * K, d * K);
  const ring = (x: number, z: number, r: number, stroke: string, width: number, dash: number[] = []) => {
    ctx.save();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width * K;
    ctx.setLineDash(dash.map((v) => v * K));
    ctx.beginPath();
    ctx.arc(px(x), pz(z), r * K, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  };
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

  ctx.fillStyle = '#2e7d32';
  ctx.fillRect(0, 0, S, S);

  // graphic field slabs (сочные оттенки природной зелени, ink-швы)
  const fieldSlab = (x0: number, z0: number, w: number, d: number, tone: string) => {
    ctx.fillStyle = tone;
    rectX(x0, z0, w, d);
    ctx.strokeStyle = 'rgba(11,14,20,0.30)';
    ctx.lineWidth = 0.35 * K;
    ctx.strokeRect(px(x0), pz(z0), w * K, d * K);
  };
  fieldSlab(-148, -148, 96, 72, '#388e3c');
  fieldSlab(-40, -148, 88, 64, '#43a047');
  fieldSlab(56, -148, 92, 70, '#2e7d32');
  fieldSlab(-148, -64, 70, 88, '#4caf50');
  fieldSlab(78, -64, 70, 90, '#2e7d32');
  fieldSlab(-148, 40, 92, 108, '#388e3c');
  fieldSlab(56, 48, 92, 100, '#43a047');

  const dirtRoad = (x0: number, z0: number, w: number, d: number) => {
    ctx.fillStyle = '#543d2b';
    rectX(x0, z0, w, d);
    // wheel ruts
    ctx.strokeStyle = 'rgba(26,18,12,0.45)';
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

  // trodden paths to the landmarks (barns NW/SE, chapel SW, windmill NE)
  const path = (x0: number, z0: number, x1: number, z1: number, width = 7) => {
    ctx.strokeStyle = 'rgba(74,54,36,0.75)';
    ctx.lineWidth = width * K;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(px(x0), pz(z0));
    ctx.lineTo(px(x1), pz(z1));
    ctx.stroke();
    ctx.lineCap = 'butt';
  };
  path(-10, 10, -98, 82);     // to NW barns
  path(10, -10, 98, -82);     // to SE barns
  path(-10, -10, -86, -52);   // to mid-W barn
  path(10, 10, 84, 50);       // to mid-E barn
  path(-16, 24, -104, -100);  // to the chapel
  path(16, 16, 118, 108);     // to the windmill
  path(-20, 32, -48, 48, 5);  // to the pond

  // ── village square: светлая контрастная брусчатка (|x|,|z| < 30) ───────────
  ctx.fillStyle = '#dce5e0';
  rectX(-30, -30, 60, 60);
  ctx.strokeStyle = 'rgba(11,14,20,0.35)';
  ctx.lineWidth = 0.4 * K;
  for (let x = -28; x < 28; x += 4) {
    for (let z = -28; z < 28; z += 4) {
      ctx.fillStyle = ((Math.abs(Math.round(x * 7 + z * 11)) % 3) === 0) ? '#edf5f1' : '#d2ddd7';
      ctx.fillRect(px(x), pz(z), 3.6 * K, 3.6 * K);
      ctx.strokeRect(px(x), pz(z), 3.6 * K, 3.6 * K);
    }
  }
  // white-chalk stone ring around the well (-16,30) and plaza centre
  ring(-16, 30, 6.5, 'rgba(255,255,255,0.65)', 0.8);
  ring(0, 0, 15, 'rgba(255,255,255,0.45)', 0.6, [3, 2]);

  // ── capture-point rings (anchors from match/captureAnchors.ts) ────────────
  const cp: [string, number, number][] = [['A', 0, 4], ['B', -100, 20], ['C', 100, -20]];
  for (const [id, cx, cz] of cp) {
    ring(cx, cz, 20, 'rgba(59,130,246,0.5)', 0.5, [3.2, 2.4]);
    ring(cx, cz, 6, 'rgba(255,255,255,0.40)', 0.35);
    label(id, cx, cz, 0, 7, '#ffffff');
  }

  // ── churchyard at the chapel (-104, -100 / tower -116) ───────────────────
  ctx.fillStyle = 'rgba(148,163,184,0.35)';
  rectX(-113, -124, 18, 40);
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 0.5 * K;
  ctx.strokeRect(px(-113), pz(-124), 18 * K, 40 * K);
  label('ЧАСОВНЯ', -104, -84, 0, 4.6, '#ffffff');

  // ── pond (NW inner): сочный лазурно-синий водоём ─────────────────────────
  ctx.fillStyle = '#0284c7';
  ctx.beginPath();
  ctx.ellipse(px(-48), pz(48), 12 * K, 9 * K, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(30,41,59,0.5)';
  ctx.beginPath();
  ctx.ellipse(px(-48), pz(48), 14.4 * K, 11.2 * K, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0369a1';
  ctx.beginPath();
  ctx.ellipse(px(-48), pz(48), 11.4 * K, 8.4 * K, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(56,189,248,0.4)';
  ctx.lineWidth = 0.4 * K;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.ellipse(px(-48), pz(48), (3 + i * 2) * K, (2 + i * 1.5) * K, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  label('ПРУД', -48, 66, 0, 4.2, '#ffffff');

  // ── orchard plot (SW inner, x −60..−40 · z −42..−62) ─────────────────────
  ctx.fillStyle = 'rgba(74,222,128,0.25)';
  rectX(-66, -68, 32, 32);
  ctx.fillStyle = 'rgba(67,40,24,0.4)';
  for (const ox of [-60, -50, -40]) {
    for (const oz of [-42, -52, -62]) {
      ctx.beginPath();
      ctx.arc(px(ox), pz(oz), 3.4 * K, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  label('САД', -50, -72, 0, 4.2, '#ffffff');

  // paddock field patches (green pasture) near the barn clusters
  ctx.fillStyle = 'rgba(34,197,94,0.22)';
  rectX(-124, -116, 60, 56);
  rectX(60, 62, 64, 60);
  // wheat fields (контрастное золото пшеницы)
  const wheatField = (x0: number, z0: number, w: number, d: number, horiz: boolean) => {
    ctx.fillStyle = 'rgba(234,179,8,0.38)';
    rectX(x0, z0, w, d);
    ctx.strokeStyle = 'rgba(161,98,7,0.45)';
    ctx.lineWidth = 0.35 * K;
    const step = 3.4;
    if (horiz) {
      for (let i = 1; i < d / step; i++) {
        ctx.beginPath();
        ctx.moveTo(px(x0), pz(z0 + i * step)); ctx.lineTo(px(x0 + w), pz(z0 + i * step));
        ctx.stroke();
      }
    } else {
      for (let i = 1; i < w / step; i++) {
        ctx.beginPath();
        ctx.moveTo(px(x0 + i * step), pz(z0)); ctx.lineTo(px(x0 + i * step), pz(z0 + d));
        ctx.stroke();
      }
    }
  };
  wheatField(-132, 26, 50, 66, false);   // W wheat
  wheatField(84, -126, 62, 58, true);    // E wheat
  wheatField(86, 92, 52, 34, true);      // E-mid wheat strip
  // tilled fields (коричневые борозды)
  ctx.fillStyle = 'rgba(92,64,51,0.24)';
  rectX(88, -116, 54, 54);   // tilled E field
  rectX(-132, 58, 50, 62);   // tilled NW field
  ctx.strokeStyle = 'rgba(40,26,18,0.4)';
  ctx.lineWidth = 0.4 * K;
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    ctx.moveTo(px(88 + i * 6.6), pz(-116)); ctx.lineTo(px(88 + i * 6.6), pz(-62));
    ctx.stroke();
  }
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    ctx.moveTo(px(-132), pz(58 + i * 7.6)); ctx.lineTo(px(-82), pz(58 + i * 7.6));
    ctx.stroke();
  }

  // ink slab grid
  ctx.strokeStyle = 'rgba(11,14,20,0.14)';
  ctx.lineWidth = 2;
  for (let m = -half; m <= half; m += 25) {
    ctx.beginPath(); ctx.moveTo(px(m), 0); ctx.lineTo(px(m), S); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, pz(m)); ctx.lineTo(S, pz(m)); ctx.stroke();
  }
  label('ДЕРЕВНЯ', 0, 128, 0, 9, 'rgba(255,255,255,0.45)');
  label('ДЕРЕВНЯ', 0, -136, 0, 9, 'rgba(255,255,255,0.45)');
  label('ПЛОЩАДЬ', 0, -30, 0, 4.6, 'rgba(255,255,255,0.50)');
  label('МЕЛЬНИЦА', 118, 96, 0, 4.2, 'rgba(255,255,255,0.40)');
  label('АМБАР', -98, 74, 0, 4.2, 'rgba(255,255,255,0.40)');
  label('АМБАР', 98, -74, 0, 4.2, 'rgba(255,255,255,0.40)');
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 8;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  });
}

/** Asphalt city grid for City map. */
/** City ground: orthogonal main cross + secondary ring, synced to cityMap layout. */
export function cityGroundTexture(arenaSize: number): THREE.CanvasTexture {
  // LRU-1: evicts the previous 'ground:last' entry (and its GPU texture).
  return cachedGround('ground:city', arenaSize, () => {
  const S = 3072;
  const K = S / arenaSize;
  const half = arenaSize / 2;
  const px = (x: number) => (x + half) * K;
  const pz = (z: number) => (z + half) * K;
  const { c, ctx } = makeCanvas(S);
  const rectX = (x0: number, z0: number, w: number, d: number) =>
    ctx.fillRect(px(x0), pz(z0), w * K, d * K);

  ctx.fillStyle = '#525f70';
  ctx.fillRect(0, 0, S, S);

  // district pavement tiles (deterministic comic slabs, no grain)
  const block = 32;
  for (let x = -half + 8; x < half - 8; x += block) {
    for (let z = -half + 8; z < half - 8; z += block) {
      const tone = 0.12 + (Math.abs(x * 13 + z * 7) % 7) * 0.025;
      ctx.fillStyle = `rgba(224,231,239,${tone})`;
      rectX(x + 2.4, z + 2.4, block - 4.8, block - 4.8);
      ctx.strokeStyle = 'rgba(11,14,20,0.22)';
      ctx.lineWidth = 0.28 * K;
      ctx.strokeRect(px(x + 2.4), pz(z + 2.4), (block - 4.8) * K, (block - 4.8) * K);
    }
  }

  // sidewalks along main avenues (lighter strip outside road)
  const sidewalk = (x0: number, z0: number, w: number, d: number) => {
    ctx.fillStyle = 'rgba(100,116,139,0.25)';
    rectX(x0, z0, w, d);
  };
  // main NS road x∈[-14,14] → sidewalks at |x| 14–19
  sidewalk(-19, -half + 12, 5, arenaSize - 24);
  sidewalk(14, -half + 12, 5, arenaSize - 24);
  // main EW road z∈[-14,14]
  sidewalk(-half + 12, -19, arenaSize - 24, 5);
  sidewalk(-half + 12, 14, arenaSize - 24, 5);

  // ── зелёные бульвары и газоны вдоль главных авеню ──────────────────────────
  ctx.fillStyle = '#2e7d32';
  rectX(-19, -half + 14, 2.8, arenaSize - 28);
  rectX(16.2, -half + 14, 2.8, arenaSize - 28);
  rectX(-half + 14, -19, arenaSize - 28, 2.8);
  rectX(-half + 14, 16.2, arenaSize - 28, 2.8);
  // сочные акцентные газоны вокруг центральной площади
  ctx.fillStyle = '#388e3c';
  rectX(-34, -34, 68, 3.2);
  rectX(-34, 30.8, 68, 3.2);
  rectX(-34, -30.8, 3.2, 61.6);
  rectX(30.8, -30.8, 3.2, 61.6);

  const drawAve = (x0: number, z0: number, w: number, d: number, horizontal: boolean, glow = false) => {
    ctx.fillStyle = '#1b222c';
    rectX(x0, z0, w, d);
    if (glow) {
      ctx.strokeStyle = 'rgba(56,189,248,0.30)';
      ctx.lineWidth = 0.35 * K;
      ctx.strokeRect(px(x0), pz(z0), w * K, d * K);
    }
    // Яркая кипенно-белая разметка полос
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 0.35 * K;
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

  // Plaza under monument: светлый гранит / мрамор
  ctx.fillStyle = '#f1f5f9';
  rectX(-30, -30, 60, 60);
  ctx.strokeStyle = 'rgba(11,14,20,0.45)';
  ctx.lineWidth = 0.55 * K;
  ctx.strokeRect(px(-30), pz(-30), 60 * K, 60 * K);
  ctx.strokeStyle = 'rgba(14,165,233,0.45)';
  ctx.lineWidth = 0.45 * K;
  ctx.beginPath();
  ctx.arc(px(0), pz(0), 9 * K, 0, Math.PI * 2);
  ctx.stroke();

  // Crosswalks at main intersection: кипенно-белая «зебра»
  for (const [cx, cz, horiz] of [
    [0, -16, true], [0, 16, true], [-16, 0, false], [16, 0, false],
  ] as const) {
    for (let i = 0; i < 9; i++) {
      ctx.fillStyle = '#ffffff';
      if (horiz) rectX(cx - 14 + i * 3.2, cz - 2.3, 2.3, 4.6);
      else rectX(cx - 2.3, cz - 14 + i * 3.2, 4.6, 2.3);
    }
  }

  // Secondary crosswalks (main × secondary): белый цвет
  for (const s of [56, -56] as const) {
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = '#ffffff';
      rectX(s - 6 + i * 2.8, -2.0, 1.8, 4.0);
      rectX(-2.0, s - 6 + i * 2.8, 4.0, 1.8);
    }
  }

  // NE parking stalls paint
  ctx.fillStyle = 'rgba(30,38,48,0.30)';
  rectX(68, 52, 48, 60);
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = 0.25 * K;
  for (let i = 0; i < 5; i++) {
    ctx.strokeRect(px(72), pz(56 + i * 10), 28 * K, 8 * K);
  }

  // Overpass shadow band (south secondary z≈-80)
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  rectX(-74, -88, 148, 16);
  ctx.strokeStyle = 'rgba(11,14,20,0.30)';
  ctx.lineWidth = 0.3 * K;
  ctx.strokeRect(px(-74), pz(-88), 148 * K, 16 * K);
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 8;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  });
}

/**
 * LRU-1 слот для больших ground-канвасов: перед сборкой новой текстуры
 * выгружает предыдущую (dispose GPU-текстуры), чтобы три карты не держали
 * одновременно десятки МБ VRAM. Сама запись помечена markShared — поштучный
 * teardown её не тронет до выгрузки здесь.
 *
 * A/B-фикс (B6): раньше evict шёл по константному ключу 'ground:last', который
 * никогда не записывался (реальные ключи `ground:<map>:<size>`) — no-op, и все
 * три канваса 3072² оставались в кэше. Теперь модуль хранит последний
 * реальный ключ и выгружает именно его.
 */
let lastGroundKey: string | null = null;

function cachedGround(
  key: 'ground:factory' | 'ground:village' | 'ground:city',
  arenaSize: number,
  build: () => THREE.CanvasTexture,
): THREE.CanvasTexture {
  const fullKey = `${key}:${arenaSize}`;
  if (!cachedTextureHas(fullKey)) {
    if (lastGroundKey !== null && lastGroundKey !== fullKey) cachedTextureEvict(lastGroundKey);
    lastGroundKey = fullKey;
  }
  return cachedTexture(fullKey, build);
}
