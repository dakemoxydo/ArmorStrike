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

    it('is idempotent when applied multiple times and does not duplicate GLSL declarations', () => {
      const mat = new THREE.MeshStandardMaterial();
      applyCelShading(mat);
      applyCelShading(mat);
      applyCelShading(mat);

      const shader = {
        uniforms: {},
        vertexShader: THREE.ShaderLib.standard.vertexShader,
        fragmentShader: THREE.ShaderLib.standard.fragmentShader,
      };
      mat.onBeforeCompile(shader as unknown as Parameters<THREE.MeshStandardMaterial['onBeforeCompile']>[0], null as unknown as THREE.WebGLRenderer);
      // Run a second time on the same shader object to test runtime protection
      mat.onBeforeCompile(shader as unknown as Parameters<THREE.MeshStandardMaterial['onBeforeCompile']>[0], null as unknown as THREE.WebGLRenderer);

      const occurrences = (shader.fragmentShader.match(/Comic Cel-shading diffuse quantization/g) || []).length;
      expect(occurrences).toBe(1);
    });

    it('handles cloned materials correctly without duplicate declarations', () => {
      const parent = applyCelShading(new THREE.MeshStandardMaterial());
      const clone = applyCelShading(parent.clone());

      const shader = {
        uniforms: {},
        vertexShader: THREE.ShaderLib.standard.vertexShader,
        fragmentShader: THREE.ShaderLib.standard.fragmentShader,
      };
      clone.onBeforeCompile(shader as unknown as Parameters<THREE.MeshStandardMaterial['onBeforeCompile']>[0], null as unknown as THREE.WebGLRenderer);

      const occurrences = (shader.fragmentShader.match(/Comic Cel-shading diffuse quantization/g) || []).length;
      expect(occurrences).toBe(1);
      expect(shader.fragmentShader).toContain('_cel_stepped');
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

    it('player identity is saturated mint cyan with white accents', async () => {
      const { readFileSync } = await import('node:fs');
      const { resolve } = await import('node:path');
      const constants = readFileSync(resolve(__dirname, '../core/constants.ts'), 'utf8');
      const catalog = readFileSync(resolve(__dirname, '../core/TankCatalog.ts'), 'utf8');
      expect(constants).toMatch(/player:\s*0x2ee6c0/);
      expect(constants).toMatch(/playerAccent:\s*0xffffff/);
      expect(catalog).toContain('#2fae8f');
      expect(catalog).toContain('#ffffff');
    });

    it('ground textures have no Perlin noise() and RenderWorld has no IBL/ACES/bloom', async () => {
      const { readFileSync } = await import('node:fs');
      const { resolve } = await import('node:path');
      const ground = readFileSync(resolve(__dirname, '../game/textures/ground.ts'), 'utf8');
      const world = readFileSync(resolve(__dirname, '../game/RenderWorld.ts'), 'utf8');
      expect(ground).not.toMatch(/\bnoise\s*\(/);
      expect(world).toContain('LinearToneMapping');
      expect(world).not.toMatch(/ACESFilmicToneMapping/);
      expect(world).not.toMatch(/from ['"]three\/addons\/environments\/RoomEnvironment/);
      expect(world).not.toMatch(/from ['"]three\/addons\/postprocessing\/UnrealBloomPass/);
      expect(world).toContain('this.scene.environment = null');
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
