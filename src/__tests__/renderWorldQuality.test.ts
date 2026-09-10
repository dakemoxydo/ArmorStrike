import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QUALITY_PRESETS, type QualityLevel } from '../game/graphicsQuality';
import { RenderWorld } from '../game/RenderWorld';

/**
 * Bloom lifecycle coverage for RenderWorld.applyQuality / disposeBloom /
 * setupBloom / resizeComposer (audit H-4 remainder; guards the F-3 fix):
 *  - downgrade must tear the composer down (frees full-size render targets)
 *  - re-entering 'high' must rebuild a FRESH composer sized to the canvas CSS
 *    box (never stale DPI/window size after quality cycling)
 *
 * The real RenderWorld constructor needs WebGL + PMREM, so we instantiate via
 * Object.create and inject minimal stand-ins for the private fields (TS
 * `private` is compile-time only -> writable via Reflect.set at runtime).
 */

interface FakeComposer {
  setSize: ReturnType<typeof vi.fn>;
  dispose: ReturnType<typeof vi.fn>;
}

// Shared recording sinks; hoisted so the vi.mock factories below can close
// over them (mock factories are lifted above imports).
const h = vi.hoisted(() => ({
  composers: [] as Array<{ setSize: ReturnType<typeof vi.fn>; dispose: ReturnType<typeof vi.fn> }>,
  blooms: [] as Array<{ dispose: ReturnType<typeof vi.fn> }>,
}));

vi.mock('three/addons/postprocessing/EffectComposer.js', () => ({
  EffectComposer: class {
    setSize = vi.fn();
    dispose = vi.fn();
    addPass = vi.fn();
    constructor(_renderer: unknown) {
      h.composers.push(this);
    }
  },
}));

vi.mock('three/addons/postprocessing/RenderPass.js', () => ({
  RenderPass: class {
    constructor(_scene: unknown, _camera: unknown) {}
  },
}));

vi.mock('three/addons/postprocessing/UnrealBloomPass.js', () => ({
  UnrealBloomPass: class {
    dispose = vi.fn();
    constructor(_resolution: unknown, _strength: number, _radius: number, _threshold: number) {
      h.blooms.push(this);
    }
  },
}));

/** Minimal renderer/sun stand-ins covering everything applyQuality touches. */
function makeDeps() {
  let pixelRatio = -1;
  const renderer = {
    domElement: { clientWidth: 640, clientHeight: 360 },
    shadowMap: { enabled: false },
    setPixelRatio: (r: number) => {
      pixelRatio = r;
    },
    dispose: vi.fn(),
  };
  const shadowMapTex = { disposed: false, dispose: () => (shadowMapTex.disposed = true) };
  const shadowMapSize = {
    x: QUALITY_PRESETS.high.shadowMapSize,
    y: QUALITY_PRESETS.high.shadowMapSize,
    set: (x: number, y: number) => {
      shadowMapSize.x = x;
      shadowMapSize.y = y;
    },
  };
  const sun = { castShadow: false, shadow: { mapSize: shadowMapSize, map: shadowMapTex } };
  return {
    renderer,
    sun,
    shadowMapTex,
    getPixelRatio: () => pixelRatio,
  };
}

/**
 * RenderWorld instance with injected private fields; no WebGL involved.
 * Device pixel ratio comes from the window stub set in beforeEach.
 */
function makeWorld(level: QualityLevel) {
  const deps = makeDeps();
  const rw = Object.create(RenderWorld.prototype) as RenderWorld;
  Reflect.set(rw, 'quality', level);
  Reflect.set(rw, 'renderer', deps.renderer);
  Reflect.set(rw, 'sun', deps.sun);
  Reflect.set(rw, 'scene', {});
  Reflect.set(rw, 'camera', {});
  Reflect.set(rw, 'composer', null);
  Reflect.set(rw, 'bloomPass', null);
  Reflect.set(rw, 'useComposer', false);
  return { rw, deps };
}

