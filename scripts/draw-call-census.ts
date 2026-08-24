/**
 * Draw-call census per map — headless, no WebGL renderer needed.
 * Usage: npx tsx scripts/draw-call-census.ts
 *
 * Builds each registered map into a fresh THREE.Group via the real
 * Arena/builders, then walks the scene graph counting renderable objects:
 *   - Mesh / Points / Sprite  -> 1 draw call each
 *   - InstancedMesh           -> 1 draw call total (instance count recorded)
 * Reports per-map totals, instancing coverage, and the most-repeated
 * geometry candidates (top instancing opportunities).
 */
import * as THREE from 'three';

// ---- node-env canvas stub (texture factories need a 2d context) ----------
const gradient = { addColorStop: () => {} };
const ctx2d = new Proxy(
  {},
  {
    get(_t, prop) {
      if (prop === 'createRadialGradient' || prop === 'createLinearGradient') {
        return () => gradient;
      }
      // every other method call becomes a no-op
      return () => {};
    },
    set() {
      // style assignments are irrelevant headless
      return true;
    },
  },
);
const realCreateElement =
  typeof document !== 'undefined' ? document.createElement.bind(document) : null;
(globalThis as Record<string, unknown>).document = {
  ...(typeof document === 'object' ? document : {}),
  createElement: (tag: string) => {
    if (tag === 'canvas') {
      return { width: 0, height: 0, getContext: () => ctx2d };
    }
    return realCreateElement ? realCreateElement(tag) : undefined;
  },
};

const { Arena } = await import('../src/game/Arena');
const { disposeObject3D } = await import('../src/game/resources/disposeObject3D');
const { MAP_IDS } = await import('../src/game/maps/mapCatalog');

interface GeoStat { key: string; count: number; instanced: boolean; instances: number }

function census(mapId: string) {
  const scene = new THREE.Scene();

  // Attribute plain-box creations to their builder function (top arena/
  // frame in the V8 stack at call time). Must wrap BEFORE construction —
  // buildArena() runs inside the Arena constructor.
  const boxesByBuilder = new Map<string, number>();
  const arenaProto = Arena.prototype as unknown as {
    box: (...a: unknown[]) => THREE.Mesh;
  };
  const origBox = arenaProto.box;
  const skipFrames =
    /[\\/](Arena|ArenaBuilder)\.ts:\d+|[\\/]scripts[\\/]/;
  arenaProto.box = function (this: Arena, ...args: unknown[]) {
    const frames = (new Error().stack ?? '')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.startsWith('at ') && !skipFrames.test(l));
    // First frame inside an arena/<map>.ts content builder wins; fall back
    // to the first non-plumbing frame.
    const frame =
      frames.find((l) => /[\\/]arena[\\/]/.test(l)) ?? frames[0] ?? '';
    const m = /\bat (.*?) \((.*?):(\d+):\d+\)/.exec(frame);
    if (m) {
      const fn = m[1] === '<anonymous>' ? '' : `${m[1]} `;
      const file = m[2].split(/[\\/]/).pop();
      const who = `${fn}@${file}:${m[3]}`;
      boxesByBuilder.set(who, (boxesByBuilder.get(who) ?? 0) + 1);
    }
    return origBox.apply(this, args);
  };

  let arena: InstanceType<typeof Arena>;
  try {
    arena = new Arena(scene, mapId as never);
  } finally {
    arenaProto.box = origBox;
  }

  const geos = new Map<string, GeoStat>();
  let meshes = 0;
  let points = 0;
  let sprites = 0;
  let instancedMeshes = 0;
  let instancedInstances = 0;

  arena.group.traverse((o) => {
    if (o instanceof THREE.InstancedMesh) {
      instancedMeshes++;
      instancedInstances += o.count;
      const k = `inst:${o.geometry.type}:${o.count}`;
      const g = geos.get(k) ?? { key: k, count: 0, instanced: true, instances: o.count };
      g.count++;
      geos.set(k, g);
    } else if (o instanceof THREE.Mesh) {
      meshes++;
      const k = o.geometry.type;
      const g = geos.get(k) ?? { key: k, count: 0, instanced: false, instances: 1 };
      g.count++;
      geos.set(k, g);
    } else if (o instanceof THREE.Points) {
      points++;
    } else if (o instanceof THREE.Sprite) {
      sprites++;
    }
  });

  const estDrawCalls = meshes + points + sprites + instancedMeshes;
  const repeated = [...geos.values()]
    .filter((g) => !g.instanced && g.count > 2)
    .sort((a, b) => b.count - a.count);

  console.log(`\n=== ${mapId} ===`);
  console.log(
    `est. draw calls: ${estDrawCalls}  (mesh ${meshes}, points ${points}, sprites ${sprites}, instanced ${instancedMeshes} x ${instancedInstances})`,
  );
  if (repeated.length) {
    console.log('repeated plain geometries (instancing candidates):');
    for (const g of repeated.slice(0, 8)) console.log(`  ${g.count}x ${g.key}`);
  }
  if (boxesByBuilder.size) {
    console.log('plain boxes by builder:');
    for (const [who, n] of [...boxesByBuilder.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)) {
      console.log(`  ${n}x ${who}`);
    }
  }

  scene.remove(arena.group);
  disposeObject3D(arena.group);
}

console.log(`maps: ${MAP_IDS.join(', ')}`);
for (const id of MAP_IDS) census(id);
