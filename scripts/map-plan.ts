/**
 * Top-down map plan renderer — data-driven, straight from the arena colliders.
 * Usage: npx vite-node scripts/map-plan.ts [mapId] [outFile]
 *
 * Builds a map with the real builders (headless, same canvas stub as the
 * draw-call census), classifies every collider into the documented cover
 * tiers, and emits a self-contained HTML plan with an inline SVG.
 *
 * Why it exists: screenshot verification needs a browser and a live match, and
 * the arena has no URL hook to start one. This gives level design a verifiable
 * picture of the actual collision layout, plus the per-quadrant density numbers
 * the [I] backlog items ask for.
 */
import * as THREE from 'three';

// ---- headless canvas stub (texture factories need a 2d context) ----------
const gradient = { addColorStop: () => {} };
const ctx2d = new Proxy(
  {},
  {
    get(_t, prop) {
      if (prop === 'createRadialGradient' || prop === 'createLinearGradient') {
        return () => gradient;
      }
      return () => {};
    },
    set() {
      return true;
    },
  },
);
(globalThis as Record<string, unknown>).document = {
  createElement: (tag: string) =>
    tag === 'canvas' ? { width: 0, height: 0, getContext: () => ctx2d } : undefined,
};

const { Arena } = await import('../src/game/Arena');
const { disposeObject3D } = await import('../src/game/resources/disposeObject3D');
const { MAPS, isMapId, DEFAULT_MAP_ID } = await import('../src/game/maps/mapCatalog');
const { zonesForMap } = await import('../src/game/match/captureAnchors');
const { FFA_SPAWN_POINTS, ALPHA_SPAWN_POINTS, BRAVO_SPAWN_POINTS } = await import(
  '../src/game/match/spawnPoints'
);
const fs = await import('node:fs');
const path = await import('node:path');

const argMap = process.argv[2] ?? DEFAULT_MAP_ID;
const mapId = isMapId(argMap) ? argMap : DEFAULT_MAP_ID;
const out = process.argv[3] ?? `screenshots/${mapId}-plan.html`;

const HALF = 150;
const SIZE = 1000;
const PAD = 34;
const S = (SIZE - PAD * 2) / (HALF * 2);
const tx = (x: number) => PAD + (x + HALF) * S;
const tz = (z: number) => PAD + (z + HALF) * S;

// ---- build -----------------------------------------------------------------
const scene = new THREE.Scene();
const arena = new Arena(scene, mapId as never);

type Tier = 'perimeter' | 'hard' | 'medium' | 'soft' | 'ramp';
function tierOf(c: {
  kind: string; destructible: boolean; height: number;
  minX: number; maxX: number; minZ: number; maxZ: number;
}): Tier {
  const onEdge =
    c.minX >= HALF - 2 || c.maxX <= -(HALF - 2) || c.minZ >= HALF - 2 || c.maxZ <= -(HALF - 2);
  if (onEdge) return 'perimeter';
  if (c.kind === 'ramp') return 'ramp';
  if (c.destructible) return 'soft';
  return c.kind === 'wall' || c.height >= 2.5 ? 'hard' : 'medium';
}

const FILL: Record<Tier, string> = {
  perimeter: 'rgba(140,170,205,0.35)',
  hard: '#5d7fa8',
  medium: '#c8a24a',
  soft: '#ff8a1a',
  ramp: 'rgba(46,230,192,0.55)',
};

const colliders = arena.colliders;
const counts: Record<Tier, number> = { perimeter: 0, hard: 0, medium: 0, soft: 0, ramp: 0 };
const quad: Record<string, { hard: number; soft: number }> = {
  NW: { hard: 0, soft: 0 },
  NE: { hard: 0, soft: 0 },
  SW: { hard: 0, soft: 0 },
  SE: { hard: 0, soft: 0 },
};

const rects: string[] = [];
for (const c of colliders) {
  const t = tierOf(c);
  counts[t]++;
  const cx = (c.minX + c.maxX) / 2;
  const cz = (c.minZ + c.maxZ) / 2;
  if (t === 'hard' || t === 'soft') {
    const q = `${cz > 0 ? 'N' : 'S'}${cx > 0 ? 'E' : 'W'}`;
    quad[q][t === 'hard' ? 'hard' : 'soft']++;
  }
  const w = Math.max(1.2, (c.maxX - c.minX) * S);
  const h = Math.max(1.2, (c.maxZ - c.minZ) * S);
  const stroke = t === 'ramp' ? 'stroke-dasharray="3 3" stroke-width="1"' : 'stroke-width="0.8"';
  const opacity = t === 'perimeter' ? 0.55 : 0.92;
  rects.push(
    `<rect x="${(tx(c.minX)).toFixed(1)}" y="${(tz(c.minZ)).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" ` +
      `fill="${FILL[t]}" fill-opacity="${opacity}" stroke="#0a0e14" ${stroke} rx="1"/>`,
  );
}

