import * as THREE from 'three';
import { noise } from './shared';

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
  ctx.strokeStyle = 'rgba(255,176,46,0.8)';
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, W - 10, H - 10);
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
