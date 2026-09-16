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

/** Shared track mark map — one GPU texture for all tank ground imprint marks. */
export function trackMarkTexture(): THREE.CanvasTexture {
  return cachedTexture('trackMark', () => {
    const S = 128;
    const { c, ctx } = makeCanvas(S);
    ctx.clearRect(0, 0, S, S);

    // Tread bands (horizontal cleats / lugs across the track segment)
    const lugs = 6;
    const lugH = S / (lugs * 2);
    for (let i = 0; i < lugs; i++) {
      const y = (i * 2 + 0.5) * lugH;
      // Left tread block with soft edge
      const gLeft = ctx.createLinearGradient(8, y, S * 0.46, y);
      gLeft.addColorStop(0, 'rgba(28,26,24,0.15)');
      gLeft.addColorStop(0.25, 'rgba(28,26,24,0.85)');
      gLeft.addColorStop(1, 'rgba(24,22,20,0.85)');
      ctx.fillStyle = gLeft;
      ctx.fillRect(8, y, S * 0.46 - 8, lugH * 0.75);

      // Right tread block with soft edge
      const gRight = ctx.createLinearGradient(S * 0.54, y, S - 8, y);
      gRight.addColorStop(0, 'rgba(24,22,20,0.85)');
      gRight.addColorStop(0.75, 'rgba(28,26,24,0.85)');
      gRight.addColorStop(1, 'rgba(28,26,24,0.15)');
      ctx.fillStyle = gRight;
      ctx.fillRect(S * 0.54, y, S - 8 - S * 0.54, lugH * 0.75);

      // Center guide horn indent / pin
      ctx.fillStyle = 'rgba(18,16,14,0.5)';
      ctx.fillRect(S * 0.47, y + lugH * 0.15, S * 0.06, lugH * 0.45);
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