// capture zones
const zoneR = 20 * S;
const zones = zonesForMap(mapId)
  .map(
    (z) =>
      `<circle cx="${tx(z.x).toFixed(1)}" cy="${tz(z.z).toFixed(1)}" r="${zoneR.toFixed(1)}" ` +
      `fill="none" stroke="#2ee6c0" stroke-opacity="0.75" stroke-width="1.6" stroke-dasharray="6 4"/>` +
      `<text x="${tx(z.x).toFixed(1)}" y="${tz(z.z).toFixed(1)}" fill="#2ee6c0" font-size="20" ` +
      `font-family="sans-serif" font-weight="700" text-anchor="middle" dominant-baseline="middle">${z.id}</text>`,
  )
  .join('\n');

const dot = (x: number, z: number, color: string, r = 3.4) =>
  `<circle cx="${tx(x).toFixed(1)}" cy="${tz(z).toFixed(1)}" r="${r}" fill="${color}" stroke="#04070b" stroke-width="1"/>`;

const spawns =
  FFA_SPAWN_POINTS.map(([x, z]) => dot(x, z, '#ffffff', 3.2)).join('') +
  ALPHA_SPAWN_POINTS.map(([x, z]) => dot(x, z, '#3b9eff', 3.0)).join('') +
  BRAVO_SPAWN_POINTS.map(([x, z]) => dot(x, z, '#ff4d3d', 3.0)).join('');

const band = (x0: number, z0: number, x1: number, z1: number) =>
  `<rect x="${tx(x0).toFixed(1)}" y="${tz(z0).toFixed(1)}" width="${((x1 - x0) * S).toFixed(1)}" ` +
  `height="${((z1 - z0) * S).toFixed(1)}" fill="#2ee6c0" fill-opacity="0.07"/>`;

const lanes =
  band(-13, -150, 13, 150) +
  band(-150, -13, 150, 13) +
  band(-34, -34, 34, 34).replace('fill-opacity="0.07"', 'fill-opacity="0.05"');

const dist = Object.entries(quad)
  .map(([k, v]) => `${k}: ${v.hard} hard / ${v.soft} soft`)
  .join('  ·  ');

const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>${mapId} plan</title>
<style>
  body{margin:0;background:#070a0f;color:#dfe8f2;font:14px/1.5 ui-sans-serif,system-ui,sans-serif;
       display:flex;flex-direction:column;align-items:center;gap:10px;padding:16px}
  h1{font-size:18px;margin:0;letter-spacing:.06em;text-transform:uppercase}
  .sub{color:#8ea0b4;font-size:12px}
  .legend{display:flex;gap:16px;flex-wrap:wrap;justify-content:center;font-size:12px}
  .legend i{display:inline-block;width:11px;height:11px;border-radius:2px;margin-right:5px;vertical-align:-1px}
</style></head><body>
<h1>${MAPS[mapId].name} — ${MAPS[mapId].nameEn}</h1>
<div class="sub">collider plan · arena 300×300 · ${colliders.length} colliders ·
  ${counts.hard} hard · ${counts.medium} medium · ${counts.soft} soft · ${counts.ramp} ramps</div>
<div class="legend">
  <span><i style="background:${FILL.hard}"></i>hard (unbreakable, blocks sight)</span>
  <span><i style="background:${FILL.medium}"></i>medium (low, unbreakable)</span>
  <span><i style="background:${FILL.soft}"></i>soft (destructible)</span>
  <span><i style="background:${FILL.ramp}"></i>ramp (non-blocking)</span>
  <span><i style="background:#2ee6c0"></i>capture zone</span>
  <span><i style="background:#fff"></i>FFA spawn</span>
  <span><i style="background:#3b9eff"></i>alpha</span>
  <span><i style="background:#ff4d3d"></i>bravo</span>
</div>
<div class="sub">${dist}</div>
<svg width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <rect x="${PAD}" y="${PAD}" width="${(HALF * 2 * S).toFixed(1)}" height="${(HALF * 2 * S).toFixed(1)}"
        fill="#111720" stroke="#33465c" stroke-width="2"/>
  ${lanes}
  ${rects.join('\n  ')}
  ${zones}
  ${spawns}
</svg>
</body></html>`;

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);

console.log(`=== ${mapId} plan ===`);
console.log(`colliders: ${colliders.length}`);
console.log(`  hard ${counts.hard} · medium ${counts.medium} · soft ${counts.soft} · ramps ${counts.ramp} · perimeter ${counts.perimeter}`);
console.log(`quadrants: ${dist}`);
console.log(`written: ${out}`);

scene.remove(arena.group);
disposeObject3D(arena.group);
