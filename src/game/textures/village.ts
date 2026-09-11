import * as THREE from 'three';
import { cachedTexture, makeCanvas, toTexture, noise } from './shared';

/**
 * Village-native material set.
 *
 * The village previously borrowed the factory's `crateTexture` (hay bales had
 * industrial hazard chevrons and corner bolts), `barrelTexture` (barrels were
 * stencilled "FUEL-51") and the cyan `hexTexture` sky grid. These are the
 * rural replacements: lime plaster, weathered planks, thatch, shingles, straw,
 * oak staves and fieldstone, plus a warm dusk glow for the atmosphere dome.
 *
 * All factories go through `cachedTexture` (process-lifetime, markShared) and
 * are keyed by their tone so a handful of tones covers the whole map.
 */

const rr = (a: number, b: number) => a + Math.random() * (b - a);

/** Horizontal / vertical wood grain streaks. */
function grain(
  ctx: CanvasRenderingContext2D, S: number, count: number, vertical: boolean,
  alpha: number, tone: string,
) {
  ctx.strokeStyle = tone;
  ctx.lineWidth = 1;
  for (let i = 0; i < count; i++) {
    const at = rr(0, S);
    const len = rr(S * 0.06, S * 0.5);
    const start = rr(-S * 0.1, S);
    ctx.globalAlpha = alpha * rr(0.4, 1);
    ctx.beginPath();
    if (vertical) {
      ctx.moveTo(at, start);
      ctx.lineTo(at + rr(-2, 2), start + len);
    } else {
      ctx.moveTo(start, at);
      ctx.lineTo(start + len, at + rr(-2, 2));
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/** Lime-washed plaster with hairline cracks — house / chapel walls. */
export function plasterTexture(tone = '#d8cbb2'): THREE.CanvasTexture {
  return cachedTexture(`village:plaster:${tone}`, () => {
    const S = 512;
    const { c, ctx } = makeCanvas(S);
    ctx.fillStyle = tone;
    ctx.fillRect(0, 0, S, S);
    // broad weathering washes (rain streaks + sun-bleached patches)
    for (let i = 0; i < 46; i++) {
      const g = ctx.createRadialGradient(rr(0, S), rr(0, S), 0, rr(0, S), rr(0, S), rr(30, 130));
      g.addColorStop(0, `rgba(90,74,52,${rr(0.03, 0.09)})`);
      g.addColorStop(1, 'rgba(90,74,52,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, S, S);
    }
    // hairline cracks
    ctx.strokeStyle = 'rgba(70,58,42,0.35)';
    for (let i = 0; i < 22; i++) {
      ctx.lineWidth = rr(0.6, 1.6);
      let x = rr(0, S);
      let y = rr(0, S);
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let s = 0; s < 5; s++) {
        x += rr(-26, 26);
        y += rr(10, 40);
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    // exposed-brick specks under the wash
    for (let i = 0; i < 90; i++) {
      ctx.fillStyle = `rgba(140,96,70,${rr(0.05, 0.16)})`;
      ctx.fillRect(rr(0, S), rr(0, S), rr(2, 7), rr(2, 4));
    }
    noise(ctx, S, 5200, 0.05);
    return toTexture(c, 2);
  });
}

/** Weathered board-and-batten planks — barns, fences, carts, jetty. */
export function plankTexture(tone = '#8a6836', vertical = false): THREE.CanvasTexture {
  return cachedTexture(`village:plank:${tone}:${vertical ? 'v' : 'h'}`, () => {
    const S = 512;
    const { c, ctx } = makeCanvas(S);
    ctx.fillStyle = '#241a10';
    ctx.fillRect(0, 0, S, S);
    const boards = 7;
    const step = S / boards;
    for (let i = 0; i < boards; i++) {
      const shade = rr(-0.14, 0.14);
      ctx.fillStyle = tone;
      const b = i * step + 1.5;
      if (vertical) ctx.fillRect(b, 0, step - 3, S);
      else ctx.fillRect(0, b, S, step - 3);
      // per-board brightness wash
      ctx.globalAlpha = Math.abs(shade) * 3;
      ctx.fillStyle = shade > 0 ? 'rgba(255,232,190,1)' : 'rgba(0,0,0,1)';
      if (vertical) ctx.fillRect(b, 0, step - 3, S);
      else ctx.fillRect(0, b, S, step - 3);
      ctx.globalAlpha = 1;
      // board highlight edge
      ctx.fillStyle = 'rgba(255,236,200,0.12)';
      if (vertical) ctx.fillRect(b + 1, 0, 2, S);
      else ctx.fillRect(0, b + 1, S, 2);
    }
    grain(ctx, S, 200, !vertical, 0.16, 'rgba(40,26,14,1)');
    grain(ctx, S, 90, !vertical, 0.12, 'rgba(214,180,124,1)');
    // knots
    for (let i = 0; i < 14; i++) {
      const kx = rr(0, S);
      const ky = rr(0, S);
      ctx.fillStyle = 'rgba(48,32,16,0.7)';
      ctx.beginPath();
      ctx.ellipse(kx, ky, rr(3, 8), rr(2, 5), rr(0, Math.PI), 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(30,20,10,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(kx, ky, rr(7, 12), rr(5, 8), rr(0, Math.PI), 0, Math.PI * 2);
      ctx.stroke();
    }
    // nail heads along the board ends
    ctx.fillStyle = 'rgba(20,16,12,0.85)';
    for (let i = 0; i < boards; i++) {
      for (const t of [0.06, 0.94]) {
        const px = vertical ? i * step + step / 2 : t * S;
        const py = vertical ? t * S : i * step + step / 2;
        ctx.beginPath();
        ctx.arc(px, py, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    noise(ctx, S, 3800, 0.05);
    return toTexture(c, 2);
  });
}

/** Straw thatch — barn roofs, haystacks, hay bales. */
export function thatchTexture(tone = '#c2a04e'): THREE.CanvasTexture {
  return cachedTexture(`village:thatch:${tone}`, () => {
    const S = 512;
    const { c, ctx } = makeCanvas(S);
    ctx.fillStyle = '#6a5424';
    ctx.fillRect(0, 0, S, S);
    // dense straw strokes, warm tones
    const straw = ['#d8bc6a', '#c2a04e', '#a8873c', '#e2cc86', '#94742f'];
    for (let i = 0; i < 5200; i++) {
      ctx.strokeStyle = straw[Math.floor(Math.random() * straw.length)];
      ctx.globalAlpha = rr(0.25, 0.85);
      ctx.lineWidth = rr(0.8, 2.0);
      const x = rr(-10, S);
      const y = rr(-10, S);
      const a = rr(-0.5, 0.5) + (Math.random() > 0.5 ? 0.4 : -0.4);
      const len = rr(10, 30);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // combed vertical ridges (thatch courses)
    for (let x = 0; x < S; x += rr(26, 40)) {
      ctx.strokeStyle = 'rgba(60,44,18,0.28)';
      ctx.lineWidth = rr(2, 4);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + rr(-6, 6), S);
      ctx.stroke();
    }
    noise(ctx, S, 2600, 0.05);
    return toTexture(c, 3);
  });
}

/** Split-wood shingles — house / chapel roofs. */
export function shingleTexture(tone = '#7a4436'): THREE.CanvasTexture {
  return cachedTexture(`village:shingle:${tone}`, () => {
    const S = 512;
    const { c, ctx } = makeCanvas(S);
    ctx.fillStyle = '#241310';
    ctx.fillRect(0, 0, S, S);
    const rows = 9;
    const rh = S / rows;
    const sw = S / 9;
    for (let r = 0; r < rows; r++) {
      const offset = r % 2 ? sw / 2 : 0;
      for (let i = -1; i <= 9; i++) {
        const x = i * sw + offset;
        const y = r * rh;
        ctx.fillStyle = tone;
        ctx.fillRect(x + 1, y + 1, sw - 2, rh - 1);
        ctx.globalAlpha = rr(0, 0.28);
        ctx.fillStyle = Math.random() > 0.5 ? '#000' : '#e8c9a0';
        ctx.fillRect(x + 1, y + 1, sw - 2, rh - 1);
        ctx.globalAlpha = 1;
        // rounded bottom lip shadow
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(x + 1, y + rh - 3, sw - 2, 3);
        ctx.fillStyle = 'rgba(255,220,180,0.10)';
        ctx.fillRect(x + 1, y + 1, sw - 2, 2);
        // grain
        ctx.strokeStyle = 'rgba(40,20,14,0.35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + sw / 2, y + 3);
        ctx.lineTo(x + sw / 2 + rr(-2, 2), y + rh - 3);
        ctx.stroke();
      }
    }
    // moss / weathering
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = `rgba(74,92,44,${rr(0.05, 0.16)})`;
      ctx.beginPath();
      ctx.ellipse(rr(0, S), rr(0, S), rr(4, 16), rr(3, 9), 0, 0, Math.PI * 2);
      ctx.fill();
    }
    noise(ctx, S, 3000, 0.05);
    return toTexture(c, 2);
  });
}

/** Straw bale with two twine bands — hay cover, platform dressing. */
export function hayBaleTexture(): THREE.CanvasTexture {
  return cachedTexture('village:haybale', () => {
    const S = 512;
    const { c, ctx } = makeCanvas(S);
    ctx.fillStyle = '#7a6228';
    ctx.fillRect(0, 0, S, S);
    const straw = ['#e0c877', '#cdb057', '#b79a44', '#eeda95', '#a88b3a'];
    for (let i = 0; i < 6000; i++) {
      ctx.strokeStyle = straw[Math.floor(Math.random() * straw.length)];
      ctx.globalAlpha = rr(0.3, 0.9);
      ctx.lineWidth = rr(0.7, 1.8);
      const x = rr(0, S);
      const y = rr(0, S);
      const a = rr(-0.28, 0.28) + (Math.random() > 0.5 ? Math.PI / 2 : -Math.PI / 2);
      const len = rr(8, 22);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // two twine bands
    for (const ty of [S * 0.3, S * 0.7]) {
      ctx.fillStyle = 'rgba(70,52,24,0.75)';
      ctx.fillRect(0, ty, S, 5);
      ctx.fillStyle = 'rgba(228,206,150,0.35)';
      ctx.fillRect(0, ty + 1, S, 2);
    }
    noise(ctx, S, 2200, 0.05);
    return toTexture(c, 1);
  });
}

/** Oak staves + iron hoops — barrels, troughs, water butts. */
export function oakBarrelTexture(): THREE.CanvasTexture {
  return cachedTexture('village:oakbarrel', () => {
    const S = 256;
    const { c, ctx } = makeCanvas(S);
    ctx.fillStyle = '#241608';
    ctx.fillRect(0, 0, S, S);
    const staves = 12;
    const sw = S / staves;
    for (let i = 0; i < staves; i++) {
      const x = i * sw;
      ctx.fillStyle = i % 2 ? '#6a4520' : '#7a5228';
      ctx.fillRect(x + 1, 0, sw - 2, S);
      ctx.globalAlpha = rr(0, 0.3);
      ctx.fillStyle = Math.random() > 0.5 ? '#000' : '#e0b478';
      ctx.fillRect(x + 1, 0, sw - 2, S);
      ctx.globalAlpha = 1;
      // stave edge highlight
      ctx.fillStyle = 'rgba(226,180,120,0.14)';
      ctx.fillRect(x + 1, 0, 2, S);
    }
    grain(ctx, S, 140, false, 0.18, 'rgba(30,18,8,1)');
    // iron hoops
    for (const hy of [S * 0.14, S * 0.5, S * 0.86]) {
      ctx.fillStyle = '#2c2e30';
      ctx.fillRect(0, hy - 9, S, 18);
      ctx.fillStyle = 'rgba(190,196,204,0.30)';
      ctx.fillRect(0, hy - 9, S, 3);
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, hy + 6, S, 3);
    }
    noise(ctx, S, 1400, 0.05);
    return toTexture(c, 1);
  });
}

/** Fieldstone masonry — well, plinths, chapel, mill base. */
export function fieldstoneTexture(tone = '#8a8578'): THREE.CanvasTexture {
  return cachedTexture(`village:fieldstone:${tone}`, () => {
    const S = 512;
    const { c, ctx } = makeCanvas(S);
    ctx.fillStyle = '#3a362e';
    ctx.fillRect(0, 0, S, S);
    const rows = 8;
    const rh = S / rows;
    for (let r = 0; r < rows; r++) {
      const offset = r % 2 ? -S / 12 : 0;
      let x = offset;
      while (x < S) {
        const w = rr(S / 12, S / 6);
        const y = r * rh;
        ctx.fillStyle = tone;
        ctx.beginPath();
        const jx = rr(1, 4);
        const jy = rr(1, 4);
        ctx.moveTo(x + jx, y + jy);
        ctx.lineTo(x + w - jx, y + rr(0, 3));
        ctx.lineTo(x + w - rr(1, 3), y + rh - jy);
        ctx.lineTo(x + jx, y + rh - rr(0, 3));
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = rr(0, 0.32);
        ctx.fillStyle = Math.random() > 0.5 ? '#000' : '#efe8d6';
        ctx.fill();
        ctx.globalAlpha = 1;
        // top-light bevel
        ctx.strokeStyle = 'rgba(255,246,226,0.16)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(x + jx, y + jy);
        ctx.lineTo(x + w - jx, y + jy + 1);
        ctx.stroke();
        x += w + rr(2, 6);
      }
    }
    noise(ctx, S, 5200, 0.06);
    return toTexture(c, 3);
  });
}

/** Warm dusk glow for the atmosphere dome (replaces the cyan hex grid). */
export function duskGlowTexture(): THREE.CanvasTexture {
  return cachedTexture('village:duskgGlow', () => {
    const S = 512;
    const { c, ctx } = makeCanvas(S);
    ctx.clearRect(0, 0, S, S);
    // horizon band (v = 0 at the dome bottom) glowing warm, fading upward
    const g = ctx.createLinearGradient(0, S, 0, 0);
    g.addColorStop(0, 'rgba(255,168,92,0.55)');
    g.addColorStop(0.28, 'rgba(255,140,80,0.26)');
    g.addColorStop(0.6, 'rgba(180,110,120,0.10)');
    g.addColorStop(1, 'rgba(60,50,90,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    // soft cloud streaks
    for (let i = 0; i < 26; i++) {
      ctx.fillStyle = `rgba(255,196,140,${rr(0.02, 0.07)})`;
      ctx.beginPath();
      ctx.ellipse(rr(0, S), rr(S * 0.35, S), rr(40, 150), rr(4, 16), 0, 0, Math.PI * 2);
      ctx.fill();
    }
    return toTexture(c, 1);
  });
}

/**
 * Timber-framed plaster wall for the arena perimeter — the village shell.
 * Replaces the shared industrial `wallTexture` (hazard chevrons + orange
 * factory windows) with a half-timbered facade + a warm shuttered window.
 */
export function villageWallTexture(): THREE.CanvasTexture {
  return cachedTexture('village:wall', () => {
    const S = 512;
    const { c, ctx } = makeCanvas(S);
    ctx.fillStyle = '#b5a888';
    ctx.fillRect(0, 0, S, S);
    // plaster mottling
    for (let i = 0; i < 60; i++) {
      const g = ctx.createRadialGradient(rr(0, S), rr(0, S), 0, rr(0, S), rr(0, S), rr(30, 120));
      g.addColorStop(0, `rgba(120,100,70,${rr(0.03, 0.10)})`);
      g.addColorStop(1, 'rgba(120,100,70,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, S, S);
    }
    // dark timber frame: sill, top plate, corner posts, diagonal braces
    ctx.fillStyle = '#4a3520';
    ctx.fillRect(0, 0, S, 26);
    ctx.fillRect(0, S - 30, S, 30);
    ctx.fillRect(0, 0, 22, S);
    ctx.fillRect(S - 22, 0, 22, S);
    ctx.fillRect(S / 2 - 11, 0, 22, S);
    ctx.save();
    ctx.strokeStyle = '#4a3520';
    ctx.lineWidth = 16;
    for (const [x0, x1] of [[22, S / 2 - 11], [S / 2 + 11, S - 22]] as const) {
      ctx.beginPath();
      ctx.moveTo(x0, S - 30);
      ctx.lineTo(x1, 26);
      ctx.stroke();
    }
    ctx.restore();
    // warm shuttered window in each bay
    for (const wx of [S * 0.25, S * 0.75]) {
      ctx.fillStyle = '#2a1c10';
      ctx.fillRect(wx - 34, S * 0.36, 68, 74);
      ctx.fillStyle = '#3a2616';
      ctx.fillRect(wx - 30, S * 0.36 + 4, 60, 66);
      const wg = ctx.createLinearGradient(0, S * 0.36, 0, S * 0.36 + 70);
      wg.addColorStop(0, 'rgba(255,196,110,0.95)');
      wg.addColorStop(1, 'rgba(255,150,60,0.35)');
      ctx.fillStyle = wg;
      ctx.fillRect(wx - 26, S * 0.36 + 8, 52, 58);
      ctx.strokeStyle = '#4a3520';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(wx, S * 0.36 + 8); ctx.lineTo(wx, S * 0.36 + 66);
      ctx.moveTo(wx - 26, S * 0.36 + 37); ctx.lineTo(wx + 26, S * 0.36 + 37);
      ctx.stroke();
    }
    grain(ctx, S, 120, false, 0.10, 'rgba(60,42,22,1)');
    noise(ctx, S, 4200, 0.05);
    return toTexture(c, 4);
  });
}
