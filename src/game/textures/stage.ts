// ===== Текстуры сцены-подиума меню/гаража (Visual_Coherence_Pass п.16) =====
import * as THREE from 'three';
import { cachedTexture, noise } from './shared';

/**
 * Бумага сцены: тёплый ground, редкая сетка Ben-Day, печатный шум.
 * `rx`/`ry` — repeat: у пола и цикл-стены разный масштаб точки.
 */
export function stagePaperTexture(rx: number, ry: number): THREE.CanvasTexture {
  return cachedTexture(`stage:paper:${rx}x${ry}`, () => {
    const size = 512;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#f4f0e6';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = 'rgba(11,14,20,0.05)';
    for (let y = 24; y < size; y += 24) {
      for (let x = 24; x < size; x += 24) {
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    noise(ctx, size, 300, 0.03);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rx, ry);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  });
}

/**
 * Верх подиума (cap UV: круг r=0.5 в центре квадрата) — графический круг:
 * Ben-Day по бумаге, янтарное кольцо, чернильный борт по краю.
 */
export function podiumTexture(): THREE.CanvasTexture {
  return cachedTexture('stage:podium', () => {
    const size = 512;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#f4f0e6';
    ctx.fillRect(0, 0, size, size);
    // Ben-Day dots
    ctx.fillStyle = 'rgba(11,14,20,0.16)';
    for (let y = 18; y < size - 12; y += 18) {
      for (let x = 18; x < size - 12; x += 18) {
        ctx.beginPath();
        ctx.arc(x, y, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // amber accent ring
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 18;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 170, 0, Math.PI * 2);
    ctx.stroke();
    // ink border at the cap edge
    ctx.strokeStyle = '#0b0e14';
    ctx.lineWidth = 22;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 246, 0, Math.PI * 2);
    ctx.stroke();
    noise(ctx, size, 300, 0.03);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  });
}
