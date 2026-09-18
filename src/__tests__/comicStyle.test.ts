import { describe, it, expect, beforeAll, vi } from 'vitest';
import * as THREE from 'three';
import { applyCelShading } from '../game/shaders/celShading';
import { attachComicInkOutline, COMIC_INK_KEY } from '../game/tank/comicInkOutline';
import { camoTexture, trackTexture } from '../game/textures/tank';

function stubCanvas() {
  const ctx = {
    createRadialGradient: () => ({ addColorStop: () => {} }),
    createLinearGradient: () => ({ addColorStop: () => {} }),
    fillStyle: '' as string | CanvasGradient,
    strokeStyle: '' as string | CanvasGradient,
    lineWidth: 1,
    lineCap: 'round',
    fillRect: () => {},
    clearRect: () => {},
    beginPath: () => {},
    closePath: () => {},
    arc: () => {},
    fill: () => {},
    moveTo: () => {},
    lineTo: () => {},
    stroke: () => {},
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

describe('Comic / Cel-Shaded Art Direction', () => {
  beforeAll(() => {
    stubCanvas();
  });
  describe('applyCelShading', () => {
    it('preserves MeshStandardMaterial prototype and properties', () => {
      const mat = new THREE.MeshStandardMaterial({
        color: 0x3b82f6,
        roughness: 0.4,
        metalness: 0.6,
      });
      const cel = applyCelShading(mat);
      expect(cel).toBe(mat);
      expect(cel).toBeInstanceOf(THREE.MeshStandardMaterial);
      expect(cel.color.getHex()).toBe(0x3b82f6);
      expect(cel.roughness).toBe(0.4);
      expect(cel.metalness).toBe(0.6);
      expect(cel.customProgramCacheKey()).toBe('cel-shaded-std-v1');
    });

    it('injects cel-shading quantization into onBeforeCompile fragment shader', () => {
      const mat = applyCelShading(new THREE.MeshStandardMaterial());
      const shader = {
        uniforms: {},
        vertexShader: '#include <common>\nvoid main() {}',
        fragmentShader: '#include <common>\n#include <lights_physical_fragment>\nvoid main() {}',
      };
      mat.onBeforeCompile(shader as unknown as Parameters<THREE.MeshStandardMaterial['onBeforeCompile']>[0], null as unknown as THREE.WebGLRenderer);
      expect(shader.fragmentShader).toContain('_cel_stepped');
      expect(shader.fragmentShader).toContain('_cel_specCut');
    });
  });

  describe('attachComicInkOutline', () => {
    it('attaches back-side ink meshes to standard solid parts', () => {
      const group = new THREE.Group();
      const bodyMesh = new THREE.Mesh(
        new THREE.BoxGeometry(2, 1, 3),
        new THREE.MeshStandardMaterial({ color: 0x444444 }),
      );
      bodyMesh.name = 'hullSolid';
      group.add(bodyMesh);

      const lampMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.1),
        new THREE.MeshBasicMaterial({ color: 0x00ffff }),
      );
      lampMesh.name = 'lamp';
      group.add(lampMesh);

      const shells = attachComicInkOutline(group);
      expect(shells).toHaveLength(1);
      expect(group.userData[COMIC_INK_KEY]).toBe(shells);

      const inkMesh = shells[0];
      expect(inkMesh.name).toBe('comicInkMesh');
      expect(inkMesh.castShadow).toBe(false);
      expect(inkMesh.receiveShadow).toBe(false);

      const inkMat = inkMesh.material as THREE.MeshBasicMaterial;
      expect(inkMat.side).toBe(THREE.BackSide);
      expect(inkMat.name).toBe('comicInk');
    });
  });

  describe('comic textures', () => {
    it('camoTexture generates and caches a valid CanvasTexture', () => {
      const tex1 = camoTexture('#2563eb', '#1e3a8a', '#60a5fa');
      const tex2 = camoTexture('#2563eb', '#1e3a8a', '#60a5fa');
      expect(tex1).toBe(tex2);
      expect(tex1).toBeInstanceOf(THREE.CanvasTexture);
    });

    it('trackTexture returns a valid cached CanvasTexture', () => {
      const track = trackTexture();
      expect(track).toBeInstanceOf(THREE.CanvasTexture);
    });
  });

  describe('arena cel shading & comic UI integration', () => {
    it('applies cel-shading customProgramCacheKey to arena meshes', () => {
      const mat = applyCelShading(new THREE.MeshStandardMaterial({ color: 0x90a8c0 }));
      expect(mat.customProgramCacheKey()).toBe('cel-shaded-std-v1');
    });

    it('defines comic ink border and 3D offset shadow in variables and buttons', async () => {
      const { readFileSync } = await import('node:fs');
      const { resolve } = await import('node:path');
      const vars = readFileSync(resolve(__dirname, '../styles/variables.css'), 'utf8');
      const buttons = readFileSync(resolve(__dirname, '../styles/buttons.css'), 'utf8');
      const hud = readFileSync(resolve(__dirname, '../styles/hud.css'), 'utf8');

      expect(vars).toMatch(/--panel-line:\s*#0b0e14/);
      expect(vars).toMatch(/--panel-shadow:\s*0 5px 0 #0b0e14/);
      expect(buttons).toMatch(/box-shadow:[\s\S]*?inset 0 0 0 2px #0b0e14/);
      expect(hud).toMatch(/\.frag-plus[\s\S]*?text-shadow:[\s\S]*?-3px -3px 0 #0b0e14/);
      expect(hud).toMatch(/\.streak-label[\s\S]*?text-shadow:[\s\S]*?-3px -3px 0 #0b0e14/);
    });
  });
});