/** Inject a "live" bloom rig as if setupBloom had built one. */
function injectLiveBloom(rw: RenderWorld) {
  const composer: FakeComposer = { setSize: vi.fn(), dispose: vi.fn() };
  const bloomPass = { dispose: vi.fn() };
  Reflect.set(rw, 'composer', composer);
  Reflect.set(rw, 'bloomPass', bloomPass);
  Reflect.set(rw, 'useComposer', true);
  return { composer, bloomPass };
}

describe('RenderWorld.applyQuality bloom lifecycle', () => {
  beforeEach(() => {
    h.composers.length = 0;
    h.blooms.length = 0;
    vi.stubGlobal('window', { devicePixelRatio: 1, innerWidth: 1280, innerHeight: 720 });
  });

  it('downgrade disposes composer and bloom pass and clears composer state', () => {
    const { rw, deps } = makeWorld('high');
    const { composer, bloomPass } = injectLiveBloom(rw);

    rw.applyQuality(QUALITY_PRESETS.medium);

    expect(bloomPass.dispose).toHaveBeenCalledTimes(1);
    expect(composer.dispose).toHaveBeenCalledTimes(1);
    expect(Reflect.get(rw, 'composer')).toBeNull();
    expect(Reflect.get(rw, 'bloomPass')).toBeNull();
    expect(Reflect.get(rw, 'useComposer')).toBe(false);
    expect(deps.getPixelRatio()).toBe(1); // min(dpr=1, medium cap 1.5)
    expect(Reflect.get(rw, 'quality')).toBe('medium');
  });

  it('downgrade also resizes the shadow map and drops the old shadow texture', () => {
    const { rw, deps } = makeWorld('high'); // starts with high's 2048 mapSize
    rw.applyQuality(QUALITY_PRESETS.low);

    expect(deps.sun.shadow.mapSize.x).toBe(QUALITY_PRESETS.low.shadowMapSize); // 512
    expect(deps.shadowMapTex.disposed).toBe(true);
    expect(deps.sun.shadow.map).toBeNull();
  });

  it('returning to high rebuilds a composer sized to the canvas CSS box', () => {
    const { rw } = makeWorld('low');

    rw.applyQuality(QUALITY_PRESETS.high);

    expect(h.composers).toHaveLength(1); // exactly one fresh composer
    expect(h.blooms).toHaveLength(1);
    expect(Reflect.get(rw, 'useComposer')).toBe(true);
    const composer = Reflect.get(rw, 'composer') as FakeComposer;
    // Canvas CSS size (640x360), NOT window.innerWidth/Height (1280x720):
    // the F-3 regression was sizing from window after cycling.
    expect(composer.setSize).toHaveBeenCalledWith(640, 360);
  });

  it('high→low→high cycle disposes the old rig and constructs exactly one replacement', () => {
    const { rw } = makeWorld('high');
    const original = injectLiveBloom(rw);

    rw.applyQuality(QUALITY_PRESETS.low);
    rw.applyQuality(QUALITY_PRESETS.high);

    expect(original.composer.dispose).toHaveBeenCalledTimes(1);
    expect(original.bloomPass.dispose).toHaveBeenCalledTimes(1);
    expect(h.composers).toHaveLength(1); // one new composer, not two
    const replacement = Reflect.get(rw, 'composer') as FakeComposer;
    expect(replacement).not.toBe(original.composer);
    expect(Reflect.get(rw, 'bloomPass')).not.toBeNull();
    expect(Reflect.get(rw, 'useComposer')).toBe(true);
  });

  it('re-applying high while already high keeps the existing composer', () => {
    const { rw } = makeWorld('high');
    injectLiveBloom(rw);

    rw.applyQuality(QUALITY_PRESETS.high);

    expect(h.composers).toHaveLength(0); // no duplicate construction
    expect(h.blooms).toHaveLength(0);
  });

  it('pixel ratio tracks each preset cap clamped by devicePixelRatio', () => {
    vi.stubGlobal('window', { devicePixelRatio: 2, innerWidth: 1280, innerHeight: 720 });
    const { rw, deps } = makeWorld('high');

    rw.applyQuality(QUALITY_PRESETS.low);
    expect(deps.getPixelRatio()).toBe(1);

    rw.applyQuality(QUALITY_PRESETS.medium);
    expect(deps.getPixelRatio()).toBe(1.5);

    rw.applyQuality(QUALITY_PRESETS.high);
    expect(deps.getPixelRatio()).toBe(2);
  });
});

