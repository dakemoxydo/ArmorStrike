import * as THREE from 'three';
import { cachedTexture, noise } from './shared';

/** Arena billboard styling: `tech` = neon industrial (factory/city), `rural` = painted wood. */
export type SignStyle = 'tech' | 'rural';

/** Arena billboards are keyed by their text — same sign reuses one texture. */
export function signTexture(main: string, sub: string, style: SignStyle = 'tech'): THREE.CanvasTexture {
  return cachedTexture(`sign:${style}:${main}:${sub}`, () => {
    const W = 1024, H = 256;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d')!;
    const rural = style === 'rural';
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, rural ? '#4a3520' : '#141b26');
    bg.addColorStop(1, rural ? '#2e2014' : '#0a0e15');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    if (rural) {
      // painted plank boards
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 6;
      for (let x = 0; x <= W; x += 128) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,232,190,0.07)';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(x + 7, 0); ctx.lineTo(x + 7, H); ctx.stroke();
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.lineWidth = 6;
      }
    }
    noise(ctx, H, 900, 0.06);
    ctx.strokeStyle = rural ? 'rgba(200,162,74,0.85)' : 'rgba(255,176,46,0.8)';
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, W - 10, H - 10);
    ctx.textAlign = 'center';
    ctx.font = `bold 118px 'Russo One','Exo 2',sans-serif`;
    if (rural) {
      ctx.fillStyle = 'rgba(255,236,200,0.95)';
      ctx.fillText(main, W / 2, 150);
    } else {
      const tg = ctx.createLinearGradient(0, 40, 0, 160);
      tg.addColorStop(0, '#7dfce0');
      tg.addColorStop(1, '#2fbf9e');
      ctx.fillStyle = tg;
      ctx.fillText(main, W / 2, 150);
    }
    ctx.font = `bold 44px 'Exo 2',sans-serif`;
    ctx.fillStyle = rural ? 'rgba(226,196,140,0.9)' : 'rgba(255,190,90,0.85)';
    ctx.fillText(sub, W / 2, 216);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  });
}
