import * as THREE from 'three';
import { cachedTexture, makeCanvas, toTexture } from './shared';

export function glowTexture(): THREE.CanvasTexture {
  // Shared singleton (R-1/R-3): built once per process, never disposed by
  // feature teardown — consumers must NOT call map.dispose() on it.
  return cachedTexture('glow', () => {
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
  });
}

/** Shared smoke map — combat + arena smoke reuse one GPU texture. */
export function smokeTexture(): THREE.CanvasTexture {
  return cachedTexture('smoke', () => {
    const S = 128;
    const { c, ctx } = makeCanvas(S);
    const g = ctx.createRadialGradient(S / 2, S / 2, 8, S / 2, S / 2, S / 2);
    g.addColorStop(0, 'rgba(255,255,255,0.85)');
    g.addColorStop(0.55, 'rgba(255,255,255,0.35)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    return toTexture(c, 1);
  });
}

/** Shared scorch map — one GPU texture for all ground marks. */
export function scorchTexture(): THREE.CanvasTexture {
  return cachedTexture('scorch', () => {
    const S = 256;
    const { c, ctx } = makeCanvas(S);
    for (let ring = 5; ring > 0; ring--) {
      const rr = ring * 24;
      ctx.beginPath();
      ctx.arc(S / 2, S / 2, rr, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${10 + ring * 6},${10 + ring * 5},${12 + ring * 4},${0.32 - ring * 0.05})`;
      ctx.fill();
    }
    return toTexture(c, 1);
  });
}

/** Shared hex grid overlay — atmosphere + city/village rooftops. */
export function hexTexture(): THREE.CanvasTexture {
  return cachedTexture('hex', () => {
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
  });
}