/**
 * Full-teardown coverage for RenderWorld.dispose (leak fix).
 *
 * `renderer.dispose()` releases the WebGL context but NOT scene-owned GL
 * resources, so the PMREM env target, the sky program and the shadow map must
 * be released explicitly. Otherwise each Game instance leaks them — observable
 * in dev, where React StrictMode mounts the boot effect twice and the first
 * instance is disposed while the second keeps running.
 */
function makeDisposableWorld() {
  const envRT = { dispose: vi.fn() };
  const skyGeo = { dispose: vi.fn() };
  const skyMat = { dispose: vi.fn() };
  const shadowMapTex = { dispose: vi.fn() };
  const scene = { environment: { isTexture: true } as unknown, clear: vi.fn() };
  const renderer = { dispose: vi.fn() };
  const sun = {
    castShadow: false,
    shadow: { mapSize: { x: 2048, y: 2048, set: vi.fn() }, map: shadowMapTex },
  };

  const rw = Object.create(RenderWorld.prototype) as RenderWorld;
  Reflect.set(rw, 'envRT', envRT);
  Reflect.set(rw, 'sky', { geometry: skyGeo, material: skyMat });
  Reflect.set(rw, 'scene', scene);
  Reflect.set(rw, 'renderer', renderer);
  Reflect.set(rw, 'sun', sun);
  Reflect.set(rw, 'composer', null);
  Reflect.set(rw, 'bloomPass', null);
  Reflect.set(rw, 'useComposer', false);

  return { rw, envRT, skyGeo, skyMat, shadowMapTex, scene, renderer, sun };
}

describe('RenderWorld.dispose full teardown', () => {
  it('releases env target, sky program and shadow map before the renderer', () => {
    const { rw, envRT, skyGeo, skyMat, shadowMapTex, scene, renderer, sun } =
      makeDisposableWorld();

    rw.dispose();

    expect(envRT.dispose).toHaveBeenCalledTimes(1);
    expect(Reflect.get(rw, 'envRT')).toBeNull();
    expect(scene.environment).toBeNull();
    expect(skyGeo.dispose).toHaveBeenCalledTimes(1);
    expect(skyMat.dispose).toHaveBeenCalledTimes(1);
    expect(shadowMapTex.dispose).toHaveBeenCalledTimes(1);
    expect(sun.shadow.map).toBeNull();
    expect(scene.clear).toHaveBeenCalledTimes(1);
    expect(renderer.dispose).toHaveBeenCalledTimes(1);
  });

  it('is idempotent — second call throws nothing and never re-disposes the env target', () => {
    const { rw, envRT, renderer } = makeDisposableWorld();

    rw.dispose();
    expect(() => rw.dispose()).not.toThrow();

    // Nulled after the first pass, so the guarded call is a no-op.
    expect(envRT.dispose).toHaveBeenCalledTimes(1);
    expect(renderer.dispose).toHaveBeenCalledTimes(2);
  });

  it('tears down a live bloom rig in the same call', () => {
    const { rw, renderer } = makeDisposableWorld();
    const composer = { setSize: vi.fn(), dispose: vi.fn() };
    const bloomPass = { dispose: vi.fn() };
    Reflect.set(rw, 'composer', composer);
    Reflect.set(rw, 'bloomPass', bloomPass);
    Reflect.set(rw, 'useComposer', true);

    rw.dispose();

    expect(bloomPass.dispose).toHaveBeenCalledTimes(1);
    expect(composer.dispose).toHaveBeenCalledTimes(1);
    expect(renderer.dispose).toHaveBeenCalledTimes(1);
  });
});
