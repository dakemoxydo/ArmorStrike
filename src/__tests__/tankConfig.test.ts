/**
 * Contract for the dormant GLB seam.
 *
 * `MODELS_ENABLED` is false and the GLB pipeline is tree-shaken out of the
 * production bundle, so nothing here exercises a model load. What this file
 * pins is the *seam*: the base-aware URL builder that subfolder deploys depend
 * on, and the rule that a map config must not name a model while the system is
 * off (a silently ignored `{ type: 'model' }` is the failure mode we prevent).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  HULL_CONFIG,
  TURRET_CONFIG,
  MODEL_HULL_TARGET_LENGTH,
  MODELS_ENABLED,
  assetUrl,
} from '../game/tank/TankConfig';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('assetUrl (base-aware model paths)', () => {
  it('joins a root base without doubling slashes', () => {
    vi.stubEnv('BASE_URL', '/');
    expect(assetUrl('models/tanks/x.glb')).toBe('/models/tanks/x.glb');
    expect(assetUrl('/models/tanks/x.glb')).toBe('/models/tanks/x.glb');
  });

  it('prefixes a subfolder base — the /game/ deploy case', () => {
    vi.stubEnv('BASE_URL', '/game/');
    expect(assetUrl('models/tanks/x.glb')).toBe('/game/models/tanks/x.glb');
    expect(assetUrl('/models/tanks/x.glb')).toBe('/game/models/tanks/x.glb');
  });

  it('never emits a protocol-relative or absolute-path leak', () => {
    vi.stubEnv('BASE_URL', '/game/');
    const url = assetUrl('models/tanks/x.glb');
    expect(url.startsWith('/game/')).toBe(true);
    expect(url).not.toContain('//models');
  });
});

describe('GLB seam stays consistent with the flag', () => {
  it('names no model while the system is disabled', () => {
    // A 'model' entry under MODELS_ENABLED=false would be silently ignored —
    // the tank would render procedurally with no signal that the config is inert.
    if (MODELS_ENABLED) return;
    for (const [id, cfg] of Object.entries({ ...HULL_CONFIG, ...TURRET_CONFIG })) {
      expect(cfg.type, `${id} must be procedural while MODELS_ENABLED=false`).toBe('code');
    }
  });

  it('requires a path whenever a model type is configured', () => {
    for (const [id, cfg] of Object.entries({ ...HULL_CONFIG, ...TURRET_CONFIG })) {
      if (cfg.type === 'model') {
        expect(cfg.path, `${id} is type 'model' but has no path`).toBeTruthy();
      }
    }
  });

  it('keeps the hull normalization target a sane positive length', () => {
    expect(MODEL_HULL_TARGET_LENGTH).toBeGreaterThan(0);
    expect(Number.isFinite(MODEL_HULL_TARGET_LENGTH)).toBe(true);
  });
});
