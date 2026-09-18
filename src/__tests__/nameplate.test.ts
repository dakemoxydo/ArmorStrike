import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, beforeAll, vi } from 'vitest';
import * as THREE from 'three';
import { Nameplate, NAMEPLATE_FADE_END, NAMEPLATE_FADE_START } from '../game/nameplate';
import { NameplateSystem } from '../game/engine/systems/NameplateSystem';

function stubCanvas() {
  const ctx = {
    createRadialGradient: () => ({ addColorStop: () => {} }),
    fillStyle: '' as string | CanvasGradient,
    strokeStyle: '' as string | CanvasGradient,
    lineWidth: 1,
    font: '',
    textAlign: 'center',
    textBaseline: 'middle',
    fillRect: () => {},
    clearRect: () => {},
    beginPath: () => {},
    closePath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    fill: () => {},
    stroke: () => {},
    fillText: () => {},
  };
  const realCreate = typeof document !== 'undefined' ? document.createElement.bind(document) : undefined;
  vi.stubGlobal('document', {
    ...(typeof document !== 'undefined' ? document : {}),
    createElement: (tag: string, options?: ElementCreationOptions) => {
      if (tag === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: () => ctx,
        } as unknown as HTMLCanvasElement;
      }
      return realCreate ? realCreate(tag, options) : {};
    },
  });
}

describe('comic nameplates', () => {
  beforeAll(() => {
    stubCanvas();
  });

  it('draws with Russo One and a cut-corner path, not roundRect', () => {
    const src = readFileSync(resolve(__dirname, '../game/nameplate.ts'), 'utf8');
    expect(src).toContain('Russo One');
    expect(src).toContain('cutRect');
    expect(src).not.toMatch(/roundRect/);
    expect(src).toContain('#0b0e14');
  });

  it('fades to invisible by FADE_END and stays opaque before FADE_START', () => {
    const plate = new Nameplate('А-СНАЙПЕР-1', 0x3b9eff);
    const mat = plate.sprite.material as THREE.SpriteMaterial;

    plate.setRange(NAMEPLATE_FADE_START - 1);
    expect(mat.opacity).toBe(1);
    expect(plate.sprite.visible).toBe(true);

    plate.sprite.visible = true;
    plate.setRange(NAMEPLATE_FADE_END);
    expect(mat.opacity).toBe(0);
    expect(plate.sprite.visible).toBe(false);
  });

  it('NameplateSystem scales fade from the local observer, not the plate origin', () => {
    const plate = new Nameplate('Б-1', 0xff4d3d);
    const nameplates = new Map([[2, { plate, color: 0xff4d3d }]]);
    NameplateSystem.updateTanks(
      [{
        id: 2,
        alive: true,
        health: 80,
        maxHealth: 100,
        position: { x: 80, z: 0 },
      }],
      nameplates,
      { x: 0, z: 0 },
    );
    expect((plate.sprite.material as THREE.SpriteMaterial).opacity).toBeLessThan(1);
    expect(plate.sprite.position.x).toBe(80);
  });
});
